/**
 * Start Expo with memory-safe settings for low-RAM Windows machines.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=8192',
  METRO_MAX_WORKERS: '1',
  REACT_NATIVE_PACKAGER_HOSTNAME:
    process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '192.168.148.95',
};

const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const port = process.env.EXPO_PORT || '8082';
const args = ['start', '--lan', '--port', port];

console.log('Starting Expo (low-memory mode: 1 Metro worker, 8GB heap)...');
console.log('Metro port:', port);
console.log('Expo URL: exp://' + env.REACT_NATIVE_PACKAGER_HOSTNAME + ':' + port);
console.log('API target: http://' + env.REACT_NATIVE_PACKAGER_HOSTNAME + ':5000/api');
console.log('If prompted: choose "Proceed anonymously" (arrow down + Enter)\n');

const child = spawn(process.execPath, ['--max-old-space-size=8192', expoCli, ...args], {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => process.exit(code ?? 0));
