# Distribution Management System - Production Deployment Guide

## 📋 Overview
This guide will help you deploy the Distribution Management System to your production server.

## 🚀 Deployment Options

### Option 1: Web Browser Access (Recommended for most clients)
- Clients access via web browser at `https://yourdomain.com`
- No installation required
- Works on any device (PC, tablet, mobile)
- Always up to date

### Option 2: Desktop Application
- Standalone Windows application
- Better for offline work
- Native desktop experience
- Requires installation on each PC

---

## 📦 Pre-Deployment Checklist

### 1. Update Configuration Files

#### Backend Configuration (`backend/.env`)
```bash
NODE_ENV=production
PORT=5000
USE_SQLITE=false
DB_HOST=localhost
DB_NAME=distribution_system
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=generate_new_random_secret_here
CORS_ORIGIN=https://yourdomain.com
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Desktop App Configuration (`desktop/.env`)
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_NAME=Your Company Name - Distribution System
```

### 2. Update Server Configuration

Edit `backend/server.js` - The CORS and database settings are already configured to use environment variables.

### 3. Prepare Database

The system will use **MySQL/MariaDB** in production (SQLite is only for development).

---

## 🌐 Server Deployment Steps

### Step 1: Prepare Your Server

**Minimum Requirements:**
- Ubuntu 20.04+ or CentOS 7+
- Node.js 18+ 
- MySQL 8.0+ or MariaDB 10.6+
- Nginx or Apache
- 2GB RAM minimum
- 20GB storage

### Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 3: Setup Database

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE distribution_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dist_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON distribution_system.* TO 'dist_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Clone and Setup Application

```bash
# Navigate to web directory
cd /var/www

# Clone from GitHub
sudo git clone https://github.com/yourusername/distribution_system.git
cd distribution_system

# Set permissions
sudo chown -R $USER:$USER /var/www/distribution_system

# Setup Backend
cd backend
cp .env.example .env
nano .env  # Update with your actual values
npm install --production

# Initialize Database
node -e "require('./src/config/database-mysql').initializeDatabase()"

# Test backend
npm start
```

### Step 5: Build Desktop App for Production

```bash
# On your local development machine
cd desktop
npm install
npm run build

# The build folder contains your production web app
# Upload this to your server
```

### Step 6: Configure PM2 (Backend Process Manager)

```bash
cd /var/www/distribution_system/backend

# Start backend with PM2
pm2 start server.js --name "distribution-backend" --node-args="--max-old-space-size=2048"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs distribution-backend
```

### Step 7: Configure Nginx

Create `/etc/nginx/sites-available/distribution`:

```nginx
# Backend API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Frontend Web App
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/distribution_system/desktop/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/distribution /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Setup SSL (HTTPS) with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Step 9: Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

---

## 🖥️ Desktop Application Distribution

### Build Windows Desktop App

On your development machine:

```bash
cd desktop
npm install
npm run build:desktop

# The installer will be in desktop/dist/
# File: Distribution-System-Setup-1.0.0.exe
```

### Distribution Options:

1. **Direct Download**
   - Upload installer to your server
   - Clients download from `https://yourdomain.com/download/setup.exe`

2. **USB Installation**
   - Copy installer to USB drives
   - Distribute to clients

3. **Network Share**
   - Place on company network share
   - Clients install from network

### Desktop App Configuration

After installation, clients need to configure the server URL:
1. Open the app
2. Go to Settings
3. Enter server URL: `https://api.yourdomain.com`
4. Save and restart

---

## 🔧 Post-Deployment Tasks

### 1. Create Admin User

```bash
# On server, access MySQL
mysql -u dist_user -p distribution_system

# Create admin account (password will be hashed by app)
INSERT INTO roles (role_name, description, permissions) VALUES 
('Admin', 'System Administrator', '["all"]');

# You can now login via the web interface and create the first admin user
```

### 2. Setup Automated Backups

Create `/usr/local/bin/backup-distribution.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/distribution"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u dist_user -p'your_password' distribution_system > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/distribution_system/backend/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-distribution.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-distribution.sh
```

### 3. Setup Monitoring

```bash
# Monitor with PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View logs
pm2 logs distribution-backend
```

### 4. Performance Tuning

Edit `backend/.env`:
```bash
DB_CONNECTION_LIMIT=20
NODE_OPTIONS=--max-old-space-size=4096
```

---

## 🔄 Update Deployment Process

### Update Backend

```bash
cd /var/www/distribution_system
git pull origin main

cd backend
npm install --production

# Run migrations if any
# node migrations/run.js

pm2 restart distribution-backend
```

### Update Frontend

```bash
# On local machine, build new version
cd desktop
npm run build

# Upload to server
scp -r build/* user@server:/var/www/distribution_system/desktop/build/

# Clear browser cache for clients
```

---

## 🐛 Troubleshooting

### Backend not starting

```bash
pm2 logs distribution-backend --lines 50
# Check for database connection errors
mysql -u dist_user -p -e "SHOW DATABASES;"
```

### Database connection failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u dist_user -p distribution_system -e "SELECT 1;"

# Check .env configuration
cat backend/.env | grep DB_
```

### CORS errors in browser

- Verify `CORS_ORIGIN` in `backend/.env` matches your domain
- Check Nginx configuration
- Clear browser cache

### Desktop app can't connect

- Verify API URL in desktop app settings
- Test API endpoint: `https://api.yourdomain.com/api`
- Check firewall allows HTTPS traffic

---

## 📞 Support

For issues during deployment:
1. Check logs: `pm2 logs distribution-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MySQL logs: `sudo tail -f /var/log/mysql/error.log`

## 🔐 Security Reminders

- ✅ Change all default passwords
- ✅ Use strong JWT secret
- ✅ Enable HTTPS only
- ✅ Setup automated backups
- ✅ Keep system updated
- ✅ Use firewall
- ✅ Monitor logs regularly
- ✅ Limit database user privileges

---

## 📈 Scaling

For high traffic:
- Use load balancer (Nginx, HAProxy)
- Setup database replication
- Use Redis for caching
- Implement CDN for static assets
- Horizontal scaling with multiple backend instances

---

**Your application is now ready for production deployment! 🚀**
