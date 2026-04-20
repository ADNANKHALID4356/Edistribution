#!/bin/bash
# VPS Deployment Script for Distribution Management System
# Run this script on your Hostinger VPS

set -e  # Exit on any error

echo "🚀 Distribution System - VPS Deployment"
echo "========================================"

# Configuration
APP_DIR="/var/www/distribution-backend"
APP_NAME="distribution-api"
DB_NAME="distribution_db"
DB_USER="distribution_user"

echo ""
echo "📋 Pre-deployment Checklist:"
echo "- [ ] Node.js 18.x installed"
echo "- [ ] MySQL installed"
echo "- [ ] PM2 installed globally"
echo "- [ ] Backend files uploaded to $APP_DIR"
echo "- [ ] .env.production file configured"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Step 1: Navigate to app directory
echo ""
echo "📁 Step 1: Navigating to app directory..."
cd $APP_DIR || { echo "❌ Directory not found: $APP_DIR"; exit 1; }
echo "✅ Current directory: $(pwd)"

# Step 2: Install dependencies
echo ""
echo "📦 Step 2: Installing dependencies..."
npm install --production
echo "✅ Dependencies installed"

# Step 3: Check database exists
echo ""
echo "🗄️ Step 3: Checking database..."
read -sp "Enter MySQL root password: " MYSQL_ROOT_PASSWORD
echo ""

mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE $DB_NAME; SELECT 'Database exists' AS status;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ Database not found. Creating..."
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY 'ChangeMeSecure123!';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    echo "✅ Database created"
else
    echo "✅ Database exists"
fi

# Step 4: Import schema if tables don't exist
echo ""
echo "🗄️ Step 4: Checking database schema..."
TABLE_COUNT=$(mysql -u root -p"$MYSQL_ROOT_PASSWORD" -D $DB_NAME -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';")
if [ "$TABLE_COUNT" -eq 0 ]; then
    echo "⚠️ No tables found. Importing schema..."
    
    # Import base schema
    if [ -f "database/create_db.sql" ]; then
        mysql -u root -p"$MYSQL_ROOT_PASSWORD" $DB_NAME < database/create_db.sql
        echo "✅ Base schema imported"
    fi
    
    # Import migrations
    if [ -d "database/migrations" ]; then
        for file in database/migrations/*.sql; do
            if [ -f "$file" ]; then
                echo "   Importing $(basename $file)..."
                mysql -u root -p"$MYSQL_ROOT_PASSWORD" $DB_NAME < "$file" 2>/dev/null || true
            fi
        done
        echo "✅ Migrations imported"
    fi
    
    # Import seed data
    if [ -f "database/seeds.sql" ]; then
        read -p "Import seed data (creates admin user)? (y/n): " IMPORT_SEEDS
        if [ "$IMPORT_SEEDS" = "y" ]; then
            mysql -u root -p"$MYSQL_ROOT_PASSWORD" $DB_NAME < database/seeds.sql
            echo "✅ Seed data imported"
            echo "   Login: admin / admin123"
        fi
    fi
else
    echo "✅ Database has $TABLE_COUNT tables"
fi

# Step 5: Check firewall
echo ""
echo "🔥 Step 5: Checking firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | grep "5000/tcp" || echo "not found")
    if [[ "$UFW_STATUS" == *"ALLOW"* ]]; then
        echo "✅ Port 5000 is open"
    else
        echo "⚠️ Port 5000 not open in firewall"
        read -p "Open port 5000? (y/n): " OPEN_PORT
        if [ "$OPEN_PORT" = "y" ]; then
            ufw allow 5000/tcp
            ufw reload
            echo "✅ Port 5000 opened"
        fi
    fi
else
    echo "⚠️ UFW not installed, skipping firewall check"
fi

# Step 6: Start/Restart with PM2
echo ""
echo "🚀 Step 6: Starting application with PM2..."
pm2 describe $APP_NAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   Application already running, restarting..."
    pm2 restart $APP_NAME
else
    echo "   Starting new application..."
    pm2 start server.js --name $APP_NAME
fi

pm2 save
echo "✅ Application started"

# Step 7: Test health endpoint
echo ""
echo "🔍 Step 7: Testing health endpoint..."
sleep 3
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health || echo "failed")
if [[ "$HEALTH_RESPONSE" == *"OK"* ]]; then
    echo "✅ Backend is responding correctly"
else
    echo "❌ Backend health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Step 8: Display information
echo ""
echo "========================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Access Information:"
echo "   Health Check: http://localhost:5000/api/health"
echo ""
echo "   External Access:"
VPS_IP=$(curl -s ifconfig.me || echo "Unknown")
echo "   http://$VPS_IP:5000/api/health"
echo ""
echo "📱 Configure Clients:"
echo "   Desktop App → Server Settings:"
echo "     Host: $VPS_IP"
echo "     Port: 5000"
echo "     Protocol: http"
echo ""
echo "   Mobile App → Server Settings:"
echo "     Host: $VPS_IP"
echo "     Port: 5000"
echo ""
echo "🔐 Default Login (if seed data imported):"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📋 Useful Commands:"
echo "   View Logs:    pm2 logs $APP_NAME"
echo "   Restart:      pm2 restart $APP_NAME"
echo "   Stop:         pm2 stop $APP_NAME"
echo "   Status:       pm2 status"
echo ""
echo "⚠️ IMPORTANT: Change default passwords!"
echo "========================================"
