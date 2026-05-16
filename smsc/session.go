package smsc

import (
	"fmt"
	"math/rand"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

// sessionHandler manages the lifecycle of one SMPP client connection.
type sessionHandler struct {
	id   int
	conn net.Conn
	srv  *Server

	// Set after successful bind
	systemID   string
	systemType string
	bindType   uint32 // CmdBindTransmitter | CmdBindReceiver | CmdBindTransceiver
	version    byte
	addrRange  string
	addrTON    byte
	addrNPI    byte
	state      string // BINDING, BOUND, CLOSED
	boundAt    time.Time

	remoteIP   string
	remotePort int

	// Per-session counters
	msgIn      int64
	msgOut     int64

	// Per-session sequence number generator
	seqCounter uint32

	// Outbound PDU queue (deliver_sm / DLR)
	outCh chan []byte

	closeOnce sync.Once
	done      chan struct{}

	writeMu sync.Mutex // serialises conn.Write calls
}

func newSessionHandler(id int, conn net.Conn, srv *Server) *sessionHandler {
	addr := conn.RemoteAddr().(*net.TCPAddr)
	sh := &sessionHandler{
		id:         id,
		conn:       conn,
		srv:        srv,
		state:      SessionStateBinding,
		remoteIP:   addr.IP.String(),
		remotePort: addr.Port,
		outCh:      make(chan []byte, MaxOutQueuePerSession),
		done:       make(chan struct{}),
	}
	return sh
}

// info returns an immutable snapshot for frontend consumption.
func (sh *sessionHandler) info() SessionInfo {
	bindTypeName := ""
	switch sh.bindType {
	case CmdBindTransmitter:
		bindTypeName = BindTypeTX
	case CmdBindReceiver:
		bindTypeName = BindTypeRX
	case CmdBindTransceiver:
		bindTypeName = BindTypeTRX
	}
	connAt := ""
	if !sh.boundAt.IsZero() {
		connAt = sh.boundAt.Format(time.RFC3339)
	}
	return SessionInfo{
		ID:          sh.id,
		IP:          sh.remoteIP,
		Port:        sh.remotePort,
		SystemID:    sh.systemID,
		SystemType:  sh.systemType,
		BindType:    bindTypeName,
		Version:     int(sh.version),
		AddrRange:   sh.addrRange,
		AddrTON:     int(sh.addrTON),
		AddrNPI:     int(sh.addrNPI),
		State:       sh.state,
		ConnectedAt: connAt,
		MsgIn:       atomic.LoadInt64(&sh.msgIn),
		MsgOut:      atomic.LoadInt64(&sh.msgOut),
	}
}

// run is the main loop for this session. Starts the write goroutine, then reads PDUs until done.
func (sh *sessionHandler) run() {
	defer sh.close()

	go sh.writeLoop()

	reader := newBufReader(sh.conn)
	srv := sh.srv

	for {
		srv.mu.RLock()
		timeout := srv.cfg.PDUTimeoutMs
		srv.mu.RUnlock()

		pdu, err := ReadPDU(reader, sh.conn, timeout)
		if err != nil {
			select {
			case <-sh.done:
			default:
				srv.log("WARN", sh.label(), fmt.Sprintf("read error: %v", err))
			}
			return
		}

		srv.logPDU("IN", sh.label(), pdu.Header.CommandID, pdu.Body)

		if err := sh.dispatch(pdu); err != nil {
			srv.log("WARN", sh.label(), fmt.Sprintf("dispatch error: %v", err))
			return
		}
	}
}

// dispatch routes a received PDU to the appropriate handler.
func (sh *sessionHandler) dispatch(pdu *PDU) error {
	switch pdu.Header.CommandID {
	case CmdBindTransmitter, CmdBindReceiver, CmdBindTransceiver:
		return sh.handleBind(pdu)
	case CmdSubmitSm:
		return sh.handleSubmitSM(pdu)
	case CmdDeliverSmResp:
		return sh.handleDeliverSMResp(pdu)
	case CmdEnquireLink:
		return sh.handleEnquireLink(pdu)
	case CmdUnbind:
		return sh.handleUnbind(pdu)
	case CmdQuerySm:
		// query_sm is not supported — respond with generic_nack
		return sh.sendPDU(CmdGenericNack, EsmeRInvCmdId, pdu.Header.SequenceNumber, nil)
	default:
		sh.srv.log("WARN", sh.label(), fmt.Sprintf("unknown cmd 0x%08X", pdu.Header.CommandID))
		return sh.sendPDU(CmdGenericNack, EsmeRInvCmdId, pdu.Header.SequenceNumber, nil)
	}
}

// ---- PDU handlers -----------------------------------------------------------

func (sh *sessionHandler) handleBind(pdu *PDU) error {
	if sh.state == SessionStateBound {
		return sh.sendPDU(CmdGenericNack, EsmeRAlydBnd, pdu.Header.SequenceNumber, nil)
	}

	b, err := ParseBindBody(pdu.Body)
	if err != nil {
		sh.srv.log("WARN", sh.label(), fmt.Sprintf("invalid bind body: %v", err))
		return sh.sendPDU(CmdGenericNack, EsmeRInvCmdLen, pdu.Header.SequenceNumber, nil)
	}

	srv := sh.srv
	srv.mu.RLock()
	authRequired := srv.cfg.AuthRequired
	expectedID := srv.cfg.SystemID
	expectedPW := srv.cfg.Password
	srv.mu.RUnlock()

	if authRequired {
		if b.SystemID != expectedID {
			srv.log("WARN", sh.label(), fmt.Sprintf("bind rejected: invalid systemId '%s'", b.SystemID))
			_ = sh.sendPDU(respCmd(pdu.Header.CommandID), EsmeRInvSysId, pdu.Header.SequenceNumber,
				EncodeBindResp(""))
			return fmt.Errorf("invalid systemId")
		}
		if b.Password != expectedPW {
			srv.log("WARN", sh.label(), fmt.Sprintf("bind rejected: invalid password for '%s'", b.SystemID))
			_ = sh.sendPDU(respCmd(pdu.Header.CommandID), EsmeRInvPasWd, pdu.Header.SequenceNumber,
				EncodeBindResp(""))
			return fmt.Errorf("invalid password")
		}
	}

	sh.systemID = b.SystemID
	sh.systemType = b.SystemType
	sh.bindType = pdu.Header.CommandID
	sh.version = b.IntVersion
	sh.addrRange = b.AddressRange
	sh.addrTON = b.TON
	sh.addrNPI = b.NPI
	sh.state = SessionStateBound
	sh.boundAt = time.Now()

	srv.log("INFO", sh.label(), fmt.Sprintf("bound as %s (type=%s v=0x%02X)", b.SystemID, bindTypeName(pdu.Header.CommandID), b.IntVersion))
	srv.emit("smpp:session-bound", sh.info())

	return sh.sendPDU(respCmd(pdu.Header.CommandID), EsmeROk, pdu.Header.SequenceNumber,
		EncodeBindResp("KyaSMSC"))
}

func (sh *sessionHandler) handleSubmitSM(pdu *PDU) error {
	if sh.state != SessionStateBound {
		return sh.sendPDU(CmdSubmitSmResp, EsmeRInvBndSts, pdu.Header.SequenceNumber,
			EncodeSubmitSMResp(""))
	}
	// RX sessions cannot submit
	if sh.bindType == CmdBindReceiver {
		return sh.sendPDU(CmdSubmitSmResp, EsmeRInvBndSts, pdu.Header.SequenceNumber,
			EncodeSubmitSMResp(""))
	}

	sm, err := ParseSubmitSM(pdu.Body)
	if err != nil {
		sh.srv.log("WARN", sh.label(), fmt.Sprintf("invalid submit_sm: %v", err))
		return sh.sendPDU(CmdSubmitSmResp, EsmeRInvMsgLen, pdu.Header.SequenceNumber,
			EncodeSubmitSMResp(""))
	}

	status := sh.srv.pickSubmitStatus()
	msgSeq, msgRef := sh.srv.nextMsgID()
	atomic.AddInt64(&sh.srv.totalReceived, 1)
	atomic.AddInt64(&sh.msgIn, 1)

	// Build MessageInfo for the log
	mi := MessageInfo{
		ID:             msgSeq,
		Timestamp:      time.Now(),
		Direction:      DirIn,
		SystemID:       sh.systemID,
		SessionID:      sh.id,
		FromAddress:    sm.SourceAddr,
		FromTON:        int(sm.SourceTON),
		FromNPI:        int(sm.SourceNPI),
		ToAddress:      sm.DestAddr,
		ToTON:          int(sm.DestTON),
		ToNPI:          int(sm.DestNPI),
		Body:           bodyToString(sm.ShortMessage, sm.DataCoding),
		DataCoding:     int(sm.DataCoding),
		Reference:      msgRef,
		RequestDLR:     sm.RegisteredDelivery&0x03 != 0,
		HasUDH:         sm.ESMClass&ESMUDHInd != 0,
		SequenceNumber: int(pdu.Header.SequenceNumber),
		CommandStatus:  status,
	}
	if status == EsmeROk {
		mi.Status = "SENT"
	} else {
		mi.Status = "FAILED"
	}
	mi.TLVs = rawTLVsToModel(sm.TLVs)

	sh.srv.recordMessage(mi)
	sh.srv.emit("smpp:message-received", mi)

	// Simulate processing time before responding
	sh.srv.mu.RLock()
	procMin := sh.srv.cfg.ProcessingMinMs
	procMax := sh.srv.cfg.ProcessingMaxMs
	sh.srv.mu.RUnlock()
	if procMax > 0 {
		delay := procMax
		if procMax > procMin && procMin >= 0 {
			delay = procMin + rand.Intn(procMax-procMin+1)
		}
		if delay > 0 {
			time.Sleep(time.Duration(delay) * time.Millisecond)
		}
	}

	// Send submit_sm_resp
	if err := sh.sendPDU(CmdSubmitSmResp, status, pdu.Header.SequenceNumber,
		EncodeSubmitSMResp(msgRef)); err != nil {
		return err
	}

	// Queue delivery report if requested and submission succeeded
	if status == EsmeROk && mi.RequestDLR {
		go sh.sendDLR(sm, msgRef, mi.Body)
	}

	// Echo mode: send received message back as deliver_sm
	sh.srv.mu.RLock()
	echo := sh.srv.cfg.Echo
	sh.srv.mu.RUnlock()
	if echo && status == EsmeROk {
		go sh.sendEcho(sm, msgRef)
	}

	return nil
}

func (sh *sessionHandler) handleDeliverSMResp(pdu *PDU) error {
	// Acknowledge — nothing to do except log
	sh.srv.logPDU("IN", sh.label(), pdu.Header.CommandID, pdu.Body)
	return nil
}

func (sh *sessionHandler) handleEnquireLink(pdu *PDU) error {
	return sh.sendPDU(CmdEnquireLinkResp, EsmeROk, pdu.Header.SequenceNumber, nil)
}

func (sh *sessionHandler) handleUnbind(pdu *PDU) error {
	sh.srv.log("INFO", sh.label(), "unbind received")
	sh.state = SessionStateClosed
	_ = sh.sendPDU(CmdUnbindResp, EsmeROk, pdu.Header.SequenceNumber, nil)
	return fmt.Errorf("unbind") // triggers session teardown
}

// ---- Outbound delivery ------------------------------------------------------

// sendDLR generates and queues a delivery report for a previously received submit_sm.
func (sh *sessionHandler) sendDLR(sm *SubmitSM, msgRef, bodyExcerpt string) {
	// Small delay to make the DLR feel asynchronous
	time.Sleep(200 * time.Millisecond)

	dlrStat := sh.srv.pickDLRStatus()
	now := time.Now()
	dlrBody := fmt.Sprintf(
		"id:%s sub:001 dlvrd:001 submit date:%s done date:%s stat:%s err:000 text:%s",
		msgRef,
		now.Add(-200*time.Millisecond).Format("0601021504"),
		now.Format("0601021504"),
		dlrStat,
		truncate(bodyExcerpt, 20),
	)

	// Delivery report ESMClass = 0x04 (delivery receipt)
	esmClass := byte(0x04)
	tlvs := []RawTLV{
		{Tag: TLVReceiptedMsgId, Value: []byte(msgRef + "\x00")},
		{Tag: TLVMessageState, Value: []byte{dlrStatToByte(dlrStat)}},
	}

	body := EncodeDeliverSM(
		"", // serviceType
		sm.DestTON, sm.DestNPI, sm.DestAddr, // source (original dest)
		sm.SourceTON, sm.SourceNPI, sm.SourceAddr, // dest (original source)
		esmClass, sm.DataCoding,
		[]byte(dlrBody),
		tlvs,
	)

	seqNum := sh.nextSeq()
	pduBytes := EncodePDU(CmdDeliverSm, EsmeROk, seqNum, body)

	select {
	case sh.outCh <- pduBytes:
		atomic.AddInt64(&sh.srv.totalSent, 1)
		atomic.AddInt64(&sh.msgOut, 1)
		mi := MessageInfo{
			ID:               sh.srv.nextRef(),
			Timestamp:        time.Now(),
			Direction:        DirOut,
			SystemID:         sh.systemID,
			SessionID:        sh.id,
			FromAddress:      sm.DestAddr,
			ToAddress:        sm.SourceAddr,
			Body:             dlrBody,
			Reference:        msgRef,
			IsDeliveryReport: true,
			Status:           "SENT",
			SequenceNumber:   int(seqNum),
		}
		sh.srv.recordMessage(mi)
		sh.srv.emit("smpp:message-sent", mi)
	default:
		sh.srv.log("WARN", sh.label(), "DLR dropped: out queue full")
	}
}

// sendEcho sends the received message back to the originating session as deliver_sm (echo mode).
func (sh *sessionHandler) sendEcho(sm *SubmitSM, msgRef string) {
	body := EncodeDeliverSM(
		sm.ServiceType,
		sm.SourceTON, sm.SourceNPI, sm.SourceAddr,
		sm.DestTON, sm.DestNPI, sm.DestAddr,
		sm.ESMClass, sm.DataCoding,
		sm.ShortMessage, sm.TLVs,
	)
	seqNum := sh.nextSeq()
	pduBytes := EncodePDU(CmdDeliverSm, EsmeROk, seqNum, body)
	select {
	case sh.outCh <- pduBytes:
		atomic.AddInt64(&sh.srv.totalSent, 1)
	default:
		sh.srv.log("WARN", sh.label(), "echo deliver_sm dropped: out queue full")
	}
}

// sendDeliver queues a manually-initiated deliver_sm to this session.
func (sh *sessionHandler) sendDeliver(req SendMessageRequest) error {
	if sh.state != SessionStateBound {
		return fmt.Errorf("session %d is not bound", sh.id)
	}
	if sh.bindType == CmdBindTransmitter {
		return fmt.Errorf("session %d is TX-only, cannot receive deliver_sm", sh.id)
	}

	msg := []byte(req.Body)
	tlvs := modelTLVsToRaw(req.TLVs)
	body := EncodeDeliverSM(
		"",
		byte(req.FromTON), byte(req.FromNPI), req.FromAddress,
		byte(req.ToTON), byte(req.ToNPI), req.ToAddress,
		0x00, byte(req.DataCoding),
		msg, tlvs,
	)
	seqNum := sh.nextSeq()
	pduBytes := EncodePDU(CmdDeliverSm, EsmeROk, seqNum, body)

	select {
	case sh.outCh <- pduBytes:
		atomic.AddInt64(&sh.srv.totalSent, 1)
		atomic.AddInt64(&sh.msgOut, 1)
		mi := MessageInfo{
			ID:             sh.srv.nextRef(),
			Timestamp:      time.Now(),
			Direction:      DirOut,
			SystemID:       sh.systemID,
			SessionID:      sh.id,
			FromAddress:    req.FromAddress,
			ToAddress:      req.ToAddress,
			Body:           req.Body,
			DataCoding:     req.DataCoding,
			Status:         "SENT",
			SequenceNumber: int(seqNum),
		}
		sh.srv.recordMessage(mi)
		sh.srv.emit("smpp:message-sent", mi)
		return nil
	default:
		return fmt.Errorf("session %d out queue full", sh.id)
	}
}

// sendAutoMessage queues a deliver_sm from an auto-message template.
func (sh *sessionHandler) sendAutoMessage(tmpl AutoMessage) error {
	if sh.state != SessionStateBound {
		return nil
	}
	msg := []byte(tmpl.Body)
	tlvs := modelTLVsToRaw(tmpl.TLVs)
	body := EncodeDeliverSM(
		"",
		byte(tmpl.FromTON), byte(tmpl.FromNPI), tmpl.FromAddress,
		byte(tmpl.ToTON), byte(tmpl.ToNPI), tmpl.ToAddress,
		0x00, byte(tmpl.DataCoding),
		msg, tlvs,
	)
	seqNum := sh.nextSeq()
	pduBytes := EncodePDU(CmdDeliverSm, EsmeROk, seqNum, body)

	select {
	case sh.outCh <- pduBytes:
		atomic.AddInt64(&sh.srv.totalSent, 1)
		atomic.AddInt64(&sh.msgOut, 1)
		mi := MessageInfo{
			ID:             sh.srv.nextRef(),
			Timestamp:      time.Now(),
			Direction:      DirOut,
			SystemID:       sh.systemID,
			SessionID:      sh.id,
			FromAddress:    tmpl.FromAddress,
			ToAddress:      tmpl.ToAddress,
			Body:           tmpl.Body,
			DataCoding:     tmpl.DataCoding,
			Status:         "SENT",
			SequenceNumber: int(seqNum),
		}
		sh.srv.recordMessage(mi)
		sh.srv.emit("smpp:message-sent", mi)
		return nil
	default:
		return nil // queue full — silently drop
	}
}

// ---- Write loop -------------------------------------------------------------

func (sh *sessionHandler) writeLoop() {
	defer sh.close()
	for {
		select {
		case <-sh.done:
			return
		case pduBytes, ok := <-sh.outCh:
			if !ok {
				return
			}
			sh.writeMu.Lock()
			_, err := sh.conn.Write(pduBytes)
			sh.writeMu.Unlock()
			if err != nil {
				sh.srv.log("WARN", sh.label(), fmt.Sprintf("write error: %v", err))
				return
			}
		}
	}
}

// ---- Low-level send ---------------------------------------------------------

func (sh *sessionHandler) sendPDU(cmdID, status, seqNum uint32, body []byte) error {
	data := EncodePDU(cmdID, status, seqNum, body)
	sh.writeMu.Lock()
	_, err := sh.conn.Write(data)
	sh.writeMu.Unlock()
	sh.srv.logPDU("OUT", sh.label(), cmdID, body)
	return err
}

// ---- Lifecycle --------------------------------------------------------------

func (sh *sessionHandler) close() {
	sh.closeOnce.Do(func() {
		sh.state = SessionStateClosed
		sh.conn.Close()
		close(sh.done)
	})
}

// ---- Helpers ----------------------------------------------------------------

func (sh *sessionHandler) nextSeq() uint32 {
	return atomic.AddUint32(&sh.seqCounter, 1)
}

func (sh *sessionHandler) label() string {
	return fmt.Sprintf("session-%d", sh.id)
}

// respCmd maps a bind command ID to its response command ID.
func respCmd(cmdID uint32) uint32 {
	return cmdID | 0x80000000
}

// bindTypeName returns a human-readable bind type string.
func bindTypeName(cmdID uint32) string {
	switch cmdID {
	case CmdBindTransmitter:
		return BindTypeTX
	case CmdBindReceiver:
		return BindTypeRX
	case CmdBindTransceiver:
		return BindTypeTRX
	default:
		return "UNKNOWN"
	}
}

// bodyToString converts a PDU short message to a displayable string.
func bodyToString(data []byte, dataCoding byte) string {
	// For UCS-2 (0x08) a proper conversion would be needed.
	// For now, return raw string (valid for GSM7 / Latin-1 / ASCII).
	return string(data)
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s
}

func dlrStatToByte(stat string) byte {
	switch stat {
	case DlrStatDelivered:
		return byte(MsgStateDelivered)
	case DlrStatExpired:
		return byte(MsgStateExpired)
	case DlrStatDeleted:
		return byte(MsgStateDeleted)
	case DlrStatUndeliverable:
		return byte(MsgStateUndeliverable)
	case DlrStatAccepted:
		return byte(MsgStateAccepted)
	case DlrStatRejected:
		return byte(MsgStateRejected)
	default:
		return byte(MsgStateUnknown)
	}
}

func rawTLVsToModel(tlvs []RawTLV) []TLV {
	out := make([]TLV, len(tlvs))
	for i, t := range tlvs {
		out[i] = TLV{
			Tag:      t.Tag,
			Type:     "HEX",
			HexValue: fmt.Sprintf("%X", t.Value),
		}
	}
	return out
}

func modelTLVsToRaw(tlvs []TLV) []RawTLV {
	out := make([]RawTLV, 0, len(tlvs))
	for _, t := range tlvs {
		out = append(out, RawTLV{Tag: t.Tag, Value: []byte(t.HexValue)})
	}
	return out
}
