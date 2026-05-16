const smpp = require('smpp');
const SmppHandler = require('./handler');
const Counter = require('./counter');

const { initSm } = require("./helpers");


let session = null;
const counter = new Counter()

const config = {
    host: '127.0.0.1',
    port: 5101,
    // port: 2777,
    system_id: 'kya',
    password: 'P@ssw0rd',
    interface_version: 0x50,
    addr_ton: 0,
    addr_npi: 0,
    address_range: ''
};

function send(session, param = {}) {
    let t = Date.now();
    counter.send()

    session.submit_sm(initSm(param), function (pdu) {
        const duration = Date.now() - t;
        counter.pdu(pdu, duration);

    });
}

(async () => {
    session = new smpp.Session(config);
    SmppHandler.handleLifecycle(session);
    let LIMIT = 10;
    session.on('connect', async () => {
        session.bind_transceiver(config, async function (pdu) {
            // counter.pdu(pdu);
            if (pdu.command_status == 0) {

                let h = setInterval(() => {
                    if (LIMIT && counter.a > LIMIT) return clearInterval(h);
                    send(session);
                }, 1000);
            } else {
                console.error(`❌ Bind failed: command_status=${pdu.command_status} (${pdu.command_status_name || 'unknown'})`);
                session.close();
            }
        });
    })
})();

