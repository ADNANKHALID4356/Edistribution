const fs = require('fs');
const path = 'desktop/src/utils/serverConfig.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("host: 'localhost', // Local Development Server", "host: '147.93.108.205', // VPS Production Server");
content = content.replace("port: '5000',           // Backend API port", "port: '5005',           // Backend API port");

fs.writeFileSync(path, content);
console.log("Restored serverConfig.js successfully");