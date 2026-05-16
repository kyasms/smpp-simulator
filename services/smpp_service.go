package services

import (
	"context"
	"fmt"
	"kyasmpp/smsc"
	"net"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// SmppService manages one SMPP server per operator.
type SmppService struct {
	mu      sync.Mutex
	servers map[string]*smsc.Server
	cfgs    map[string]smsc.Config
	app     *application.App
}

func NewSmppService() *SmppService {
	return &SmppService{
		servers: make(map[string]*smsc.Server),
		cfgs:    make(map[string]smsc.Config),
	}
}

// configFor returns the operator's config (or DefaultConfig if absent). Caller must hold s.mu.
func (s *SmppService) configFor(operatorId string) smsc.Config {
	if cfg, ok := s.cfgs[operatorId]; ok {
		return cfg
	}
	return smsc.DefaultConfig()
}

func (s *SmppService) SetApp(app *application.App) {
	s.mu.Lock()
	s.app = app
	s.mu.Unlock()
}

func (s *SmppService) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	return nil
}

func (s *SmppService) ServiceShutdown() error {
	s.mu.Lock()
	srvs := make([]*smsc.Server, 0, len(s.servers))
	for _, srv := range s.servers {
		srvs = append(srvs, srv)
	}
	s.mu.Unlock()
	for _, srv := range srvs {
		if srv.IsRunning() {
			srv.Stop()
		}
	}
	return nil
}

// ---- API publique -----------------------------------------------------------

func (s *SmppService) StartServer(operatorId string, port int, ip string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if srv, ok := s.servers[operatorId]; ok && srv.IsRunning() {
		return fmt.Errorf("server already running")
	}

	cfg := s.configFor(operatorId)
	if port > 0 {
		cfg.Port = port
	}
	if cfg.Port <= 0 {
		cfg.Port = 2775
	}
	if ip != "" {
		cfg.BindIP = ip
	}
	if cfg.BindIP == "" {
		cfg.BindIP = "0.0.0.0"
	}
	s.cfgs[operatorId] = cfg

	emit := s.makeEmitterFor(operatorId)
	srv := smsc.NewServer(cfg, emit)

	if err := srv.Bind(); err != nil {
		return err
	}

	s.servers[operatorId] = srv
	go func() {
		if err := srv.Start(); err != nil {
			emit("smpp:error", map[string]any{"message": err.Error()})
		}
	}()
	return nil
}

func (s *SmppService) StopServer(operatorId string) error {
	s.mu.Lock()
	srv := s.servers[operatorId]
	s.mu.Unlock()
	if srv == nil || !srv.IsRunning() {
		return nil
	}
	srv.Stop()
	return nil
}

func (s *SmppService) IsRunning(operatorId string) bool {
	s.mu.Lock()
	srv := s.servers[operatorId]
	s.mu.Unlock()
	return srv != nil && srv.IsRunning()
}

func (s *SmppService) GetSessions(operatorId string) []smsc.SessionInfo {
	s.mu.Lock()
	srv := s.servers[operatorId]
	s.mu.Unlock()
	if srv == nil {
		return nil
	}
	return srv.GetSessions()
}

func (s *SmppService) DropSession(operatorId string, id int) error {
	s.mu.Lock()
	srv := s.servers[operatorId]
	s.mu.Unlock()
	if srv == nil {
		return fmt.Errorf("server not running")
	}
	return srv.DropSession(id)
}

func (s *SmppService) SendMessage(req smsc.SendMessageRequest) error {
	s.mu.Lock()
	srv := s.servers[req.OperatorId]
	s.mu.Unlock()
	if srv == nil {
		return fmt.Errorf("server not running")
	}
	return srv.SendMessageToSession(req)
}

// UpdateOperatorConfig replaces the in-memory config for an operator and hot-applies
// it to the running server (if any).
func (s *SmppService) UpdateOperatorConfig(operatorId string, cfg smsc.Config) {
	s.mu.Lock()
	s.cfgs[operatorId] = cfg
	srv := s.servers[operatorId]
	s.mu.Unlock()
	if srv != nil {
		srv.UpdateConfig(cfg)
	}
}

func (s *SmppService) GetOperatorConfig(operatorId string) smsc.Config {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.configFor(operatorId)
}

func (s *SmppService) GetMessages(operatorId string, offset, limit int) []smsc.MessageInfo {
	s.mu.Lock()
	srv := s.servers[operatorId]
	s.mu.Unlock()
	if srv == nil {
		return nil
	}
	if limit <= 0 {
		limit = 100
	}
	return srv.GetMessages(offset, limit)
}

func (s *SmppService) ClearMessages(operatorId string) {
	s.mu.Lock()
	srv := s.servers[operatorId]
	s.mu.Unlock()
	if srv != nil {
		srv.ClearMessages()
	}
}

func (s *SmppService) GetStats(operatorId string) smsc.Stats {
	s.mu.Lock()
	srv := s.servers[operatorId]
	cfg := s.configFor(operatorId)
	s.mu.Unlock()
	if srv != nil {
		return srv.GetStats()
	}
	return smsc.Stats{Port: cfg.Port}
}

func (s *SmppService) GetLocalIPs() []string {
	result := []string{"0.0.0.0", "127.0.0.1"}
	ifaces, err := net.Interfaces()
	if err != nil {
		return result
	}
	seen := map[string]bool{"0.0.0.0": true, "127.0.0.1": true}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() || ip.To4() == nil {
				continue
			}
			ipStr := ip.String()
			if !seen[ipStr] {
				seen[ipStr] = true
				result = append(result, ipStr)
			}
		}
	}
	return result
}

// ---- interne ----------------------------------------------------------------

func (s *SmppService) makeEmitterFor(opID string) smsc.EventEmitter {
	return func(name string, data any) {
		s.mu.Lock()
		app := s.app
		s.mu.Unlock()
		if app != nil {
			app.Event.Emit(name, map[string]any{
				"operatorId": opID,
				"data":       data,
			})
		}
	}
}
