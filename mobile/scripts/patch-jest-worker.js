/**
 * Ensures Metro/jest-worker child processes get enough heap (fixes OOM on Windows).
 * Re-run after: npm install
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'jest-worker',
  'build',
  'workers',
  'ChildProcessWorker.js'
);

if (!fs.existsSync(target)) {
  console.log('patch-jest-worker: jest-worker not found, skip');
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');
const needle = "execArgv: process.execArgv.filter(v => !/^--(debug|inspect)/.test(v)),";
const patched = `execArgv: [
        ...process.execArgv.filter(v => !/^--(debug|inspect)/.test(v)),
        '--max-old-space-size=8192',
      ],`;

if (src.includes("'--max-old-space-size=8192'")) {
  console.log('patch-jest-worker: already patched');
  process.exit(0);
}

if (!src.includes(needle)) {
  console.warn('patch-jest-worker: pattern not found, manual check needed');
  process.exit(0);
}

src = src.replace(needle, patched);
fs.writeFileSync(target, src);
console.log('patch-jest-worker: applied 8GB heap to worker processes');
