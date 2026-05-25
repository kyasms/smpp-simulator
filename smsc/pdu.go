package smsc

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"time"
)

// PDUHeader represents the 16-byte fixed SMPP header.
type PDUHeader struct {
	CommandLength  uint32
	CommandID      uint32
	CommandStatus  uint32
	SequenceNumber uint32
}

// PDU is a parsed SMPP protocol data unit.
type PDU struct {
	Header PDUHeader
	Body   []byte
}

// ReadPDU reads one complete PDU from r, enforcing a read deadline if conn is provided.
func ReadPDU(r io.Reader, conn net.Conn, timeoutMs int) (*PDU, error) {
	if conn != nil {
		if timeoutMs > 0 {
			conn.SetReadDeadline(time.Now().Add(time.Duration(timeoutMs) * time.Millisecond))
		} else {
			// No deadline: block until a PDU arrives. Also clears any deadline left
			// over from a previous read (e.g. after the enquire_link interval was set to 0).
			conn.SetReadDeadline(time.Time{})
		}
	}

	var hdr PDUHeader
	if err := binary.Read(r, binary.BigEndian, &hdr); err != nil {
		return nil, err
	}
	if hdr.CommandLength < 16 || hdr.CommandLength > 1<<20 {
		return nil, fmt.Errorf("invalid PDU command_length %d", hdr.CommandLength)
	}

	bodyLen := int(hdr.CommandLength) - 16
	body := make([]byte, bodyLen)
	if bodyLen > 0 {
		if _, err := io.ReadFull(r, body); err != nil {
			return nil, err
		}
	}
	return &PDU{Header: hdr, Body: body}, nil
}

// EncodePDU serialises a complete SMPP PDU into a byte slice.
func EncodePDU(cmdID, cmdStatus, seqNum uint32, body []byte) []byte {
	length := uint32(16 + len(body))
	buf := make([]byte, length)
	binary.BigEndian.PutUint32(buf[0:], length)
	binary.BigEndian.PutUint32(buf[4:], cmdID)
	binary.BigEndian.PutUint32(buf[8:], cmdStatus)
	binary.BigEndian.PutUint32(buf[12:], seqNum)
	copy(buf[16:], body)
	return buf
}

// WritePDU sends a PDU over a connection under a mutex-protected write call.
// Callers must NOT hold any per-session mutex when calling this.
func WritePDU(conn net.Conn, cmdID, cmdStatus, seqNum uint32, body []byte) error {
	data := EncodePDU(cmdID, cmdStatus, seqNum, body)
	_, err := conn.Write(data)
	return err
}

// ---- C-string helpers -------------------------------------------------------

// readCStr reads a null-terminated string from a bytes.Reader.
func readCStr(r *bytes.Reader) (string, error) {
	var buf []byte
	for {
		b, err := r.ReadByte()
		if err != nil {
			return "", err
		}
		if b == 0 {
			return string(buf), nil
		}
		buf = append(buf, b)
	}
}

// writeCStr appends a C-string (null-terminated) to a bytes.Buffer.
func writeCStr(w *bytes.Buffer, s string) {
	w.WriteString(s)
	w.WriteByte(0)
}

// ---- Bind -------------------------------------------------------------------

// BindBody holds the decoded body of a bind_transmitter / bind_receiver / bind_transceiver PDU.
type BindBody struct {
	SystemID     string
	Password     string
	SystemType   string
	IntVersion   byte
	TON          byte
	NPI          byte
	AddressRange string
}

// ParseBindBody decodes a bind PDU body.
func ParseBindBody(data []byte) (*BindBody, error) {
	r := bytes.NewReader(data)
	b := &BindBody{}
	var err error
	if b.SystemID, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("bind systemId: %w", err)
	}
	if b.Password, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("bind password: %w", err)
	}
	if b.SystemType, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("bind systemType: %w", err)
	}
	if b.IntVersion, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("bind interfaceVersion: %w", err)
	}
	if b.TON, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("bind ton: %w", err)
	}
	if b.NPI, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("bind npi: %w", err)
	}
	if b.AddressRange, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("bind addressRange: %w", err)
	}
	return b, nil
}

// EncodeBindResp encodes a bind_*_resp body (just the system_id C-string).
func EncodeBindResp(systemID string) []byte {
	var buf bytes.Buffer
	writeCStr(&buf, systemID)
	return buf.Bytes()
}

// ---- Submit SM --------------------------------------------------------------

// SubmitSM holds the decoded fields of a submit_sm PDU.
type SubmitSM struct {
	ServiceType          string
	SourceTON            byte
	SourceNPI            byte
	SourceAddr           string
	DestTON              byte
	DestNPI              byte
	DestAddr             string
	ESMClass             byte
	ProtocolID           byte
	PriorityFlag         byte
	ScheduleDeliveryTime string
	ValidityPeriod       string
	RegisteredDelivery   byte
	ReplaceIfPresent     byte
	DataCoding           byte
	SMDefaultMsgID       byte
	ShortMessage         []byte
	TLVs                 []RawTLV
}

