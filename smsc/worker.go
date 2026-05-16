package smsc

// worker.go holds the file-based Logger used by the server and sessions.
// The auto-message loop and stats ticker live in server.go because they need
// direct access to the Server's session registry and counters.

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Logger writes structured log lines to optional files while keeping the
// goroutine-safe contract required by the multi-session server.
type Logger struct {
	mu sync.Mutex

	serverFile  *os.File
	sessionDir  string
	sessionFiles map[string]*os.File // keyed by sessionID label
	pduEnabled  bool
}

// NewLogger creates a Logger based on the current Config.
// Call Close when done to flush and close all open file handles.
func NewLogger(cfg Config) *Logger {
	l := &Logger{
		sessionFiles: make(map[string]*os.File),
		pduEnabled:   cfg.PDULogEnabled,
	}

	if cfg.ServerLogEnabled && cfg.ServerLogPath != "" {
		f, err := os.OpenFile(cfg.ServerLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			l.serverFile = f
		}
	}

	if cfg.SessionLogEnabled && cfg.SessionLogPath != "" {
		l.sessionDir = cfg.SessionLogPath
		os.MkdirAll(cfg.SessionLogPath, 0755)
	}

	return l
}

// Server writes a line to the server-level log file (if configured).
func (l *Logger) Server(level, msg string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.serverFile == nil {
		return
	}
	line := fmt.Sprintf("%s [%s] %s\n", time.Now().Format(time.RFC3339), level, msg)
	l.serverFile.WriteString(line)
}

// Session writes a line to the per-session log file (if configured).
// sessionLabel is typically "session-<id>".
func (l *Logger) Session(sessionLabel, systemID, msg string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.sessionDir == "" {
		return
	}
	f, ok := l.sessionFiles[sessionLabel]
	if !ok {
		name := fmt.Sprintf("%s_%s_%s.log",
			sessionLabel, systemID, time.Now().Format("20060102_150405"))
		path := filepath.Join(l.sessionDir, name)
		var err error
		f, err = os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return
		}
		l.sessionFiles[sessionLabel] = f
	}
	line := fmt.Sprintf("%s %s\n", time.Now().Format(time.RFC3339), msg)
	f.WriteString(line)
}

// PDU writes a PDU trace line (only when PDU logging is enabled in config).
func (l *Logger) PDU(sessionLabel, direction string, cmdID uint32, bodyLen int) {
	l.mu.Lock()
	pduEnabled := l.pduEnabled
	l.mu.Unlock()

	if !pduEnabled {
		return
	}
	l.Session(sessionLabel, "", fmt.Sprintf("PDU %s cmd=0x%08X len=%d", direction, cmdID, bodyLen))
}

// UpdateConfig reloads PDU-log enable flag without reopening files.
func (l *Logger) UpdateConfig(cfg Config) {
	l.mu.Lock()
	l.pduEnabled = cfg.PDULogEnabled
	l.mu.Unlock()
}

// CloseSession flushes and closes the log file for a finished session.
func (l *Logger) CloseSession(sessionLabel string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if f, ok := l.sessionFiles[sessionLabel]; ok {
		f.Close()
		delete(l.sessionFiles, sessionLabel)
	}
}

// Close flushes all open file handles. Call on server shutdown.
func (l *Logger) Close() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.serverFile != nil {
		l.serverFile.Close()
		l.serverFile = nil
	}
	for _, f := range l.sessionFiles {
		f.Close()
	}
	l.sessionFiles = make(map[string]*os.File)
}

// ---- DLRQueue ---------------------------------------------------------------

// DLREntry represents a pending delivery report to send after a delay.
type DLREntry struct {
	SessionHandler interface{ sendDLR(*SubmitSM, string, string) }
	SM             *SubmitSM
	MsgRef         string
	Body           string
	Delay          time.Duration
	ScheduledAt    time.Time
}

// DLRQueue is an optional queue for delayed delivery reports.
// By default the server sends DLRs inline (via goroutines); this queue is
// provided for callers that want centralised, rate-limited DLR dispatch.
type DLRQueue struct {
	mu      sync.Mutex
	entries []DLREntry
	stopCh  chan struct{}
	wg      sync.WaitGroup
}

// NewDLRQueue creates and starts a DLRQueue processor.
func NewDLRQueue() *DLRQueue {
	q := &DLRQueue{stopCh: make(chan struct{})}
	q.wg.Add(1)
	go q.run()
	return q
}

// Enqueue schedules a DLR for delivery after delay.
func (q *DLRQueue) Enqueue(e DLREntry) {
	q.mu.Lock()
	q.entries = append(q.entries, e)
	q.mu.Unlock()
}

func (q *DLRQueue) run() {
	defer q.wg.Done()
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-q.stopCh:
			return
		case now := <-ticker.C:
			q.mu.Lock()
			remaining := q.entries[:0]
			for _, e := range q.entries {
				if now.Sub(e.ScheduledAt) >= e.Delay {
					go e.SessionHandler.sendDLR(e.SM, e.MsgRef, e.Body)
				} else {
					remaining = append(remaining, e)
				}
			}
			q.entries = remaining
			q.mu.Unlock()
		}
	}
}

// Stop shuts down the DLRQueue processor.
func (q *DLRQueue) Stop() {
	close(q.stopCh)
	q.wg.Wait()
}
