/**
 * Low-memory CRA dev server starter (spawned by Electron or RUN-APP.bat).
 */
const { spawn } = require('child_process');
const path = require('path');

const desktopRoot = path.join(__dirname, '..');
const scriptPath = path.join(desktopRoot, 'node_modules', 'react-scripts', 'bin', 'react-scripts.js');

const env = {
  ...process.env,
  BROWSER: 'none',
  FAST_REFRESH: 'false',
  DISABLE_ESLINT_PLUGIN: 'true',
  GENERATE_SOURCEMAP: 'false',
  WDS_SOCKET_PORT: '0',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072',
};

console.log('[frontend-dev] Starting on http://localhost:3000');
console.log('[frontend-dev] NODE_OPTIONS:', env.NODE_OPTIONS);

const child = spawn(process.execPath, [scriptPath, 'start'], {
  cwd: desktopRoot,
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  console.log('[frontend-dev] exited with code', code);
  process.exit(code || 0);
});
