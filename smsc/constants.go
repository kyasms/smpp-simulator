package smsc

// SMPP Command IDs
const (
	CmdGenericNack         uint32 = 0x80000000
	CmdBindReceiver        uint32 = 0x00000001
	CmdBindReceiverResp    uint32 = 0x80000001
	CmdBindTransmitter     uint32 = 0x00000002
	CmdBindTransmitterResp uint32 = 0x80000002
	CmdQuerySm             uint32 = 0x00000003
	CmdQuerySmResp         uint32 = 0x80000003
	CmdSubmitSm            uint32 = 0x00000004
	CmdSubmitSmResp        uint32 = 0x80000004
	CmdDeliverSm           uint32 = 0x00000005
	CmdDeliverSmResp       uint32 = 0x80000005
	CmdUnbind              uint32 = 0x00000006
	CmdUnbindResp          uint32 = 0x80000006
	CmdReplaceSm           uint32 = 0x00000007
	CmdReplaceSmResp       uint32 = 0x80000007
	CmdCancelSm            uint32 = 0x00000008
	CmdCancelSmResp        uint32 = 0x80000008
	CmdBindTransceiver     uint32 = 0x00000009
	CmdBindTransceiverResp uint32 = 0x80000009
	CmdOutbind             uint32 = 0x0000000B
	CmdEnquireLink         uint32 = 0x00000015
	CmdEnquireLinkResp     uint32 = 0x80000015
	CmdSubmitMulti         uint32 = 0x00000021
	CmdSubmitMultiResp     uint32 = 0x80000021
	CmdAlertNotification   uint32 = 0x00000102
	CmdDataSm              uint32 = 0x00000103
	CmdDataSmResp          uint32 = 0x80000103
)

// SMPP Status Codes (ESME)
const (
	EsmeROk             uint32 = 0x00000000 // No Error
	EsmeRInvMsgLen      uint32 = 0x00000001 // Message Length is invalid
	EsmeRInvCmdLen      uint32 = 0x00000002 // Command Length is invalid
	EsmeRInvCmdId       uint32 = 0x00000003 // Invalid Command ID
	EsmeRInvBndSts      uint32 = 0x00000004 // Incorrect BIND Status for given command
	EsmeRAlydBnd        uint32 = 0x00000005 // ESME Already in Bound State
	EsmeRInvPrtFlg      uint32 = 0x00000006 // Invalid Priority Flag
	EsmeRInvRegDlvFlg   uint32 = 0x00000007 // Invalid Registered Delivery Flag
	EsmeRSysErr         uint32 = 0x00000008 // System Error
	EsmeRInvSrcAdr      uint32 = 0x0000000B // Invalid Source Address
	EsmeRInvDstAdr      uint32 = 0x0000000C // Invalid Dest Addr
	EsmeRInvMsgId       uint32 = 0x0000000D // Message ID is invalid
	EsmeRBindFail       uint32 = 0x0000000E // Bind Failed
	EsmeRInvPasWd       uint32 = 0x0000000F // Invalid Password
	EsmeRInvSysId       uint32 = 0x00000010 // Invalid System ID
	EsmeRCancelFail     uint32 = 0x00000014 // Cancel SM Failed
	EsmeRReplaceFail    uint32 = 0x00000016 // Replace SM Failed
	EsmeRMsgQFul        uint32 = 0x00000017 // Message Queue Full
	EsmeRInvSerTyp      uint32 = 0x00000019 // Invalid Service Type
	EsmeRInvNumDests    uint32 = 0x00000033 // Invalid number of destinations
	EsmeRInvDlName      uint32 = 0x00000034 // Invalid Distribution List name
	EsmeRInvDestFlag    uint32 = 0x00000040 // Destination flag is invalid
	EsmeRInvSubRep      uint32 = 0x00000042 // Invalid submit with replace request
	EsmeRInvEsmClass    uint32 = 0x00000043 // Invalid esm_class field data
	EsmeRCntSubDl       uint32 = 0x00000044 // Cannot Submit to Distribution List
	EsmeRSubmitFail     uint32 = 0x00000045 // submit_sm or submit_multi failed
	EsmeRInvSrcTon      uint32 = 0x00000048 // Invalid Source address TON
	EsmeRInvSrcNpi      uint32 = 0x00000049 // Invalid Source address NPI
	EsmeRInvDstTon      uint32 = 0x00000050 // Invalid Destination address TON
	EsmeRInvDstNpi      uint32 = 0x00000051 // Invalid Destination address NPI
	EsmeRInvSysTyp      uint32 = 0x00000053 // Invalid system_type field
	EsmeRInvRepFlag     uint32 = 0x00000054 // Invalid replace_if_present flag
	EsmeRInvNumMsgs     uint32 = 0x00000055 // Invalid number of messages
	EsmeRThrottled      uint32 = 0x00000058 // Throttling error
	EsmeRInvSched       uint32 = 0x00000061 // Invalid Scheduled Delivery Time
	EsmeRInvExpiry      uint32 = 0x00000062 // Invalid message validity period (Expiry time)
	EsmeRInvDftMsgId    uint32 = 0x00000063 // Predefined Message Invalid or Not Found
	EsmeRxTAppn         uint32 = 0x00000064 // ESME Receiver Temporary App Error Code
	EsmeRxPAppn         uint32 = 0x00000065 // ESME Receiver Permanent App Error Code
	EsmeRxRAppn         uint32 = 0x00000066 // ESME Receiver Reject Message Error Code
	EsmeRQueryFail      uint32 = 0x00000067 // query_sm request failed
	EsmeRInvOptParStream uint32 = 0x000000C0 // Error in the optional part of the PDU Body
	EsmeROptParNotAllwd  uint32 = 0x000000C1 // Optional Parameter not allowed
	EsmeRInvParLen       uint32 = 0x000000C2 // Invalid Parameter Length
	EsmeRMissingOptParam uint32 = 0x000000C3 // Expected Optional Parameter missing
	EsmeRInvOptParamVal  uint32 = 0x000000C4 // Invalid Optional Parameter Value
	EsmeRDeliveryFailure uint32 = 0x000000FE // Delivery Failure (used for data_sm_resp)
	EsmeRUnknownErr      uint32 = 0x000000FF // Unknown Error
)

