/**
 * Low-memory production build. Output: desktop/build/
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const desktopRoot = path.join(__dirname, '..');
const reactScriptsBuild = path.join(
  desktopRoot,
  'node_modules',
  'react-scripts',
  'bin',
  'react-scripts.js'
);

const buildScript = reactScriptsBuild;
const buildArgs = ['build'];

const env = {
  ...process.env,
  CI: 'true',
  GENERATE_SOURCEMAP: 'false',
  DISABLE_ESLINT_PLUGIN: 'true',
  TSC_COMPILE_ON_ERROR: 'true',
  FAST_REFRESH: 'false',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=12288',
  INLINE_RUNTIME_CHUNK: 'false',
};

console.log('Building desktop UI (please wait, 3–15 minutes)...');
console.log('Using: react-scripts');

const result = spawnSync(process.execPath, [buildScript, ...buildArgs], {
  cwd: desktopRoot,
  env,
  stdio: 'inherit',
});

const indexHtml = path.join(desktopRoot, 'build', 'index.html');
if (result.status !== 0 || !fs.existsSync(indexHtml)) {
  console.error('\nBuild failed. Close Chrome/Cursor, reboot, then run RUN-APP.bat again.');
  process.exit(result.status || 1);
}

console.log('\nBuild OK:', indexHtml);
