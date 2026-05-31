/**
 * Verifies desktop can start before launching Electron.
 * Exit 0 = OK, 1 = missing build
 */
const fs = require('fs');
const path = require('path');

const index = path.join(__dirname, '..', 'build', 'index.html');
if (!fs.existsSync(index)) {
  console.error('MISSING: desktop/build/index.html');
  console.error('Run: npm.cmd run build:prod   (from desktop folder)');
  process.exit(1);
}
console.log('OK: build/index.html exists');
process.exit(0);
