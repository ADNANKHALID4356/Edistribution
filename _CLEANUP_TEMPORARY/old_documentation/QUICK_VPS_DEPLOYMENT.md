# 🚀 QUICK START GUIDE - VPS DEPLOYMENT

## **Goal: Connect Mobile Salesmen → VPS Backend ← Desktop Admin**

---

## **📋 PREREQUISITES (Check These First)**

✅ Hostinger VPS access (SSH or web terminal)  
✅ Backend files ready (from your project)  
✅ Know your VPS IP address  
✅ Have 30 minutes for setup

---

## **🎯 MINIMAL 5-STEP DEPLOYMENT**

### **STEP 1: Prepare Backend Locally (2 minutes)**

On your Windows PC:

1. **Create .env.production file:**
```bash
cd "d:\SKILL\App Development\Distribution managemnt system\distribution_system-main\backend"
copy .env.production.example .env.production
notepad .env.production
```

2. **Edit .env.production:**
```env
DB_HOST=localhost
DB_USER=distribution_user
DB_PASSWORD=YourSecurePassword123!
DB_NAME=distribution_db
JWT_SECRET=your_random_64_character_string_here
PORT=5000
NODE_ENV=production
COMPANY_NAME=Ummahtechinnovations
```

3. **Create ZIP for upload:**
   - Zip the entire `backend/` folder
   - Name it: `backend.zip`
   - Exclude: `node_modules/`, `.env`, `*.log`

---

### **STEP 2: Upload to VPS (3 minutes)**

**Option A: Using Hostinger File Manager**
1. Login to Hostinger panel
2. Go to File Manager
3. Create folder: `/var/www/distribution-backend`
4. Upload `backend.zip`
5. Extract it

**Option B: Using SCP (from PowerShell)**
```powershell
scp backend.zip root@YOUR_VPS_IP:/var/www/distribution-backend/
```

---

### **STEP 3: Install & Deploy (10 minutes)**

SSH into your VPS:
```bash
ssh root@YOUR_VPS_IP
```

Run these commands:
```bash
# Navigate to backend
cd /var/www/distribution-backend

# Extract if needed
unzip backend.zip
cd backend

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install dependencies
npm install --production

# Install MySQL (if not installed)
apt install -y mysql-server

# Setup database
mysql_secure_installation  # Follow prompts

# Create database
mysql -u root -p <<EOF
CREATE DATABASE distribution_db;
CREATE USER 'distribution_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON distribution_db.* TO 'distribution_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# Import schema
mysql -u distribution_user -p distribution_db < database/create_db.sql

# Import migrations (paste each file name)
mysql -u distribution_user -p distribution_db < database/migrations/004_create_salesmen_table.sql
mysql -u distribution_user -p distribution_db < database/migrations/005_create_orders_table.sql
# ... (repeat for all migration files)

# Import seed data (creates admin user)
mysql -u distribution_user -p distribution_db < database/seeds.sql

# Start backend with PM2
pm2 start server.js --name distribution-api
pm2 save
pm2 startup  # Follow the command it outputs

# Open firewall
ufw allow 5000/tcp
ufw reload
```

**Check if running:**
```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"OK",...}`

---

### **STEP 4: Test External Access (2 minutes)**

From your Windows PC, test:
```powershell
# Replace YOUR_VPS_IP with actual IP
curl http://YOUR_VPS_IP:5000/api/health
```

Or open in browser:
```
http://YOUR_VPS_IP:5000/api/health
```

**If fails:**
- Check Hostinger VPS firewall (allow port 5000)
- Check `pm2 logs distribution-api`
- Check `ufw status`

---

### **STEP 5: Configure Apps (5 minutes)**

**Desktop App:**
1. Open desktop app
2. Go to Server Settings (or use browser console if no UI)
3. Enter:
   - Host: `YOUR_VPS_IP`
   - Port: `5000`
   - Protocol: `http`
4. Test connection → Should show ✅
5. Save
6. Login: `admin` / `admin123`

**Mobile App:**
1. Open mobile app
2. Tap "Server Settings" on login screen
3. Enter:
   - Host: `YOUR_VPS_IP`
   - Port: `5000`
4. Test connection → Should show ✅
5. Save
6. Restart app
7. Login: `Salesman1` / `Salesman1##`

---

## **✅ VERIFICATION (Test Order Flow)**

1. **Mobile:** Login → Create order → Sync
2. **Desktop:** Login → View orders → See new order
3. **Desktop:** Approve order
4. **Mobile:** Refresh → See approved status

**SUCCESS!** 🎉

---

## **🆘 TROUBLESHOOTING**

**Backend won't start:**
```bash
pm2 logs distribution-api
# Check for errors
```

**Can't connect from mobile:**
1. Check VPS IP is correct
2. Check port 5000 is open: `ufw status`
3. Check Hostinger firewall allows port 5000
4. Try from browser first: `http://YOUR_VPS_IP:5000/api/health`

**Database errors:**
```bash
mysql -u distribution_user -p distribution_db
# Test if can connect
```

**CORS errors:**
In `.env.production`, ensure:
```env
CORS_ORIGIN=*
```
Then: `pm2 restart distribution-api`

---

## **📊 USEFUL COMMANDS**

```bash
# View logs
pm2 logs distribution-api

# Restart
pm2 restart distribution-api

# Stop
pm2 stop distribution-api

# Status
pm2 status

# Check port
netstat -tulpn | grep 5000

# Database backup
mysqldump -u distribution_user -p distribution_db > backup.sql
```

---

## **🎯 YOUR VPS BECOMES THE HUB**

```
        📱 Mobile (4G) ────┐
                           │
        📱 Mobile (WiFi) ──┼──→ [VPS: YOUR_IP:5000] ←── 🖥️ Desktop
                           │
        📱 Mobile (Field) ─┘
```

**All devices connect to: `http://YOUR_VPS_IP:5000`**

---

## **💰 COST: $0 Extra**

You're already paying for Hostinger VPS, this just uses:
- Existing VPS resources
- Same MySQL server
- Same PM2 process manager
- Just one more app running

---

## **🔐 SECURITY NOTE**

After testing works:
1. Change admin password
2. Change database password
3. Update JWT_SECRET
4. Consider adding SSL (Let's Encrypt - free)
5. Restrict CORS if needed

---

## **📞 NEED HELP?**

Check PM2 logs first:
```bash
pm2 logs distribution-api --lines 50
```

Most issues are:
- Firewall blocking port 5000
- Wrong IP address in app config
- Backend not running (check `pm2 status`)
- MySQL credentials wrong

---

**Your minimal deployment is complete when:**
✅ `curl http://YOUR_VPS_IP:5000/api/health` works  
✅ Desktop can login and view data  
✅ Mobile can login and create orders  
✅ Orders sync from mobile → VPS → desktop

**That's it! 🚀**
