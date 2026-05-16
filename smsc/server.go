package smsc

import (
	"bufio"
	"fmt"
	"log"
	"math/rand"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

// EventEmitter abstracts the Wails app event bus so the server stays framework-agnostic.
type EventEmitter func(name string, data any)

// Server is the SMSC TCP server. Create it with NewServer, then call Start/Stop.
type Server struct {
	mu       sync.RWMutex
	cfg      Config
	emit     EventEmitter
	listener net.Listener

	sessions   map[int]*sessionHandler
	sessionSeq int

	// Counters (accessed atomically)
	totalReceived int64
	totalSent     int64
	refCounter    int64

	// Per-second rate tracking
	recvLastSec int64
	sentLastSec int64
	recvPerSec  float64
	sentPerSec  float64

	// Message log (capped ring)
	msgMu    sync.Mutex
	messages []MessageInfo
	msgIDSeq int64

	running   bool
	stopCh    chan struct{}
	stopOnce  sync.Once
	workerWg  sync.WaitGroup
}

// NewServer creates a ready-to-use Server with the given config and event emitter.
func NewServer(cfg Config, emit EventEmitter) *Server {
	s := &Server{
		cfg:        cfg,
		emit:       emit,
		sessions:   make(map[int]*sessionHandler),
		refCounter: cfg.LastReference,
		stopCh:     make(chan struct{}),
	}
	return s
}

// UpdateConfig hot-swaps the configuration without stopping the server.
func (s *Server) UpdateConfig(cfg Config) {
	s.mu.Lock()
	s.cfg = cfg
	s.mu.Unlock()
}

// GetConfig returns a copy of the current configuration.
func (s *Server) GetConfig() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cfg
}

// signalStop closes stopCh exactly once, safe to call concurrently.
func (s *Server) signalStop() {
	s.mu.RLock()
	ch := s.stopCh
	s.mu.RUnlock()
	s.stopOnce.Do(func() { close(ch) })
}

// Bind opens the TCP listener synchronously. Returns an error immediately if
// the port is already in use. Must be called before Start.
func (s *Server) Bind() error {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return fmt.Errorf("server already running")
	}
	cfg := s.cfg
	s.running = true
	s.stopCh = make(chan struct{})
	s.stopOnce = sync.Once{}
	s.mu.Unlock()

	bindIP := cfg.BindIP
	if bindIP == "" {
		bindIP = "0.0.0.0"
	}
	addr := net.JoinHostPort(bindIP, fmt.Sprintf("%d", cfg.Port))
	ln, err := newListener(addr)
	if err != nil {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
		return fmt.Errorf("port %d: %w", cfg.Port, err)
	}

	s.mu.Lock()
	s.listener = ln
	s.mu.Unlock()
	return nil
}

// Start runs the accept loop. Bind() must be called first. Blocks until stopped.
func (s *Server) Start() error {
	s.mu.Lock()
	ln := s.listener
	cfg := s.cfg
	s.mu.Unlock()

	if ln == nil {
		return fmt.Errorf("server not bound — call Bind() first")
	}

	s.log("INFO", "server", fmt.Sprintf("SMSC listening on port %d", cfg.Port))
	s.emit("smpp:server-started", map[string]any{"port": cfg.Port})

	// Background workers
	s.workerWg.Add(2)
	go s.statsLoop()
	go s.autoMessageLoop()

	// Accept loop
	for {
		conn, err := ln.Accept()
		if err != nil {
			select {
			case <-s.stopCh:
				// Normal shutdown
			default:
				s.log("ERROR", "server", fmt.Sprintf("accept error: %v", err))
			}
			break
		}
		go s.handleConn(conn)
	}

	// Signal workers to stop (no-op if Stop() already called it)
	s.signalStop()
	s.workerWg.Wait()

	s.mu.Lock()
	s.running = false
	s.mu.Unlock()

	// Emit a final stats tick with serverRunning=false so the UI updates immediately
	s.emit("smpp:stats-tick", s.GetStats())
	s.emit("smpp:server-stopped", nil)
	s.log("INFO", "server", "SMSC stopped")
	return nil
}

// Stop shuts down the listener and all active sessions gracefully.
func (s *Server) Stop() {
	s.mu.Lock()
	ln := s.listener
	s.mu.Unlock()

	// Signal workers BEFORE closing the listener so that the Accept() error
	// is recognised as a normal shutdown (not logged as an ERROR).
	s.signalStop()

	if ln != nil {
		ln.Close()
	}

	// Drop all sessions
	s.mu.RLock()
	ids := make([]int, 0, len(s.sessions))
	for id := range s.sessions {
		ids = append(ids, id)
	}
	s.mu.RUnlock()

	for _, id := range ids {
		s.dropSession(id)
	}
}

