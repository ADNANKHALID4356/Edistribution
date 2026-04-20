const fs = require('fs');

const file = 'mobile/src/screens/ServerConfigScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Replace standard alerts (without buttons inside the options array, except single OK maybe)
content = content.replace(/Alert\.alert\(\s*'Validation Error',\s*'Please enter both host and port'\s*\);/, "showToast('Please enter both host and port', 'warning');");

content = content.replace(/Alert\.alert\(\s*'Error',\s*'Failed to save configuration: '\s*\+\s*result\.error\s*\);/, "showToast('Failed to save configuration: ' + result.error, 'error');");

content = content.replace(/Alert\.alert\(\s*'✅ Connection Successful'[\s\S]*?\[\{ text: 'OK' \}\]\s*\);/, "showToast('✅ Connection Successful! Server is reachable.', 'success');");
content = content.replace(/Alert\.alert\(\s*'❌ Connection failed'[\s\S]*?\[\{ text: 'OK' \}\]\s*\);/, "showToast('❌ Connection failed. Check details.', 'error');");
content = content.replace(/Alert\.alert\(\s*'Success'[\s\S]*?\[\{\s*text: 'OK'[\s\S]*?\}\]\s*\);/, "showToast('Settings saved successfully and applied.', 'success');");

fs.writeFileSync(file, content);
