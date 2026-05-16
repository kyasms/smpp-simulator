const { faker } = require("@faker-js/faker");
const { randomPhoneNumber } = require("./phone.number");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function initSm(params = {}) {

    const sourceAddrs = ["KYA SMS"];

    return {
        source_addr: sourceAddrs[Math.floor(Math.random() * sourceAddrs.length)],
        source_addr_ton: 5, // Alphanumeric
        source_addr_npi: 0,
        dest_addr_ton: 1, // International
        dest_addr_npi: 1, // ISDN
        service_type: "MKT", // Cell Broadcast
        ...(() => { 
            if (!params?.message_payload) {
          
                return {
                    short_message: faker.lorem.sentence(10)
                }
            }
        })(),

        destination_addr: randomPhoneNumber('bj'),

        // message_payload: message+"_payload",
        data_coding: 0, // GSM 7-bit
        esm_class: 0, // Normal SMS
        protocol_id: 0,
        priority_flag: 0,
        registered_delivery: 1,
        ...params
    }
}

module.exports = { sleep, initSm };