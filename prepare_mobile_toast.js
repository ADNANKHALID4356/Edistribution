const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'mobile/src/screens/ShopListingScreen.js',
  'mobile/src/screens/ShopDetailScreen.js',
  'mobile/src/screens/ServerConfigScreen.js',
  'mobile/src/screens/QuickOrderScreen.js',
  'mobile/src/screens/ProductSelectionScreen.js'
];

filesToUpdate.forEach(filePath => {
  let fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Insert import if needed
  if (!content.includes("from '../context/ToastContext'")) {
    // Find last import
    content = content.replace(/(import .*;\n)(?!import )/, `$1import { useToast } from '../context/ToastContext';\n`);
  }

  // Insert hook inside component
  const compRegex = /(const \w+Screen = \([^)]*\) => \{)/;
  if (compRegex.test(content) && !content.includes('const { showToast } = useToast();')) {
    content = content.replace(compRegex, `$1\n  const { showToast } = useToast();`);
  }

  fs.writeFileSync(fullPath, content);
  console.log(`Prepared ${filePath}`);
});
