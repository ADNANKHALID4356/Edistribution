const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'desktop/src/pages/orders/OrderManagementPage.js',
  'desktop/src/pages/delivery/DeliveryTrackingPage.js',
  'desktop/src/pages/products/AddProductPage.js',
  'desktop/src/pages/products/EditProductPage.js',
  'desktop/src/pages/products/BulkImportPage.js',
  'desktop/src/pages/routes/RouteManagementPage.js',
  'desktop/src/pages/salesmen/AddEditSalesmanPage.js',
  'desktop/src/pages/salesmen/SalesmanListingPage.js',
  'desktop/src/pages/shops/AddEditShopPage.js',
  'desktop/src/pages/shops/ShopListingPage.js',
  'desktop/src/pages/delivery/LoadSheetPage.js'
];

filesToProcess.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip if already processed
  if (content.includes('const { showToast } = useToast()')) {
    console.log(`Skipping ${filePath} (already processed)`);
    return;
  }

  // Calculate relative path to context
  const depth = filePath.split('/').length - 3; // 'desktop/src/' is 2, plus filename is 1
  let relativePath = '';
  if (depth === 1) relativePath = '../context/ToastContext';
  else if (depth === 2) relativePath = '../../context/ToastContext';
  else if (depth === 3) relativePath = '../../../context/ToastContext';

  // 1. Add import
  if (!content.includes(`import { useToast }`)) {
    content = content.replace(/(import React.*?;\n)/, `$1import { useToast } from '${relativePath}';\n`);
  }

  // 2. Add useToast hook inside the component
  const componentMatch = content.match(/(const \w+ = \([^)]*\) => \{|function \w+\([^)]*\) \{)/);
  if (componentMatch) {
    content = content.replace(componentMatch[0], `${componentMatch[0]}\n  const { showToast } = useToast();`);
  }

  // 3. Remove state for error and success
  content = content.replace(/const \[error, setError\] = useState\((?:''|null|""|false)?\);\n?/g, '');
  content = content.replace(/const \[success, setSuccess\] = useState\((?:''|null|""|false)?\);\n?/g, '');

  content = content.replace(/const \[error, setError\] = useState<string \| null>\(null\);\n?/g, '');

  // 4. Replace setSuccess and setError calls
  content = content.replace(/setError\(([^)]+)\)/g, (match, p1) => {
    if (p1.trim() === "''" || p1.trim() === '""' || p1.trim() === 'null') return ''; // remove clearing state
    return `showToast(${p1}, 'error')`;
  });
  
  content = content.replace(/setSuccess\(([^)]+)\)/g, (match, p1) => {
    if (p1.trim() === "''" || p1.trim() === '""' || p1.trim() === 'null') return '';
    return `showToast(${p1}, 'success')`;
  });

  // Handle leftovers from clearing states e.g., if we had multi-line `setError('');` -> `` which might leave empty semi-colons
  content = content.replace(/;\s*;\n/g, ';\n');

  // 5. Remove the DOM elements
  // We use regex to match {/* Error Alert */} until the closing )}
  content = content.replace(/\{\/\*\s*Error Alert\s*\*\/\}\s*\{error && \([\s\S]*?\)\}/g, '');
  content = content.replace(/\{\/\*\s*Success Alert\s*\*\/\}\s*\{success && \([\s\S]*?\)\}/g, '');

  fs.writeFileSync(fullPath, content);
  console.log(`Processed ${filePath}`);
});
