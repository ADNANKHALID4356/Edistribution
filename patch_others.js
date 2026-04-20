const fs = require('fs');

function patch(file, regex, replaceStr) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(regex, replaceStr);
  fs.writeFileSync(file, c);
}

// QuickOrderScreen
let qos = 'mobile/src/screens/QuickOrderScreen.js';
patch(qos, /Alert\.alert\(\s*'Error',\s*'Failed to load shops\. Please try again\.'\s*\);/, "showToast('Failed to load shops. Please try again.', 'error');");

// ProductSelectionScreen
let pss = 'mobile/src/screens/ProductSelectionScreen.js';
patch(pss, /Alert\.alert\(\s*'Success',\s*result\.message\s*\);/, "showToast(result.message, 'success');");
patch(pss, /Alert\.alert\(\s*'Sync Failed',\s*result\.message\s*\);/, "showToast(result.message, 'error');");
patch(pss, /Alert\.alert\(\s*'Sync Error',\s*'Failed to sync products from server\. Please check your internet connection and try again\.'\s*\);/, "showToast('Failed to sync products from server.', 'error');");
patch(pss, /Alert\.alert\(\s*'Empty Cart',\s*'Please add at least one product to proceed',\s*\[\{ text: 'OK' \}\]\s*\);/, "showToast('Please add at least one product to proceed', 'warning');");

console.log("Patched other files!");
