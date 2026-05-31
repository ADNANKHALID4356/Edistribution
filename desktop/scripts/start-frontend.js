/**
 * Start CRA dev server with lower memory use (no separate npm shell).
 * Usage: node --max-old-space-size=4096 scripts/start-frontend.js
 */
const path = require('path');

process.env.BROWSER = 'none';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.FAST_REFRESH = 'false';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.PORT = process.env.PORT || '3000';

const startScript = path.join(__dirname, '..', 'node_modules', 'react-scripts', 'scripts', 'start.js');
require(startScript);
