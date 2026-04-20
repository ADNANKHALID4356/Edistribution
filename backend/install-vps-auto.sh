#!/bin/bash
# One-Click VPS Setup Script
# Run this script on a fresh VPS to install everything automatically
# Usage: bash install-all.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Distribution Management System - VPS Auto-Installer      ║"
echo "║   This will install everything needed for the backend      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root: sudo bash $0"
    exit 1
fi

# Get configuration from user
echo "📝 Configuration Setup"
echo "====================="
read -p "Enter database password (min 12 chars): " DB_PASSWORD
read -p "Enter your VPS domain (or press Enter to use IP): " VPS_DOMAIN

if [ -z "$VPS_DOMAIN" ]; then
    VPS_IP=$(curl -s ifconfig.me)
    VPS_DOMAIN=$VPS_IP
    echo "   Using IP: $VPS_IP"
fi

echo ""
echo "🚀 Starting installation..."
echo ""

# Update system
echo "📦 [1/8] Updating system packages..."
apt update -qq && apt upgrade -y -qq

# Install Node.js
echo "📦 [2/8] Installing Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
echo "   ✅ Node.js $(node --version) installed"

# Install MySQL
echo "📦 [3/8] Installing MySQL..."
if ! command -v mysql &> /dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi
echo "   ✅ MySQL installed"

# Install PM2
echo "📦 [4/8] Installing PM2..."
npm install -g pm2 --silent
echo "   ✅ PM2 $(pm2 --version) installed"

# Install Nginx (optional)
echo "📦 [5/8] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
echo "   ✅ Nginx installed"

# Configure MySQL
echo "🗄️ [6/8] Configuring MySQL database..."

# Secure MySQL (automated)
mysql -e "DELETE FROM mysql.user WHERE User='';"
mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -e "DROP DATABASE IF EXISTS test;"
mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
mysql -e "FLUSH PRIVILEGES;"

# Create database and user
mysql <<EOF
CREATE DATABASE IF NOT EXISTS distribution_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'distribution_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON distribution_db.* TO 'distribution_user'@'localhost';
FLUSH PRIVILEGES;
EOF
echo "   ✅ Database 'distribution_db' created"
echo "   ✅ User 'distribution_user' created"

# Create application directory
echo "📁 [7/8] Creating application directory..."
mkdir -p /var/www/distribution-backend
echo "   ✅ Directory created: /var/www/distribution-backend"

# Configure firewall
echo "🔥 [8/8] Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp  # SSH
    ufw allow 80/tcp  # HTTP
    ufw allow 443/tcp # HTTPS
    ufw allow 5000/tcp # Backend API
    ufw --force reload
    echo "   ✅ Firewall configured"
else
    echo "   ⚠️ UFW not available, skipping firewall config"
fi

# Create .env.production template
echo ""
echo "📝 Creating .env.production template..."
cat > /var/www/distribution-backend/.env.production <<EOF
# Production Configuration
DB_HOST=localhost
DB_USER=distribution_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=distribution_db
DB_PORT=3306

PORT=5000
NODE_ENV=production

JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE=7d

COMPANY_NAME=Ummahtechinnovations
COMPANY_WEBSITE=ummahtechinnovations.com
CORS_ORIGIN=*
EOF
echo "   ✅ Configuration file created"

# Create startup script
cat > /var/www/distribution-backend/start.sh <<'EOF'
#!/bin/bash
cd /var/www/distribution-backend
npm install --production
pm2 start server.js --name distribution-api
pm2 save
EOF
chmod +x /var/www/distribution-backend/start.sh

# Create README for next steps
cat > /var/www/distribution-backend/README.txt <<EOF
╔════════════════════════════════════════════════════════════╗
║            NEXT STEPS TO COMPLETE DEPLOYMENT               ║
╚════════════════════════════════════════════════════════════╝

Installation Complete! ✅

NEXT STEPS:
-----------

1. Upload your backend files:
   - Upload backend.zip to /var/www/distribution-backend/
   - Extract: unzip backend.zip
   - Or use SCP: scp -r backend/* root@$VPS_DOMAIN:/var/www/distribution-backend/

2. Import database schema:
   cd /var/www/distribution-backend
   mysql -u distribution_user -p distribution_db < database/create_db.sql
   mysql -u distribution_user -p distribution_db < database/seeds.sql

3. Install dependencies and start:
   cd /var/www/distribution-backend
   npm install --production
   pm2 start server.js --name distribution-api
   pm2 save
   pm2 startup

4. Test backend:
   curl http://localhost:5000/api/health
   curl http://$VPS_DOMAIN:5000/api/health

5. Configure your apps:
   Desktop: Settings → Server: $VPS_DOMAIN:5000
   Mobile: Settings → Server: $VPS_DOMAIN:5000

CONFIGURATION:
--------------
Database: distribution_db
User: distribution_user
Password: $DB_PASSWORD
API Port: 5000

USEFUL COMMANDS:
----------------
View logs:    pm2 logs distribution-api
Restart:      pm2 restart distribution-api
Stop:         pm2 stop distribution-api
Status:       pm2 status

Access:       http://$VPS_DOMAIN:5000/api
Health:       http://$VPS_DOMAIN:5000/api/health

Default Login (after seed data):
Username: admin
Password: admin123

╔════════════════════════════════════════════════════════════╗
║  ⚠️ SECURITY: Change default passwords after first login! ║
╚════════════════════════════════════════════════════════════╝
EOF

# Display summary
clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  INSTALLATION COMPLETE! ✅                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Installation Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo "✅ MySQL $(mysql --version | awk '{print $5}' | sed 's/,//')"
echo "✅ PM2 $(pm2 --version)"
echo "✅ Nginx $(nginx -v 2>&1 | awk '{print $3}')"
echo ""
echo "🗄️ Database Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Database: distribution_db"
echo "   User: distribution_user"
echo "   Password: $DB_PASSWORD"
echo ""
echo "📂 Application Directory:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   /var/www/distribution-backend"
echo ""
echo "🌐 Network Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Domain/IP: $VPS_DOMAIN"
echo "   API Port: 5000"
echo "   API URL: http://$VPS_DOMAIN:5000/api"
echo ""
echo "📋 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Upload your backend files to: /var/www/distribution-backend/"
echo "2. Extract and install: cd /var/www/distribution-backend && unzip backend.zip"
echo "3. Import database: mysql -u distribution_user -p distribution_db < database/create_db.sql"
echo "4. Start backend: pm2 start server.js --name distribution-api"
echo "5. Test: curl http://$VPS_DOMAIN:5000/api/health"
echo ""
echo "📖 Full instructions saved to:"
echo "   /var/www/distribution-backend/README.txt"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Ready for backend file upload! 📦                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
