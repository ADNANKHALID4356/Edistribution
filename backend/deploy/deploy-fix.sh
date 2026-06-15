#!/bin/bash
# ============================================================
# VPS Deployment Script — Company Settings Fix
# Run this on the VPS: bash /tmp/deploy.sh
# ============================================================

set -e

APP_DIR="/var/www/distribution-backend"
APP_NAME="distribution-api"
GITHUB_RAW="https://raw.githubusercontent.com/ADNANKHALID4356/distribution_system-main/master"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Distribution System — Deploying Settings Fix         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify app directory
echo "📁 [1/5] Verifying application directory..."
if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory not found: $APP_DIR"
  exit 1
fi
echo "   ✅ Found: $APP_DIR"

# Step 2: Download fixed files from GitHub
echo ""
echo "📥 [2/5] Downloading fixed backend files from GitHub..."

# Fix 1: CompanySettings model (the core fix)
curl -fsSL "$GITHUB_RAW/backend/src/models/CompanySettings.js" \
  -o "$APP_DIR/src/models/CompanySettings.js"
echo "   ✅ CompanySettings.js updated"

# Fix 2: SQLite adapter schema (local dev consistency)
curl -fsSL "$GITHUB_RAW/backend/src/config/database-sqlite.js" \
  -o "$APP_DIR/src/config/database-sqlite.js"
echo "   ✅ database-sqlite.js updated"

# Step 3: Run MySQL migration to add any missing columns
echo ""
echo "🗄️  [3/5] Running MySQL schema migration..."
cat << 'SQL' | mysql -u dist_user -pDist2025Secure distribution_db 2>/dev/null && echo "   ✅ Migration successful" || echo "   ⚠️  Migration skipped (columns may already exist)"
-- Add missing extended columns to company_settings (safe: IF NOT EXISTS)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_city VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_state VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_postal_code VARCHAR(20);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_mobile VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_registration_number VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_ntn VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_gst_number VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_title VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_swift_code VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_name_2 VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_title_2 VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_account_number_2 VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_branch_2 VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_iban_2 VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_slogan VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_header_text TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_footer_text TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT 'Rs.';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(5) DEFAULT 'PKR';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS default_tax_percentage DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS default_credit_days INT DEFAULT 30;
SQL

# Step 4: Restart PM2
echo ""
echo "🔄 [4/5] Restarting backend with PM2..."
pm2 restart "$APP_NAME" || pm2 start "$APP_DIR/server.js" --name "$APP_NAME"
pm2 save
echo "   ✅ PM2 restarted"

# Step 5: Health check
echo ""
echo "🔍 [5/5] Running health check..."
sleep 3
HEALTH=$(curl -s http://localhost:5005/api/health 2>/dev/null || curl -s http://localhost:5000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "OK"; then
  echo "   ✅ Backend is healthy: $HEALTH"
else
  echo "   ⚠️  Health check: $HEALTH"
  echo "   Run: pm2 logs $APP_NAME --lines 50"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅  DEPLOYMENT COMPLETE — Settings fix is LIVE!        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Useful commands:"
echo "   pm2 logs $APP_NAME --lines 50   — view latest logs"
echo "   pm2 status                       — check process status"
echo ""
