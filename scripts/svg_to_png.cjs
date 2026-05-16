const { execSync } = require('child_process');
const { mkdirSync, writeFileSync, readFileSync, rmSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const ROOT = join(__dirname, '..');
const SVG  = join(ROOT, 'kiaSmppSimLogo.svg');
const OUT  = join(ROOT, 'build', 'appicon.png');

const tmp = join(tmpdir(), 'kya-sharp-tmp');
try { rmSync(tmp, { recursive: true, force: true }); } catch(_) {}
mkdirSync(tmp, { recursive: true });

writeFileSync(join(tmp, 'package.json'), JSON.stringify({
  name: 'sharp-tmp', version: '1.0.0',
  dependencies: { 'sharp': '^0.34.2' },
}));

console.log('Installing sharp…');
execSync('npm install --silent --prefer-offline', { cwd: tmp, stdio: 'inherit' });

const sharp = require(join(tmp, 'node_modules', 'sharp'));
const svg = readFileSync(SVG);

sharp(svg, { density: 300 })
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(OUT)
  .then(info => {
    console.log('Wrote', OUT, JSON.stringify(info));
    try { rmSync(tmp, { recursive: true, force: true }); } catch(_) {}
  })
  .catch(err => {
    console.error('sharp failed:', err.message);
    try { rmSync(tmp, { recursive: true, force: true }); } catch(_) {}
    process.exit(1);
  });
