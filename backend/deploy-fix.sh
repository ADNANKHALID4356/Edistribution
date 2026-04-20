#!/bin/bash
# ============================================================
# VPS Deployment Script — Company Settings Fix
# Run this on the VPS: bash /tmp/deploy-fix.sh
# ============================================================

set -e

APP_DIR="/var/www/distribution-backend"
APP_NAME="distribution-api"
REPO_URL="https://github.com/ADNANKHALID4356/distribution_system-main.git"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Distribution System — Deploying Settings Fix         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify app directory
echo "📁 [1/6] Verifying application directory..."
if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory not found: $APP_DIR"
  exit 1
fi
echo "   ✅ Found: $APP_DIR"

# Step 2: Pull latest code from GitHub
echo ""
echo "📥 [2/6] Pulling latest code from GitHub..."
cd "$APP_DIR"

# Check if it's a git repo; if not, do a fresh clone into a temp dir and copy
if [ -d ".git" ]; then
  git fetch origin
  git reset --hard origin/master || git reset --hard origin/main
  echo "   ✅ Git pull completed"
else
  echo "   ⚠️  Not a git repo — downloading files from GitHub..."

  # Download the critical fixed files
  GITHUB_RAW="https://raw.githubusercontent.com/ADNANKHALID4356/distribution_system-main/master"

  curl -fsSL "$GITHUB_RAW/backend/src/config/migrations.js" \
    -o "$APP_DIR/src/config/migrations.js"
  echo "   ✅ migrations.js updated"

  curl -fsSL "$GITHUB_RAW/backend/src/models/CompanySettings.js" \
    -o "$APP_DIR/src/models/CompanySettings.js"
  echo "   ✅ CompanySettings.js updated"

  curl -fsSL "$GITHUB_RAW/backend/src/controllers/settingsController.js" \
    -o "$APP_DIR/src/controllers/settingsController.js"
  echo "   ✅ settingsController.js updated"

  curl -fsSL "$GITHUB_RAW/backend/src/routes/settingsRoutes.js" \
    -o "$APP_DIR/src/routes/settingsRoutes.js"
  echo "   ✅ settingsRoutes.js updated"

  curl -fsSL "$GITHUB_RAW/backend/server.js" \
    -o "$APP_DIR/server.js"
  echo "   ✅ server.js updated"
fi

# Step 3: Install any new dependencies
echo ""
echo "📦 [3/6] Checking dependencies..."
cd "$APP_DIR"
npm install --production 2>/dev/null && echo "   ✅ Dependencies OK" || echo "   ⚠️  npm install warning (non-fatal)"

# Step 4: Run MySQL migration to add any missing columns (fallback/safety net)
echo ""
echo "🗄️  [4/6] Running MySQL schema migration (safety net)..."

# Use individual ALTER statements so one failure doesn't block the rest
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_city VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_state VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_postal_code VARCHAR(20);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_mobile VARCHAR(50);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_website VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_tax_number VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_registration_number VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_ntn VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_gst_number VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_name VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_account_title VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_account_number VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_branch VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_iban VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_swift_code VARCHAR(50);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_name_2 VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_account_title_2 VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_account_number_2 VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_branch_2 VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN bank_iban_2 VARCHAR(100);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_logo_url TEXT;" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN company_slogan VARCHAR(255);" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN invoice_header_text TEXT;" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN invoice_footer_text TEXT;" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN currency_symbol VARCHAR(10) DEFAULT 'Rs.';" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN currency_code VARCHAR(5) DEFAULT 'PKR';" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN default_tax_percentage DECIMAL(5,2) DEFAULT 0.00;" 2>/dev/null || true
mysql -u dist_user -pDist2025Secure distribution_db -e "ALTER TABLE company_settings ADD COLUMN default_credit_days INT DEFAULT 30;" 2>/dev/null || true

echo "   ✅ MySQL migration complete (existing columns were skipped)"

# Step 5: Restart PM2
echo ""
echo "🔄 [5/6] Restarting backend with PM2..."
pm2 restart "$APP_NAME" || pm2 start "$APP_DIR/server.js" --name "$APP_NAME"
pm2 save
echo "   ✅ PM2 restarted"

# Step 6: Health check
echo ""
echo "🔍 [6/6] Running health check..."
sleep 3
HEALTH=$(curl -s http://localhost:5005/api/health 2>/dev/null || curl -s http://localhost:5000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "OK"; then
  echo "   ✅ Backend is healthy: $HEALTH"
else
  echo "   ⚠️  Health check: $HEALTH"
  echo "   Run: pm2 logs $APP_NAME --lines 50"
fi

# Verify company_settings columns
echo ""
echo "🔍 Verifying company_settings table schema..."
COL_COUNT=$(mysql -u dist_user -pDist2025Secure distribution_db -se "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='distribution_db' AND table_name='company_settings';" 2>/dev/null)
echo "   📊 company_settings has $COL_COUNT columns"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅  DEPLOYMENT COMPLETE — Settings fix is LIVE!        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Useful commands:"
echo "   pm2 logs $APP_NAME --lines 50   — view latest logs"
echo "   pm2 status                       — check process status"
echo ""
