/**
 * Start Expo with memory-safe settings for low-RAM Windows machines.
 */
const path = require('path');

process.chdir(path.join(__dirname, '..'));

process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--max-old-space-size=8192';
process.env.METRO_MAX_WORKERS = process.env.METRO_MAX_WORKERS || '1';
process.env.REACT_NATIVE_PACKAGER_HOSTNAME =
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '192.168.148.95';

const port = process.env.EXPO_PORT || '8082';

console.log('Starting Expo (low-memory mode: 1 Metro worker, 8GB heap)...');
console.log('Metro port:', port);
console.log('Expo URL: exp://' + process.env.REACT_NATIVE_PACKAGER_HOSTNAME + ':' + port);
const apiHost = process.env.EXPO_PUBLIC_API_HOST || '10.8.128.217';
const apiPort = process.env.EXPO_PUBLIC_API_PORT || '5000';
console.log('Local API: http://' + apiHost + ':' + apiPort + '/api');
console.log('Health:    http://' + apiHost + ':' + apiPort + '/api/health');
console.log('(npm/Expo Go uses local backend — VPS only in release APK builds)');
console.log('If prompted: choose "Proceed anonymously" (arrow down + Enter)\n');

process.argv = [
  process.argv[0],
  process.argv[1],
  'start',
  '--lan',
  '--port',
  port,
];

require('@expo/cli');