// IsRunning returns true when the server is accepting connections.
func (s *Server) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// GetStats returns a current statistics snapshot.
func (s *Server) GetStats() Stats {
	s.mu.RLock()
	cfg := s.cfg
	running := s.running
	sessions := make([]SessionInfo, 0, len(s.sessions))
	for _, sh := range s.sessions {
		sessions = append(sessions, sh.info())
	}
	s.mu.RUnlock()

	return Stats{
		ServerRunning:     running,
		SessionCount:      len(sessions),
		TotalReceived:     atomic.LoadInt64(&s.totalReceived),
		TotalSent:         atomic.LoadInt64(&s.totalSent),
		ReceivedPerSecond: s.recvPerSec,
		SentPerSecond:     s.sentPerSec,
		LastReference:     atomic.LoadInt64(&s.refCounter),
		Port:              cfg.Port,
		Sessions:          sessions,
	}
}

// GetSessions returns a snapshot of all active sessions.
func (s *Server) GetSessions() []SessionInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]SessionInfo, 0, len(s.sessions))
	for _, sh := range s.sessions {
		out = append(out, sh.info())
	}
	return out
}

// DropSession disconnects the session with the given ID.
func (s *Server) DropSession(id int) error {
	s.mu.RLock()
	_, ok := s.sessions[id]
	s.mu.RUnlock()
	if !ok {
		return fmt.Errorf("session %d not found", id)
	}
	s.dropSession(id)
	return nil
}

// SendMessageToSession queues a deliver_sm to be sent to the given session.
func (s *Server) SendMessageToSession(req SendMessageRequest) error {
	s.mu.RLock()
	sh, ok := s.sessions[req.SessionID]
	s.mu.RUnlock()
	if !ok {
		return fmt.Errorf("session %d not found", req.SessionID)
	}
	return sh.sendDeliver(req)
}

// GetMessages returns a slice of recent messages (thread-safe).
func (s *Server) GetMessages(offset, limit int) []MessageInfo {
	s.msgMu.Lock()
	defer s.msgMu.Unlock()
	if offset >= len(s.messages) {
		return nil
	}
	end := offset + limit
	if end > len(s.messages) {
		end = len(s.messages)
	}
	out := make([]MessageInfo, end-offset)
	copy(out, s.messages[offset:end])
	return out
}

// ClearMessages empties the in-memory message log.
func (s *Server) ClearMessages() {
	s.msgMu.Lock()
	s.messages = s.messages[:0]
	s.msgMu.Unlock()
}

// ---- internal ---------------------------------------------------------------

func (s *Server) handleConn(conn net.Conn) {
	s.mu.Lock()
	s.sessionSeq++
	id := s.sessionSeq
	sh := newSessionHandler(id, conn, s)
	s.sessions[id] = sh
	s.mu.Unlock()

	remoteAddr := conn.RemoteAddr().(*net.TCPAddr)
	s.log("INFO", "session", fmt.Sprintf("[%d] connection from %s", id, remoteAddr))
	s.emit("smpp:session-connected", sh.info())

	sh.run() // blocks until session ends

	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()

	s.emit("smpp:session-disconnected", map[string]any{
		"id":       id,
		"systemId": sh.systemID,
	})
	s.log("INFO", "session", fmt.Sprintf("[%d] disconnected (%s)", id, sh.systemID))
}

func (s *Server) dropSession(id int) {
	s.mu.RLock()
	sh, ok := s.sessions[id]
	s.mu.RUnlock()
	if ok {
		sh.close()
	}
}

// nextRef generates the next unique message reference number.
func (s *Server) nextRef() int64 {
	return atomic.AddInt64(&s.refCounter, 1)
}

// nextMsgID generates the next message ID string.
func (s *Server) nextMsgID() (int64, string) {
	id := atomic.AddInt64(&s.msgIDSeq, 1)
	ref := s.nextRef()
	return id, fmt.Sprintf("%08X", ref)
}

// pickSubmitStatus selects an ESME status code based on configured error rates.
// Returns EsmeROk when no error rates are configured or luck is on their side.
func (s *Server) pickSubmitStatus() uint32 {
	s.mu.RLock()
	rates := s.cfg.MessageErrorRates
	s.mu.RUnlock()

	if len(rates) == 0 {
		return EsmeROk
	}
	total := 0
	for _, r := range rates {
		total += r.Occurrence
	}
	if total <= 0 {
		return EsmeROk
	}
	roll := rand.Intn(total)
	acc := 0
	for _, r := range rates {
		acc += r.Occurrence
		if roll < acc {
			return r.StatusCode
		}
	}
	return EsmeROk
}

