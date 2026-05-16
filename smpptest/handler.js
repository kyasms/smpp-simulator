class SmppHandler {

    static onPdu(session, pdu) {
        // console.log(pdu);
    }

    static onConnect(session) {
        console.log('🔗 Connected to SMPP server');
        return true;
    }

    static onBind(session) {
        return true;
    }

    static onUnbind(session) {
        return true;
    }

    static onDisconnect(session) {
        console.log('🔌 SMPP session closed');
    }

    static onError(session, error) {
        console.error('❌ SMPP session error:', error);
    }

    static handleLifecycle(session) {
        session.on('pdu', pdu => this.onPdu(session, pdu));
        session.on('error', e=>this.onError(session, e));
        session.on('connect', () => this.onConnect(session));

        session.on('close', () => {

        });

        session.on('deliver_sm', (pdu) => {
            console.log('📩 Received deliver_sm (DLR or MO):', pdu);

            // Check if this is a delivery receipt (DLR)
            if (pdu.short_message && /id:.*stat:/.test(pdu.short_message.toString())) {
                console.log('✅ Delivery Receipt received:', pdu.short_message.toString());
            } else {
                console.log('📥 Mobile Originated message received:', pdu.short_message?.toString());
            }

            // Always respond to deliver_sm to acknowledge receipt
            session.deliver_sm_resp({
                sequence_number: pdu.sequence_number
            });
        });

    }
}

module.exports = SmppHandler;