// SMPP Interface Versions
const (
	SMPPVersion33 = 0x33
	SMPPVersion34 = 0x34
	SMPPVersion50 = 0x50
)

// TON (Type of Number)
const (
	TONUnknown          = 0
	TONInternational    = 1
	TONNational         = 2
	TONNetworkSpecific  = 3
	TONSubscriberNumber = 4
	TONAlphanumeric     = 5
	TONAbbreviated      = 6
)

// NPI (Numbering Plan Indicator)
const (
	NPIUnknown       = 0
	NPIISDN          = 1
	NPIData          = 3
	NPITelex         = 4
	NPILandMobile    = 6
	NPINATIONAL      = 8
	NPIPrivate       = 9
	NPIERMESPaging   = 10
	NPIInternetIP    = 13
	NPIWapClientId   = 18
)

// Data Coding Scheme
const (
	DCDefault     = 0x00 // GSM7
	DCLatin1      = 0x03
	DCBinary      = 0x04
	DCUCS2        = 0x08
	DCKorean      = 0x0E
	DCChinese     = 0x0F
)

// ESM Class flags
const (
	ESMDefaultMsgType  = 0x00
	ESMDeliverySM      = 0x01
	ESMForwardSM       = 0x02
	ESMStoreAndForward = 0x03
	ESMUDHInd          = 0x40
	ESMReplyPath       = 0x80
)

// Registered Delivery flags
const (
	RegDelivNoReceipt     = 0x00
	RegDelivOnSuccess     = 0x01
	RegDelivOnFailure     = 0x02
	RegDelivAlways        = 0x03
)

// Delivery status texts (for DLR body)
const (
	DlrStatDelivered     = "DELIVRD"
	DlrStatFailed        = "FAILED"
	DlrStatExpired       = "EXPIRED"
	DlrStatDeleted       = "DELETED"
	DlrStatUndeliverable = "UNDELIV"
	DlrStatAccepted      = "ACCEPTD"
	DlrStatUnknown       = "UNKNOWN"
	DlrStatRejected      = "REJECTD"
)

// Well-known TLV tags
const (
	TLVReceiptedMsgId    uint16 = 0x001E
	TLVDestAddrSubUnit   uint16 = 0x0005
	TLVSourceAddrSubUnit uint16 = 0x000D
	TLVSourcePort        uint16 = 0x020A
	TLVDestPort          uint16 = 0x020B
	TLVSarMsgRefNum      uint16 = 0x020C
	TLVSarTotalSegments  uint16 = 0x020E
	TLVSarSegmentSeqNum  uint16 = 0x020F
	TLVPayloadType       uint16 = 0x0019
	TLVMessagePayload    uint16 = 0x0424
	TLVPrivacyIndicator  uint16 = 0x0201
	TLVSourceSubAddr     uint16 = 0x0202
	TLVDestSubAddr       uint16 = 0x0203
	TLVUserMsgRef        uint16 = 0x0204
	TLVUserResponseCode  uint16 = 0x0205
	TLVLanguageIndicator uint16 = 0x020D
	TLVMessageState      uint16 = 0x0427
	TLVCallbackNum       uint16 = 0x0381
)

// Message states
const (
	MsgStateEnroute       = 1
	MsgStateDelivered     = 2
	MsgStateExpired       = 3
	MsgStateDeleted       = 4
	MsgStateUndeliverable = 5
	MsgStateAccepted      = 6
	MsgStateUnknown       = 7
	MsgStateRejected      = 8
)

// Session states
const (
	SessionStateBinding = "BINDING"
	SessionStateBound   = "BOUND"
	SessionStateClosed  = "CLOSED"
)

// Bind type names
const (
	BindTypeTX  = "TX"
	BindTypeRX  = "RX"
	BindTypeTRX = "TRX"
)

// Internal limits
const (
	MaxOutQueuePerSession = 100
	StatsTickInterval     = 500 // ms
	WorkerTickInterval    = 100 // ms
	ConfigReloadInterval  = 3000 // ms
	KeepaliveTickInterval = 500 // ms — granularity for enquire_link sending & PDU-timeout checks
)
