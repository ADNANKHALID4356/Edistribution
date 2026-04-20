#!/bin/bash

# ========================================
# Distribution System - Production Deployment Script
# For Linux/Ubuntu VPS Server
# ========================================

echo "========================================="
echo "Distribution System - Production Setup"
echo "========================================="
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
echo "✅ Node.js version:"
node --version
echo "✅ NPM version:"
npm --version

# Install MySQL
echo "📦 Installing MySQL Server..."
sudo apt install -y mysql-server

# Secure MySQL installation
echo "🔒 Please secure your MySQL installation..."
sudo mysql_secure_installation

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Navigate to application directory
echo "📂 Setting up application..."
cd /var/www/distribution_system || exit

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd desktop
npm install --production
cd ..

# Setup MySQL database
echo "🗄️  Setting up MySQL database..."
read -p "Enter MySQL root password: " -s MYSQL_ROOT_PASSWORD
echo ""

mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS distribution_system_db;
CREATE USER IF NOT EXISTS 'dist_admin'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON distribution_system_db.* TO 'dist_admin'@'localhost';
FLUSH PRIVILEGES;
EOF

# Copy environment file
echo "📝 Setting up environment configuration..."
cd backend
cp .env.example .env
echo "⚠️  IMPORTANT: Edit backend/.env with your database credentials"
echo "   Run: nano backend/.env"
echo ""

# Build frontend
echo "🔨 Building frontend application..."
cd ../desktop
npm run build
cd ..

# Setup PM2 to start on boot
echo "🚀 Configuring PM2..."
pm2 startup
pm2 save

# Setup Nginx (optional)
echo "🌐 Nginx configuration file created at: /etc/nginx/sites-available/distribution-system"
echo "   You need to manually enable it and configure SSL"
echo ""

echo "========================================="
echo "✅ Installation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your production settings"
echo "2. Import database schema: mysql -u dist_admin -p distribution_system_db < backend/database/create_db.sql"
echo "3. Start backend: cd backend && pm2 start server.js --name distribution-api"
echo "4. Setup Nginx reverse proxy (optional)"
echo "5. Configure SSL certificate (recommended)"
echo ""
echo "To start the application:"
echo "  cd backend && pm2 start server.js --name distribution-api"
echo ""
echo "To view logs:"
echo "  pm2 logs distribution-api"
echo ""
echo "To restart:"
echo "  pm2 restart distribution-api"
echo ""
