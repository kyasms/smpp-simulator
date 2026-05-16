#!/usr/bin/env node

const { faker } = require('@faker-js/faker');
const carrier_mapper = require('./mappers');

// West African country codes and mobile prefixes
const WEST_AFRICAN_COUNTRIES = {
};

/**
 * Generate a realistic phone number for a specific West African country
 * @param {string|null} country - The country name (optional)
 * @returns {string} A formatted phone number
 */
function randomPhoneNumber(country = null, carrier = null, count = 1) {
    const numbers = [];
    count = Math.max(count, 1);
    let cc = Object.keys(carrier_mapper);
    for (let i = 0; i < count; i++) {
        let _country = country || faker.helpers.arrayElement(cc);
        if (!carrier_mapper[_country]) throw new Error(`Country '${_country}' not supported`);
        const cdata = carrier_mapper[_country];
        cc = Object.keys(cdata.p);
        let _carrier = carrier || faker.helpers.arrayElement(cc);
        const cprefixes = cdata.p[_carrier];
        const prefix = faker.helpers.arrayElement(cprefixes);
        const variable = faker.string.numeric(cdata.l - `${prefix}`.length);

        if (prefix.startsWith("4")) {
            console.log(cprefixes);
            
        }
        numbers.push(`${cdata.c}${prefix}${variable}`)
    }

    return numbers.length === 1 ? numbers[0] : numbers;
}

// Export functions
module.exports = {
    randomPhoneNumber
};