// RawTLV is a raw tag-length-value field.
type RawTLV struct {
	Tag   uint16
	Value []byte
}

// ParseSubmitSM decodes a submit_sm PDU body.
func ParseSubmitSM(data []byte) (*SubmitSM, error) {
	r := bytes.NewReader(data)
	s := &SubmitSM{}
	var err error

	if s.ServiceType, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("serviceType: %w", err)
	}
	if s.SourceTON, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("sourceTon: %w", err)
	}
	if s.SourceNPI, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("sourceNpi: %w", err)
	}
	if s.SourceAddr, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("sourceAddr: %w", err)
	}
	if s.DestTON, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("destTon: %w", err)
	}
	if s.DestNPI, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("destNpi: %w", err)
	}
	if s.DestAddr, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("destAddr: %w", err)
	}
	if s.ESMClass, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("esmClass: %w", err)
	}
	if s.ProtocolID, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("protocolId: %w", err)
	}
	if s.PriorityFlag, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("priorityFlag: %w", err)
	}
	if s.ScheduleDeliveryTime, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("scheduleDeliveryTime: %w", err)
	}
	if s.ValidityPeriod, err = readCStr(r); err != nil {
		return nil, fmt.Errorf("validityPeriod: %w", err)
	}
	if s.RegisteredDelivery, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("registeredDelivery: %w", err)
	}
	if s.ReplaceIfPresent, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("replaceIfPresent: %w", err)
	}
	if s.DataCoding, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("dataCoding: %w", err)
	}
	if s.SMDefaultMsgID, err = r.ReadByte(); err != nil {
		return nil, fmt.Errorf("smDefaultMsgId: %w", err)
	}
	smLen, err := r.ReadByte()
	if err != nil {
		return nil, fmt.Errorf("smLength: %w", err)
	}
	s.ShortMessage = make([]byte, smLen)
	if smLen > 0 {
		if _, err = io.ReadFull(r, s.ShortMessage); err != nil {
			return nil, fmt.Errorf("shortMessage: %w", err)
		}
	}

	// Optional TLVs
	for r.Len() >= 4 {
		var tag, length uint16
		if err = binary.Read(r, binary.BigEndian, &tag); err != nil {
			break
		}
		if err = binary.Read(r, binary.BigEndian, &length); err != nil {
			break
		}
		val := make([]byte, length)
		if _, err = io.ReadFull(r, val); err != nil {
			break
		}
		s.TLVs = append(s.TLVs, RawTLV{Tag: tag, Value: val})
	}
	return s, nil
}

// EncodeSubmitSMResp encodes a submit_sm_resp body (message_id C-string).
func EncodeSubmitSMResp(messageID string) []byte {
	var buf bytes.Buffer
	writeCStr(&buf, messageID)
	return buf.Bytes()
}

// ---- Deliver SM -------------------------------------------------------------

// EncodeDeliverSM builds a deliver_sm PDU body from the given fields.
func EncodeDeliverSM(
	serviceType string,
	srcTON, srcNPI byte, srcAddr string,
	dstTON, dstNPI byte, dstAddr string,
	esmClass, dataCoding byte,
	msg []byte,
	tlvs []RawTLV,
) []byte {
	var buf bytes.Buffer
	writeCStr(&buf, serviceType)
	buf.WriteByte(srcTON)
	buf.WriteByte(srcNPI)
	writeCStr(&buf, srcAddr)
	buf.WriteByte(dstTON)
	buf.WriteByte(dstNPI)
	writeCStr(&buf, dstAddr)
	buf.WriteByte(esmClass)
	buf.WriteByte(0) // protocol_id
	buf.WriteByte(0) // priority_flag
	writeCStr(&buf, "")  // schedule_delivery_time (empty)
	writeCStr(&buf, "")  // validity_period (empty)
	buf.WriteByte(0) // registered_delivery
	buf.WriteByte(0) // replace_if_present
	buf.WriteByte(dataCoding)
	buf.WriteByte(0) // sm_default_msg_id
	buf.WriteByte(byte(len(msg)))
	buf.Write(msg)

	for _, tlv := range tlvs {
		binary.Write(&buf, binary.BigEndian, tlv.Tag)
		binary.Write(&buf, binary.BigEndian, uint16(len(tlv.Value)))
		buf.Write(tlv.Value)
	}
	return buf.Bytes()
}

// EncodeDeliverSMResp encodes a deliver_sm_resp body (empty message_id).
func EncodeDeliverSMResp() []byte {
	return []byte{0} // empty message_id C-string
}

// ---- Generic NACK -----------------------------------------------------------

// EncodeGenericNack returns a generic_nack PDU for the given error status.
func EncodeGenericNack(seqNum, status uint32) []byte {
	return EncodePDU(CmdGenericNack, status, seqNum, nil)
}
