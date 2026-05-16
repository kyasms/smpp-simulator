module.exports = {
    c: '233',
    l: 9,
    p: {
        "vodafone": ["20", "50"],
        "airteltigo": ["23", "26", "27", "56", "57"],
        "mtn": ["24", /*"25",*/ "53", "54", "55",...((x)=>Array.from({ length: 9 }, (_, i) => i + 1).map(el=>`${x}${el}`))("59")],
        "expresso": ["28"],
        "national_security": ["29"]
    }
}
