#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

console.log('🚀 Starting Distribution System Backend...');
console.log('📂 Running in standalone/production mode');

// Load production environment variables
// Look for .env.production first, fallback to .env
const envProdPath = path.join(__dirname, '.env.production');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envProdPath)) {
  const result = dotenv.config({ path: envProdPath });
  if (result.error) {
    console.error('❌ Error loading .env.production:', result.error.message);
    console.log('⚠️  Falling back to .env');
    dotenv.config({ path: envPath });
  } else {
    console.log('✅ Loaded production configuration (.env.production)');
  }
} else {
  console.warn('⚠️  .env.production not found, using .env');
  dotenv.config({ path: envPath });
}

// Set production mode (DO NOT set USE_SQLITE - let it use MySQL)
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

console.log(`📊 Database Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`📊 Database Name: ${process.env.DB_NAME || 'distribution_system_db'}`);
console.log(`🌐 Server Port: ${process.env.PORT}`);
console.log(`📍 Working directory: ${process.cwd()}`);
console.log(`📍 Executable directory: ${path.dirname(process.execPath)}`);

// Start the main server (will use MySQL from .env.production)
require('./server.js');