// pickDLRStatus selects a delivery status text based on configured delivery error rates.
func (s *Server) pickDLRStatus() string {
	s.mu.RLock()
	rates := s.cfg.DeliveryErrorRates
	s.mu.RUnlock()

	if len(rates) == 0 {
		return DlrStatDelivered
	}
	total := 0
	for _, r := range rates {
		total += r.Occurrence
	}
	if total <= 0 {
		return DlrStatDelivered
	}
	roll := rand.Intn(total)
	acc := 0
	for _, r := range rates {
		acc += r.Occurrence
		if roll < acc {
			return r.StatusText
		}
	}
	return DlrStatDelivered
}

// recordMessage appends a message to the in-memory log.
func (s *Server) recordMessage(m MessageInfo) {
	s.msgMu.Lock()
	s.messages = append(s.messages, m)
	s.msgMu.Unlock()
}

// log emits a log entry both locally (stdlib) and to the frontend.
func (s *Server) log(level, source, msg string) {
	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     level,
		Source:    source,
		Message:   msg,
	}
	log.Printf("[%s] %s: %s", level, source, msg)
	if s.emit != nil {
		s.emit("smpp:log", entry)
	}
}

// ---- statsLoop --------------------------------------------------------------

func (s *Server) statsLoop() {
	defer s.workerWg.Done()
	ticker := time.NewTicker(time.Duration(StatsTickInterval) * time.Millisecond)
	defer ticker.Stop()

	var prevRecv, prevSent int64
	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			recv := atomic.LoadInt64(&s.totalReceived)
			sent := atomic.LoadInt64(&s.totalSent)
			// rate = delta per tick interval → normalise to per-second
			factor := float64(time.Second) / float64(StatsTickInterval*time.Millisecond)
			s.recvPerSec = float64(recv-prevRecv) * factor
			s.sentPerSec = float64(sent-prevSent) * factor
			prevRecv, prevSent = recv, sent
			s.emit("smpp:stats-tick", s.GetStats())
		}
	}
}

// ---- autoMessageLoop --------------------------------------------------------

func (s *Server) autoMessageLoop() {
	defer s.workerWg.Done()
	ticker := time.NewTicker(time.Duration(WorkerTickInterval) * time.Millisecond)
	defer ticker.Stop()

	var (
		msgAccumulator float64
		lastTick       = time.Now()
		autoIdx        int
	)

	for {
		select {
		case <-s.stopCh:
			return
		case now := <-ticker.C:
			elapsed := now.Sub(lastTick).Minutes()
			lastTick = now

			s.mu.RLock()
			rate := s.cfg.GeneratePerMinute
			msgs := s.cfg.AutoMessages
			rnd := s.cfg.RandomOrder
			s.mu.RUnlock()

			if rate <= 0 || len(msgs) == 0 {
				msgAccumulator = 0
				continue
			}

			msgAccumulator += float64(rate) * elapsed
			toSend := int(msgAccumulator)
			if toSend == 0 {
				continue
			}
			msgAccumulator -= float64(toSend)

			// Collect RX / TRX sessions
			s.mu.RLock()
			var rxSessions []*sessionHandler
			for _, sh := range s.sessions {
				if sh.bindType == CmdBindReceiver || sh.bindType == CmdBindTransceiver {
					rxSessions = append(rxSessions, sh)
				}
			}
			s.mu.RUnlock()

			if len(rxSessions) == 0 {
				continue
			}

			for i := 0; i < toSend; i++ {
				var tmpl AutoMessage
				if rnd {
					tmpl = msgs[rand.Intn(len(msgs))]
				} else {
					tmpl = msgs[autoIdx%len(msgs)]
					autoIdx++
				}
				// Round-robin sessions
				sh := rxSessions[i%len(rxSessions)]
				_ = sh.sendAutoMessage(tmpl)
			}
		}
	}
}

// ---- PDU log helper ---------------------------------------------------------

func (s *Server) logPDU(direction, sessionID string, cmdID uint32, body []byte) {
	s.mu.RLock()
	enabled := s.cfg.PDULogEnabled
	s.mu.RUnlock()
	if !enabled {
		return
	}
	s.log("DEBUG", "pdu", fmt.Sprintf("[%s] %s cmd=0x%08X len=%d", direction, sessionID, cmdID, len(body)))
}

// ---- bufio helper -----------------------------------------------------------

// newBufReader wraps a connection in a buffered reader for efficient PDU reads.
func newBufReader(conn net.Conn) *bufio.Reader {
	return bufio.NewReaderSize(conn, 65536)
}
