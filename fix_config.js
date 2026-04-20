const fs = require('fs');
const path = 'desktop/src/utils/serverConfig.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("host: '147.93.108.205', // VPS Production Server", "host: 'localhost', // Local Development Server");
content = content.replace("port: '5005',           // Backend API port", "port: '5000',           // Backend API port");
content = content.replace(/CURRENT_CONFIG_VERSION\s*=\s*\d+;/, 'CURRENT_CONFIG_VERSION = ' + Date.now() + ';');

fs.writeFileSync(path, content);
console.log("Updated serverConfig.js successfully");