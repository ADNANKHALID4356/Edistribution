# 🚀 VPS DEPLOYMENT GUIDE - MINIMAL STEPS
**Distribution Management System - Hostinger VPS**  
**Date:** December 24, 2025

---

## 🎯 **DEPLOYMENT GOAL**

Connect salesmen in the field (mobile) with admin desktop from anywhere via Hostinger VPS.

```
┌─────────────────────────────────────────────┐
│      HOSTINGER VPS (Public Access)          │
│  Domain: yourdomain.com OR IP: xxx.xxx.x.x  │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Backend API (Node.js)                 │ │
│  │  Port: 5000                            │ │
│  │  PM2 (Process Manager)                 │ │
│  └────────────────┬───────────────────────┘ │
│                   │                          │
│  ┌────────────────▼───────────────────────┐ │
│  │  MySQL Database                        │ │
│  │  Port: 3306                            │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
   │ Desktop │ │ Mobile │ │ Mobile │
   │ (Admin) │ │ (Sale) │ │ (Sale) │
   └─────────┘ └────────┘ └────────┘
```

---

## 📋 **STEP 1: PREPARE BACKEND FILES**

### 1.1 Create Production Environment File

On your local machine, create `.env.production`:

```bash
cd "d:\SKILL\App Development\Distribution managemnt system\distribution_system-main\backend"
```

Create file: `.env.production`

```env
# Database Configuration
DB_HOST=localhost
DB_USER=distribution_user
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_NAME=distribution_db
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=production

# Security (GENERATE NEW SECRET!)
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_Min32Characters
JWT_EXPIRE=7d

# Company Information
COMPANY_NAME=Ummahtechinnovations
COMPANY_WEBSITE=ummahtechinnovations.com

# CORS (Allow all origins for now, restrict later)
CORS_ORIGIN=*
```

**⚠️ IMPORTANT:** Change `JWT_SECRET` to a random 32+ character string!

### 1.2 Prepare Upload Package

Create a ZIP file with these folders/files:
```
backend/
├── src/
├── database/
│   ├── create_db.sql
│   └── migrations/
├── package.json
├── server.js
├── standalone.js
└── .env.production
```

**Exclude:** `node_modules/`, `.env`, `*.log`, `test_*.js`

---

## 📦 **STEP 2: DEPLOY TO HOSTINGER VPS**

### 2.1 Connect to VPS via SSH

```bash
ssh root@your-vps-ip
# OR use Hostinger's web-based terminal
```

### 2.2 Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MySQL (if not already installed)
apt install -y mysql-server

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx (reverse proxy - optional but recommended)
apt install -y nginx

# Verify installations
node --version    # Should show v18.x
npm --version
mysql --version
pm2 --version
```

### 2.3 Create Application Directory

```bash
# Create app directory
mkdir -p /var/www/distribution-backend
cd /var/www/distribution-backend

# Upload your backend ZIP here and extract
# You can use: SCP, FTP, or Hostinger File Manager
```

Upload via SCP from your local machine:
```bash
# From Windows PowerShell (on your local PC)
scp backend.zip root@your-vps-ip:/var/www/distribution-backend/
```

Then on VPS:
```bash
cd /var/www/distribution-backend
unzip backend.zip
rm backend.zip
```

### 2.4 Install Dependencies

```bash
cd /var/www/distribution-backend
npm install --production
```

---

## 🗄️ **STEP 3: SETUP MYSQL DATABASE**

### 3.1 Secure MySQL Installation

```bash
mysql_secure_installation
# Follow prompts:
# - Set root password
# - Remove anonymous users: Yes
# - Disallow root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes
```

### 3.2 Create Database and User

```bash
mysql -u root -p
```

In MySQL console:
```sql
-- Create database
CREATE DATABASE distribution_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace password!)
CREATE USER 'distribution_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON distribution_db.* TO 'distribution_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;

-- Exit
EXIT;
```

### 3.3 Import Database Schema

```bash
cd /var/www/distribution-backend

# Import base schema
mysql -u distribution_user -p distribution_db < database/create_db.sql

