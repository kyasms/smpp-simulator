package smsc

import "time"

// ---- Config -----------------------------------------------------------------

// Config holds the full application configuration persisted to disk.
type Config struct {
	Port              int    `json:"port"`
	BindIP            string `json:"bindIp"` // e.g. "0.0.0.0", "127.0.0.1"
	AuthRequired      bool   `json:"authRequired"`
	SystemID          string `json:"systemId"`
	Password          string `json:"password"`

	PDUTimeoutMs      int `json:"pduTimeoutMs"`
	EnquireIntervalMs int `json:"enquireIntervalMs"`
	ProcessingMinMs   int `json:"processingMinMs"`
	ProcessingMaxMs   int `json:"processingMaxMs"`
	MultipartMode     int `json:"multipartMode"` // 0=UDH 1=UDH16 2=SAR-TLV 3=Payload-TLV
	DeliverMode       int `json:"deliverMode"`   // 0=forward_sm 1=deliver_sm

	Echo              bool `json:"echo"`
	GeneratePerMinute int  `json:"generatePerMinute"`
	RandomOrder       bool `json:"randomOrder"`
	KeepMessages      int  `json:"keepMessages"`

	ServerLogEnabled  bool   `json:"serverLogEnabled"`
	SessionLogEnabled bool   `json:"sessionLogEnabled"`
	PDULogEnabled     bool   `json:"pduLogEnabled"`
	ServerLogPath     string `json:"serverLogPath"`
	SessionLogPath    string `json:"sessionLogPath"`

	MessageErrorRates  []MessageErrorRate  `json:"messageErrorRates"`
	DeliveryErrorRates []DeliveryErrorRate `json:"deliveryErrorRates"`
	AutoMessages       []AutoMessage       `json:"autoMessages"`
	LastReference      int64               `json:"lastReference"`
}

// DefaultConfig returns a sensible default configuration.
func DefaultConfig() Config {
	return Config{
		Port:              2775,
		BindIP:            "0.0.0.0",
		SystemID:          "kya",
		Password:          "P@ssw0rd",
		PDUTimeoutMs:      5000,
		EnquireIntervalMs: 30000,
		MultipartMode:     1,
		DeliverMode:       1,
		KeepMessages:      200,
		LastReference:     0,
	}
}

// ---- Error rates ------------------------------------------------------------

// MessageErrorRate maps an ESME status code to a probability (percentage 1-100).
type MessageErrorRate struct {
	StatusCode  uint32 `json:"statusCode"`
	Description string `json:"description"`
	Occurrence  int    `json:"occurrence"`
}

// DeliveryErrorRate maps a delivery status text to a probability.
type DeliveryErrorRate struct {
	StatusText string `json:"statusText"` // DELIVRD, FAILED, EXPIRED, etc.
	Occurrence int    `json:"occurrence"`
}

// ---- Auto messages ----------------------------------------------------------

// AutoMessage is a template used for periodic auto-delivery to connected clients.
type AutoMessage struct {
	FromAddress string `json:"fromAddress"`
	FromTON     int    `json:"fromTon"`
	FromNPI     int    `json:"fromNpi"`
	ToAddress   string `json:"toAddress"`
	ToTON       int    `json:"toTon"`
	ToNPI       int    `json:"toNpi"`
	Body        string `json:"body"`
	DataCoding  int    `json:"dataCoding"`
	HasUDH      bool   `json:"hasUdh"`
	TLVs        []TLV  `json:"tlvs"`
}

// TLV is an application-level TLV descriptor (tag + typed value).
type TLV struct {
	Tag        uint16 `json:"tag"`
	Type       string `json:"type"`       // STRING, HEX, INT32, INT16, INT8
	HexValue   string `json:"hexValue"`
	TypedValue string `json:"typedValue"`
}

// ---- Session info (exported to frontend) ------------------------------------

// SessionInfo is the read-only snapshot of a connected session sent to the frontend.
type SessionInfo struct {
	ID          int    `json:"id"`
	IP          string `json:"ip"`
	Port        int    `json:"port"`
	SystemID    string `json:"systemId"`
	SystemType  string `json:"systemType"`
	BindType    string `json:"bindType"` // TX, RX, TRX
	Version     int    `json:"version"`
	AddrRange   string `json:"addressRange"`
	AddrTON     int    `json:"addressRangeTon"`
	AddrNPI     int    `json:"addressRangeNpi"`
	State       string `json:"state"` // BINDING, BOUND, CLOSED
	ConnectedAt string `json:"connectedAt"`
	MsgIn       int64  `json:"msgIn"`
	MsgOut      int64  `json:"msgOut"`
}

// ---- Message info (exported to frontend) ------------------------------------

// Direction of a message.
type Direction string

const (
	DirIn  Direction = "IN"
	DirOut Direction = "OUT"
)

// MessageInfo is the read-only snapshot of a processed message sent to the frontend.
type MessageInfo struct {
	ID        int64     `json:"id"`
	Timestamp time.Time `json:"timestamp"`
	Direction Direction `json:"direction"`

	SystemID string `json:"systemId"`
	SessionID int   `json:"sessionId"`

	FromAddress string `json:"fromAddress"`
	FromTON     int    `json:"fromTon"`
	FromNPI     int    `json:"fromNpi"`
	ToAddress   string `json:"toAddress"`
	ToTON       int    `json:"toTon"`
	ToNPI       int    `json:"toNpi"`

	Body               string `json:"body"`
	DataCoding         int    `json:"dataCoding"`
	Status             string `json:"status"`    // PENDING, SENT, FAILED, DENIED
	Reference          string `json:"reference"` // message ID string
	IsDeliveryReport   bool   `json:"isDeliveryReport"`
	RequestDLR         bool   `json:"requestDlr"`
	HasUDH             bool   `json:"hasUdh"`
	SequenceNumber     int    `json:"sequenceNumber"`
	CommandStatus      uint32 `json:"commandStatus"`

	TLVs []TLV `json:"tlvs"`
}

// ---- Stats ------------------------------------------------------------------

// Stats is the live statistics snapshot streamed to the frontend.
type Stats struct {
	ServerRunning     bool          `json:"serverRunning"`
	SessionCount      int           `json:"sessionCount"`
	TotalReceived     int64         `json:"totalReceived"`
	TotalSent         int64         `json:"totalSent"`
	ReceivedPerSecond float64       `json:"receivedPerSecond"`
	SentPerSecond     float64       `json:"sentPerSecond"`
	LastReference     int64         `json:"lastReference"`
	Port              int           `json:"port"`
	Sessions          []SessionInfo `json:"sessions"`
}

// ---- Log entry --------------------------------------------------------------

// LogEntry is a timestamped log line emitted to the frontend.
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"` // INFO, WARN, ERROR, DEBUG
	Source    string    `json:"source"`
	Message   string    `json:"message"`
}

// ---- Manual send request ----------------------------------------------------

// SendMessageRequest is the payload the frontend sends when manually injecting a deliver_sm.
type SendMessageRequest struct {
	OperatorId  string `json:"operatorId"`
	SessionID   int    `json:"sessionId"`
	FromAddress string `json:"fromAddress"`
	FromTON     int    `json:"fromTon"`
	FromNPI     int    `json:"fromNpi"`
	ToAddress   string `json:"toAddress"`
	ToTON       int    `json:"toTon"`
	ToNPI       int    `json:"toNpi"`
	Body        string `json:"body"`
	DataCoding  int    `json:"dataCoding"`
	TLVs        []TLV  `json:"tlvs"`
}
