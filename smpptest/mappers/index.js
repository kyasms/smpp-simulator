const fs = require('fs');
const path = require('path');

// Get all mapper files dynamically
const mappers = {};
const mappersDir = __dirname;

fs.readdirSync(mappersDir)
  .filter(file => file.endsWith('.js') && file !== 'index.js')
  .forEach(file => {
    const countryCode = path.basename(file, '.js');
    mappers[countryCode] = require(path.join(mappersDir, file));
  });

module.exports = mappers;