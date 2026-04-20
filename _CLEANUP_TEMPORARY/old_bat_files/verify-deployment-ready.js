const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('\n==========================================');
console.log('  Distribution System - Pre-Deploy Check');
console.log('==========================================\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Verify .gitignore exists
console.log('📋 Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  if (gitignoreContent.includes('.env') && 
      gitignoreContent.includes('node_modules') && 
      gitignoreContent.includes('*.db')) {
    console.log('✅ .gitignore properly configured\n');
  } else {
    console.log('⚠️  .gitignore may be missing important entries\n');
    hasWarnings = true;
  }
} else {
  console.log('❌ .gitignore not found!\n');
  hasErrors = true;
}

// Check 2: Verify .env files are NOT present (should not be committed)
console.log('🔐 Checking for sensitive files...');
const sensitiveFiles = [
  'backend/.env',
  'desktop/.env',
  'mobile/.env'
];

let foundSensitive = false;
sensitiveFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`❌ FOUND: ${file} - This should NOT be committed!`);
    foundSensitive = true;
    hasErrors = true;
  }
});

if (!foundSensitive) {
  console.log('✅ No .env files found (good - they should not be committed)\n');
} else {
  console.log('');
}

// Check 3: Verify .env.example files exist
console.log('📝 Checking for .env.example files...');
const exampleFiles = [
  { path: 'backend/.env.example', required: true },
  { path: 'desktop/.env.example', required: true },
  { path: 'mobile/.env.example', required: false }
];

exampleFiles.forEach(({ path: filePath, required }) => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${filePath} found`);
  } else {
    if (required) {
      console.log(`❌ ${filePath} missing (REQUIRED)`);
      hasErrors = true;
    } else {
      console.log(`⚠️  ${filePath} missing (optional)`);
      hasWarnings = true;
    }
  }
});
console.log('');

// Check 4: Verify database files are not present
console.log('🗄️  Checking for database files...');
const dbFiles = [
  'backend/data/*.db',
  'backend/data/*.sqlite',
  'backend/data/*.sqlite3'
];

let foundDbFiles = false;
if (fs.existsSync('backend/data')) {
  const files = fs.readdirSync('backend/data');
  files.forEach(file => {
    if (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('.sqlite3')) {
      console.log(`⚠️  Found database file: backend/data/${file}`);
      foundDbFiles = true;
      hasWarnings = true;
    }
  });
}

if (!foundDbFiles) {
  console.log('✅ No database files found in backend/data\n');
} else {
  console.log('   (These should be in .gitignore and not committed)\n');
}

// Check 5: Verify node_modules is not tracked
console.log('📦 Checking node_modules...');
const checkNodeModules = (dir) => {
  const nodeModulesPath = path.join(dir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`⚠️  ${dir}/node_modules exists (should be in .gitignore)`);
    hasWarnings = true;
    return true;
  }
  return false;
};

let foundNodeModules = false;
['backend', 'desktop', 'mobile'].forEach(dir => {
  if (checkNodeModules(dir)) {
    foundNodeModules = true;
  }
});

if (!foundNodeModules) {
  console.log('✅ No node_modules directories found\n');
} else {
  console.log('   (node_modules should be in .gitignore)\n');
}

// Check 6: Verify production documentation exists
console.log('📚 Checking documentation...');
const docsToCheck = [
  'README.md',
  'PRODUCTION_DEPLOYMENT.md',
  'QUICK_START.md'
];

docsToCheck.forEach(doc => {
  if (fs.existsSync(doc)) {
    console.log(`✅ ${doc} found`);
  } else {
    console.log(`⚠️  ${doc} missing`);
    hasWarnings = true;
  }
});
console.log('');

// Check 7: Generate new JWT secret suggestion
console.log('🔑 JWT Secret Generation...');
const newSecret = crypto.randomBytes(32).toString('hex');
console.log('💡 Use this for JWT_SECRET in production .env:');
console.log(`   ${newSecret}\n`);

// Check 8: Verify package.json files
console.log('📄 Checking package.json files...');
['backend/package.json', 'desktop/package.json'].forEach(pkgPath => {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    console.log(`✅ ${pkgPath} - ${pkg.name} v${pkg.version}`);
  } else {
    console.log(`❌ ${pkgPath} missing`);
    hasErrors = true;
  }
});
console.log('');

// Check 9: Backend configuration check
console.log('⚙️  Backend Configuration Check...');
const serverJsPath = 'backend/server.js';
if (fs.existsSync(serverJsPath)) {
  const serverContent = fs.readFileSync(serverJsPath, 'utf8');
  
  if (serverContent.includes('process.env.CORS_ORIGIN')) {
    console.log('✅ CORS configured to use environment variables');
  } else {
    console.log('⚠️  CORS may not be properly configured');
    hasWarnings = true;
  }
  
  if (serverContent.includes('process.env.DB_HOST')) {
    console.log('✅ Database configured to use environment variables');
  } else {
    console.log('⚠️  Database config may need environment variables');
    hasWarnings = true;
  }
} else {
  console.log('❌ backend/server.js not found');
  hasErrors = true;
}
console.log('');

// Check 10: Desktop app configuration
console.log('🖥️  Desktop App Configuration Check...');
if (fs.existsSync('desktop/.env.example')) {
  const desktopEnvExample = fs.readFileSync('desktop/.env.example', 'utf8');
  if (desktopEnvExample.includes('REACT_APP_API_URL')) {
    console.log('✅ Desktop app has API URL configuration');
  } else {
    console.log('⚠️  Desktop app may be missing API URL config');
    hasWarnings = true;
  }
} else {
  console.log('⚠️  desktop/.env.example not found');
  hasWarnings = true;
}
console.log('');

// Final Summary
console.log('==========================================');
console.log('  Summary');
console.log('==========================================\n');

if (!hasErrors && !hasWarnings) {
  console.log('✅ All checks passed! Your app is ready for GitHub and production deployment.\n');
  console.log('Next steps:');
  console.log('1. Run: push-to-github.bat (Windows) or ./push-to-github.sh (Linux/Mac)');
  console.log('2. After pushing, follow PRODUCTION_DEPLOYMENT.md for server setup');
  console.log('3. Configure .env files on the server with production values\n');
} else {
  if (hasErrors) {
    console.log('❌ ERRORS FOUND - Fix these before deploying:\n');
  }
  if (hasWarnings) {
    console.log('⚠️  WARNINGS - Review these items:\n');
  }
  console.log('Please address the issues above before pushing to GitHub.\n');
}

console.log('==========================================\n');

// Exit with error code if there are errors
process.exit(hasErrors ? 1 : 0);
