# Distribution Management System - Server Deployment Guide

## 🚀 Quick Start - Server Deployment

This guide will help you deploy the Distribution Management System to your production server (VPS/Cloud).

---

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer (recommended)
- **RAM**: Minimum 2GB, 4GB recommended
- **Storage**: Minimum 20GB
- **CPU**: 2 cores minimum
- **Node.js**: v18.x or newer
- **MySQL**: 8.0 or newer
- **Domain** (optional): Configured and pointing to your server IP

### Local Requirements
- Git installed
- GitHub account
- SSH access to your server

---

## 📤 Step 1: Push to GitHub

### 1.1 Initialize Git Repository (if not done)
```bash
cd /path/to/distribution_system-main
git init
```

### 1.2 Create GitHub Repository
1. Go to [GitHub](https://github.com)
2. Click **New Repository**
3. Name: `distribution-management-system`
4. Visibility: Private (recommended)
5. Don't initialize with README
6. Click **Create repository**

### 1.3 Add Remote and Push
```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/distribution-management-system.git

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Production ready"

# Push to GitHub
git push -u origin main
```

---

## 🖥️ Step 2: Server Setup

### 2.1 Connect to Your Server
```bash
ssh root@your-server-ip
# Or
ssh your-username@your-server-ip
```

### 2.2 Run Automated Setup (Recommended)
```bash
# Download and run setup script
wget https://raw.githubusercontent.com/YOUR_USERNAME/distribution-management-system/main/deploy-server.sh
chmod +x deploy-server.sh
sudo ./deploy-server.sh
```

### 2.3 Manual Setup (Alternative)

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x
```

#### Install MySQL
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

#### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

#### Install Nginx (Optional - for reverse proxy)
```bash
sudo apt install -y nginx
```

---

## 📥 Step 3: Clone and Configure Application

### 3.1 Clone Repository
```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone from GitHub
sudo git clone https://github.com/YOUR_USERNAME/distribution-management-system.git distribution_system

# Set permissions
sudo chown -R $USER:$USER distribution_system
cd distribution_system
```

### 3.2 Install Dependencies

#### Backend
```bash
cd backend
npm install --production
```

#### Frontend (for web access)
```bash
cd ../desktop
npm install --production
npm run build
cd ..
```

### 3.3 Configure Environment Variables

#### Backend Configuration
```bash
cd backend
cp .env.example .env
nano .env
```

Update the following in `.env`:
```env
# Change to production
NODE_ENV=production

# MySQL Configuration
DB_HOST=localhost
DB_USER=dist_admin
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=distribution_system_db
DB_PORT=3306

# IMPORTANT: Set to false for production
USE_SQLITE=false

# Generate strong JWT secret
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET_HERE

# CORS - Add your domain
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Company Info
COMPANY_NAME=Ummahtechinnovations
COMPANY_WEBSITE=ummahtechinnovations.com
```

To generate a strong JWT secret:
```bash
openssl rand -base64 32
```

---

## 🗄️ Step 4: Setup Database

### 4.1 Create Database and User
```bash
sudo mysql -u root -p
```

In MySQL console:
```sql
CREATE DATABASE distribution_system_db;
CREATE USER 'dist_admin'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON distribution_system_db.* TO 'dist_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.2 Import Database Schema
```bash
cd /var/www/distribution_system/backend
mysql -u dist_admin -p distribution_system_db < database/create_db.sql
```

### 4.3 Import Seed Data (Optional)
```bash
mysql -u dist_admin -p distribution_system_db < database/seeds.sql
```

---

## 🚀 Step 5: Start Application with PM2

### 5.1 Start Backend API
```bash
cd /var/www/distribution_system/backend
pm2 start server.js --name distribution-api

# View logs
pm2 logs distribution-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
```

### 5.2 Serve Frontend (Optional - if not using separate web server)
```bash
# Install serve package
npm install -g serve

# Serve built frontend
cd /var/www/distribution_system/desktop
pm2 start "serve -s build -p 3000" --name distribution-frontend
pm2 save
```

---

## 🌐 Step 6: Configure Nginx (Recommended)

### 6.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/distribution-system
```

Add the following configuration:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;  # Or your-server-ip

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend Web App
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Or your-server-ip

    root /var/www/distribution_system/desktop/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/distribution-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6.3 Configure Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 🔒 Step 7: Setup SSL Certificate (Recommended)

### Using Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## 💻 Step 8: Configure Desktop App for Clients

### 8.1 Update Desktop App Configuration

On each client PC, the desktop app needs to connect to your server.

**Option 1: Build with hardcoded server URL**

Edit `desktop/src/utils/serverConfig.js`:
```javascript
const DEFAULT_CONFIG = {
  host: 'your-server-ip-or-domain',  // e.g., 'api.yourdomain.com' or '147.93.108.205'
  port: '5000',  // or '80' if using Nginx, '443' if using SSL
  protocol: 'http'  // or 'https' if SSL is configured
};
```

Then build the desktop app:
```bash
cd desktop
npm run build
# Package for Windows
npm run electron-build
```

**Option 2: Let users configure server URL**

The app already has a configuration screen. Users can set the server URL when they first open the app.

### 8.2 Distribute Desktop App

After building:
1. The installer will be in `desktop/dist/` folder
2. Download it from your build machine
3. Distribute to clients via:
   - Direct download link
   - Email
   - USB drive
   - Network share

---

## 📊 Step 9: Verify Deployment

### 9.1 Check Backend Status
```bash
pm2 status
pm2 logs distribution-api
```

### 9.2 Test API Endpoints
```bash
# Health check
curl http://localhost:5000/api

# Or with domain
curl http://api.yourdomain.com/api
```

### 9.3 Test Web Access
Open browser and navigate to:
- `http://yourdomain.com` (or `http://your-server-ip`)
- Login with: admin / admin123

---

## 🔧 Maintenance & Updates

### Update from GitHub
```bash
cd /var/www/distribution_system
git pull origin main

# Update backend
cd backend
npm install --production
pm2 restart distribution-api

# Update frontend
cd ../desktop
npm install --production
npm run build
pm2 restart distribution-frontend  # if using PM2 for frontend
```

### View Logs
```bash
# Application logs
pm2 logs distribution-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### Backup Database
```bash
# Create backup
mysqldump -u dist_admin -p distribution_system_db > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u dist_admin -p distribution_system_db < backup_20260117.sql
```

### Monitor Performance
```bash
pm2 monit
htop
```

---

## 🌐 Access Methods

### For Clients via Web Browser
- URL: `http://yourdomain.com` or `http://your-server-ip`
- Login: `admin` / `admin123` (change after first login!)

### For Clients via Desktop App
1. Install desktop app on their PC
2. On first launch, configure server:
   - Host: `your-server-ip` or `yourdomain.com`
   - Port: `5000` (or `80/443` if using Nginx with SSL)
   - Protocol: `http` or `https`
3. Login with credentials

---

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Setup SSL certificate (HTTPS)
- [ ] Configure firewall (UFW)
- [ ] Use strong MySQL passwords
- [ ] Generate strong JWT secret
- [ ] Set NODE_ENV=production
- [ ] Disable SQLite (USE_SQLITE=false)
- [ ] Regular database backups
- [ ] Keep system updated
- [ ] Monitor logs regularly
- [ ] Restrict MySQL remote access

---

## 🆘 Troubleshooting

### Backend won't start
```bash
pm2 logs distribution-api
# Check for errors in environment configuration
```

### Database connection failed
```bash
# Verify MySQL is running
sudo systemctl status mysql

# Test database connection
mysql -u dist_admin -p distribution_system_db
```

### Cannot access from browser
```bash
# Check if port is open
sudo ufw status
sudo netstat -tulpn | grep :5000

# Check Nginx status
sudo systemctl status nginx
```

### Desktop app can't connect
- Verify server IP/domain is correct
- Check if port 5000 is open in firewall
- Test API directly: `curl http://your-server-ip:5000/api`

---

## 📞 Support

For issues and questions:
- Email: info@ummahtechinnovations.com
- Website: ummahtechinnovations.com

---

**Good luck with your deployment! 🚀**
