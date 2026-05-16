const smpp = require('smpp');
const smpp_erros = Object.fromEntries(Object.entries(smpp.errors).map(([k, v]) => [v, k]))

class Counter {
    a = 0
    s = 0
    p = 0
    f = 0

    send(count = 1) {
        this.a = this.a + count;
        this.p = this.p + count;
    }

    sent(count = 1) {
        this.p = this.p - count;
    }
    success(count = 1) {
        this.p = this.p - count;
        this.s = this.s + count;
    }
    fail(count = 1) {
        this.p = this.p - count;
        this.f = this.f + count;
    }
    #synthese(prepend = "", append = "") {
        return `${prepend}${prepend ? ' ' : ''}total ${this.a} pending ${this.p} success ${this.s} fail ${this.f} ${append ? '|' : ''} ${append}`;
    }
    synthese(prepend = "", append = "") {
        console.log(this.#synthese(prepend, append));
    }

    pdu(pdu, duration = 0) {

        if (pdu.command != 'bind_transceiver_resp') {
            pdu.command_status ? this.fail() : this.success();
        }
        

        let prepend = pdu.command_status ? "❌" : "✅";
        duration = `${duration && 'duration '}${duration || ''}${duration && 'ms'}`;
        const message_id = `${pdu.message_id && 'msgId '}${pdu.message_id || ''}`;
        let status = smpp_erros[pdu.command_status] || "0x"+(pdu.command_status*1).toString(16);
        status = `${status || ''}`;
        this.synthese(prepend, [status, duration, message_id].filter(el => !!el).join(' | '))
    }
}

module.exports = Counter;