# Import migrations (one by one or all)
for file in database/migrations/*.sql; do
  echo "Importing $file..."
  mysql -u distribution_user -p distribution_db < "$file"
done

# Import seed data (optional - creates default admin user)
mysql -u distribution_user -p distribution_db < database/seeds.sql
```

**Default Login After Seeding:**
- Username: `admin`
- Password: `admin123`

---

## 🚀 **STEP 4: START BACKEND WITH PM2**

### 4.1 Start Application

```bash
cd /var/www/distribution-backend

# Start with PM2
pm2 start server.js --name "distribution-api"

# Check status
pm2 status

# View logs
pm2 logs distribution-api

# Save PM2 config (auto-restart on server reboot)
pm2 save
pm2 startup
# Follow the command it outputs
```

### 4.2 Test Backend

```bash
# Test locally on VPS
curl http://localhost:5000/api/health

# Should return:
# {"status":"OK","timestamp":"...","environment":"production"}
```

---

## 🔥 **STEP 5: CONFIGURE FIREWALL**

### 5.1 Allow Required Ports

```bash
# Check if UFW is active
ufw status

# If not active, enable it
ufw enable

# Allow SSH (IMPORTANT - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP (for nginx)
ufw allow 80/tcp

# Allow HTTPS (for future SSL)
ufw allow 443/tcp

# Allow Node.js backend (port 5000)
ufw allow 5000/tcp

# Reload firewall
ufw reload

# Check status
ufw status verbose
```

### 5.2 Test External Access

From your local machine:
```bash
# Replace YOUR_VPS_IP with actual IP
curl http://YOUR_VPS_IP:5000/api/health
```

---

## 🌐 **STEP 6: (OPTIONAL) SETUP NGINX REVERSE PROXY**

**Why?** Better performance, SSL support, domain name usage

### 6.1 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/distribution-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # OR use IP: server_name YOUR_VPS_IP;

    # API endpoint
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    }
}
```

### 6.2 Enable Configuration

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/distribution-api /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

**Now your API is accessible at:**
- With domain: `http://your-domain.com/api`
- With IP: `http://YOUR_VPS_IP/api` (via nginx on port 80)
- Direct: `http://YOUR_VPS_IP:5000/api`

---

## 📱 **STEP 7: CONFIGURE DESKTOP APP**

### 7.1 On Admin Desktop PC

1. **Open Desktop App**
2. **Before Login**, click **"Server Settings"** (if no button, check code)
3. **Enter VPS Details:**
   - **Host:** `your-domain.com` OR `YOUR_VPS_IP`
   - **Port:** `5000` (direct) OR `80` (if using nginx)
   - **Protocol:** `http`
4. **Click "Test Connection"** → Should show ✅
5. **Click "Save & Apply"**
6. **Login:** `admin` / `admin123`

**If no Server Settings UI exists in Desktop**, users can set via browser console:
```javascript
localStorage.setItem('serverConfig', JSON.stringify({
  host: 'YOUR_VPS_IP',
  port: '5000',
  protocol: 'http'
}));
// Then reload page
```

---

## 📱 **STEP 8: CONFIGURE MOBILE APP**

### 8.1 On Salesman Mobile Phones

1. **Open Mobile App**
2. **On Login Screen**, tap **"Server Settings"** button
3. **Enter VPS Details:**
   - **Host:** `your-domain.com` OR `YOUR_VPS_IP`
   - **Port:** `5000` (direct) OR `80` (if using nginx)
   - **Protocol:** `http`
4. **Tap "Test Connection"** → Should show ✅
5. **Tap "Save & Apply"**
6. **Close and Reopen App**
7. **Login:** `Salesman1` / `Salesman1##`

---

## ✅ **STEP 9: VERIFY EVERYTHING WORKS**

### 9.1 Test Order Flow

1. **On Mobile (Salesman):**
   - Login as `Salesman1`
   - Go to Shop Listing
   - Select a shop
   - Add products to cart
   - Submit order
   - **Check:** "Pending Sync" badge appears

2. **Sync Orders:**
   - On Dashboard, tap **"Sync Orders"** button
   - **Check:** Orders upload to server

3. **On Desktop (Admin):**
   - Login as `admin`
   - Go to **Orders** page
   - **Check:** Orders from salesman appear
   - Approve/reject orders

4. **Mobile Pulls Updates:**
   - On mobile, pull to refresh
   - **Check:** Order status updates (approved/rejected)

---

## 🔒 **STEP 10: SECURITY HARDENING**

### 10.1 Change Default Passwords

```sql
mysql -u distribution_user -p distribution_db

-- Change admin password (update with bcrypt hash)
-- Generate hash: node -e "console.log(require('bcryptjs').hashSync('NewPassword123', 10))"

UPDATE users 
SET password = '$2a$10$YOUR_BCRYPT_HASH_HERE' 
WHERE username = 'admin';

EXIT;
```

### 10.2 Update Backend .env

```bash
nano /var/www/distribution-backend/.env.production
```

Change:
- `JWT_SECRET` to a new random string
- Database password if you changed it

Restart backend:
```bash
pm2 restart distribution-api
```

### 10.3 (Optional) Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain name)
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is setup automatically
certbot renew --dry-run
```

**After SSL:**
- Update apps to use `https` instead of `http`
- Port changes to `443`

---

## 🛠️ **MAINTENANCE COMMANDS**

### PM2 Management
```bash
# View logs
pm2 logs distribution-api

# Restart app
pm2 restart distribution-api

# Stop app
pm2 stop distribution-api

# View status
pm2 status

# Monitor resources
pm2 monit
```

### Database Backup
```bash
# Backup database
mysqldump -u distribution_user -p distribution_db > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u distribution_user -p distribution_db < backup_20251224.sql
```

### Check Backend Status
```bash
# Check if running
pm2 status

# Check logs
tail -f /root/.pm2/logs/distribution-api-out.log
tail -f /root/.pm2/logs/distribution-api-error.log

# Check port
netstat -tulpn | grep 5000
```

---

## ⚠️ **TROUBLESHOOTING**

### Mobile/Desktop Can't Connect

**1. Test from VPS itself:**
```bash
curl http://localhost:5000/api/health
```
If fails → Backend not running → `pm2 restart distribution-api`

**2. Test from local PC:**
```bash
curl http://YOUR_VPS_IP:5000/api/health
```
If fails → Firewall blocking → Check `ufw allow 5000/tcp`

**3. Check Hostinger Firewall:**
- Login to Hostinger panel
- Check VPS firewall rules
- Ensure port 5000 is open

**4. Check Backend Logs:**
```bash
pm2 logs distribution-api --lines 100
```

### Database Connection Error

```bash
# Check MySQL is running
systemctl status mysql

# Test connection
mysql -u distribution_user -p distribution_db

# Check .env file
cat /var/www/distribution-backend/.env.production
```

### CORS Errors

Add to `.env.production`:
```env
CORS_ORIGIN=*
```

Restart:
```bash
pm2 restart distribution-api
```

---

## 📊 **MINIMAL CHECKLIST**

- [ ] VPS accessible via SSH
- [ ] Node.js 18.x installed
- [ ] MySQL installed and secured
- [ ] PM2 installed globally
- [ ] Backend files uploaded to `/var/www/distribution-backend`
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.production` configured with MySQL credentials
- [ ] Database created: `distribution_db`
- [ ] User created: `distribution_user`
- [ ] Schema imported (create_db.sql + migrations)
- [ ] Seed data imported (admin user exists)
- [ ] Backend started with PM2
- [ ] Firewall allows port 5000
- [ ] Health check works: `curl http://YOUR_VPS_IP:5000/api/health`
- [ ] Desktop app configured with VPS IP/domain
- [ ] Mobile app configured with VPS IP/domain
- [ ] Test order creation from mobile
- [ ] Test order sync to server
- [ ] Test order viewing on desktop

---

## 🎯 **MINIMAL URLS TO SHARE**

**For Desktop Users:**
```
Server: http://YOUR_VPS_IP:5000
# OR
Server: http://your-domain.com:5000
```

**For Mobile Users:**
```
Server: http://YOUR_VPS_IP:5000
# OR
Server: http://your-domain.com:5000
```

**Test URL (for all):**
```
http://YOUR_VPS_IP:5000/api/health
```

---

## 💡 **COST OPTIMIZATION**

Since you have 3 websites on Hostinger already:

1. **Share Same VPS** - Just add this backend
2. **Share Nginx** - One nginx for all sites
3. **Share MySQL** - Use same MySQL server, different database
4. **Use PM2** - Free process manager
5. **No Extra Cost** - Uses existing VPS resources

---

## 🚀 **QUICK START (ONE-LINER)**

On VPS, create this script: `deploy.sh`

```bash
#!/bin/bash
cd /var/www/distribution-backend
git pull origin main  # If using git
npm install --production
pm2 restart distribution-api
echo "✅ Deployment complete!"
```

Then just run: `bash deploy.sh`

---

## 📞 **SUPPORT**

If you face issues:
1. Check PM2 logs: `pm2 logs distribution-api`
2. Check MySQL: `systemctl status mysql`
3. Check firewall: `ufw status`
4. Test health: `curl http://localhost:5000/api/health`

**Common Issues:**
- **Port 5000 blocked** → Open in Hostinger firewall
- **MySQL not found** → Check .env credentials
- **CORS errors** → Set `CORS_ORIGIN=*` in .env
- **502 Bad Gateway** → Backend not running (check PM2)

---

## 🎉 **SUCCESS!**

After completing these steps:
- ✅ Backend running 24/7 on VPS
- ✅ Mobile salesmen can connect from anywhere (4G/WiFi)
- ✅ Desktop admin can connect from any location
- ✅ Orders sync from mobile → server → desktop
- ✅ Centralized data in MySQL
- ✅ Professional deployment

**Your VPS IP Address will be the central hub for all devices!**
