# ✅ VPS DEPLOYMENT CHECKLIST

**Distribution Management System - Backend Deployment**  
**Target:** Hostinger VPS  
**Goal:** Connect mobile salesmen from anywhere

---

## 📋 **PRE-DEPLOYMENT**

### **On Your Windows PC:**
- [ ] Navigate to backend folder
- [ ] Create `.env.production` from template
- [ ] Update database password in `.env.production`
- [ ] Generate JWT secret (32+ characters)
- [ ] Create ZIP of backend folder
- [ ] Exclude: node_modules, .env, *.log

### **VPS Access:**
- [ ] Have VPS IP address: `___________________`
- [ ] Have SSH access (root password)
- [ ] Know Hostinger panel login

---

## 🚀 **DEPLOYMENT (30 minutes)**

### **Step 1: Connect to VPS (2 min)**
```bash
ssh root@YOUR_VPS_IP
```
- [ ] Connected successfully

### **Step 2: Install Software (10 min)**

**Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version  # Check v18.x
```
- [ ] Node.js installed

**MySQL:**
```bash
apt install -y mysql-server
systemctl start mysql
mysql_secure_installation
```
- [ ] MySQL installed and secured

**PM2:**
```bash
npm install -g pm2
```
- [ ] PM2 installed

**Firewall:**
```bash
ufw allow 22/tcp
ufw allow 5000/tcp
ufw enable
```
- [ ] Firewall configured

### **Step 3: Setup Database (5 min)**

```bash
mysql -u root -p
```

In MySQL:
```sql
CREATE DATABASE distribution_db;
CREATE USER 'distribution_user'@'localhost' 
IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON distribution_db.* 
TO 'distribution_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
- [ ] Database created
- [ ] User created
- [ ] Privileges granted

### **Step 4: Upload Backend (3 min)**

**Option A: File Manager**
- [ ] Login to Hostinger panel
- [ ] Go to File Manager
- [ ] Navigate to `/var/www/`
- [ ] Create folder: `distribution-backend`
- [ ] Upload backend.zip
- [ ] Extract

**Option B: SCP**
```bash
scp backend.zip root@YOUR_VPS_IP:/var/www/distribution-backend/
```
- [ ] Files uploaded

### **Step 5: Install Dependencies (3 min)**

```bash
cd /var/www/distribution-backend
npm install --production
```
- [ ] Dependencies installed

### **Step 6: Import Database (5 min)**

```bash
mysql -u distribution_user -p distribution_db < database/create_db.sql
mysql -u distribution_user -p distribution_db < database/seeds.sql
```
- [ ] Schema imported
- [ ] Seed data imported (admin user created)

### **Step 7: Start Backend (2 min)**

```bash
pm2 start server.js --name distribution-api
pm2 save
pm2 startup  # Follow command it outputs
```
- [ ] Backend started with PM2
- [ ] PM2 saved
- [ ] Auto-start configured

---

## ✅ **VERIFICATION (5 minutes)**

### **Test on VPS:**
```bash
curl http://localhost:5000/api/health
```
- [ ] Returns: `{"status":"OK",...}`

### **Test from Your PC:**
```bash
curl http://YOUR_VPS_IP:5000/api/health
```
- [ ] Returns: `{"status":"OK",...}`

### **Test in Browser:**
```
http://YOUR_VPS_IP:5000/api/health
```
- [ ] Shows JSON response

---

## 📱 **CONFIGURE APPS (5 minutes)**

### **Desktop App:**
- [ ] Open desktop app
- [ ] Go to Server Settings (or browser console)
- [ ] Enter:
  - Host: `YOUR_VPS_IP`
  - Port: `5000`
  - Protocol: `http`
- [ ] Click "Test Connection"
- [ ] Should show: ✅ Connection successful
- [ ] Click "Save & Apply"
- [ ] Login: `admin` / `admin123`
- [ ] Dashboard loads

### **Mobile App:**
- [ ] Open mobile app
- [ ] Tap "Server Settings" button
- [ ] Enter:
  - Host: `YOUR_VPS_IP`
  - Port: `5000`
- [ ] Tap "Test Connection"
- [ ] Should show: ✅ Connected
- [ ] Tap "Save"
- [ ] Close and reopen app
- [ ] Login: `Salesman1` / `Salesman1##`
- [ ] Dashboard loads

---

## 🧪 **TEST ORDER FLOW (5 minutes)**

### **On Mobile:**
- [ ] Login as Salesman1
- [ ] Go to Shop Listing
- [ ] Select a shop
- [ ] Add products to cart
- [ ] Submit order
- [ ] See "Pending Sync" badge

### **Sync Orders:**
- [ ] Tap "Sync Orders" on dashboard
- [ ] Wait for sync to complete
- [ ] See "Synced" status

### **On Desktop:**
- [ ] Login as admin
- [ ] Go to Orders page
- [ ] See order from mobile
- [ ] Click "Approve" or "Reject"

### **Back on Mobile:**
- [ ] Pull to refresh dashboard
- [ ] See order status updated
- [ ] Status shows "Approved" or "Rejected"

---

## 🎉 **SUCCESS!**

If all checkboxes are ✅:
- ✅ Backend deployed on VPS
- ✅ Desktop connects from anywhere
- ✅ Mobile connects from anywhere
- ✅ Orders sync between mobile ↔ VPS ↔ desktop

**Your distribution system is now live!**

---

## 🆘 **TROUBLESHOOTING**

### **Issue: Can't connect from outside VPS**

**Check 1: Backend Running?**
```bash
pm2 status
```
Should show `distribution-api` as `online`

**Fix if not:**
```bash
pm2 restart distribution-api
pm2 logs distribution-api
```

**Check 2: Firewall Open?**
```bash
ufw status
```
Should show: `5000/tcp ALLOW`

**Fix if not:**
```bash
ufw allow 5000/tcp
ufw reload
```

**Check 3: Hostinger Firewall?**
- Login to Hostinger panel
- Go to VPS → Firewall
- Ensure port 5000 is allowed

**Check 4: Correct IP?**
```bash
curl ifconfig.me
```
This is your VPS IP - use this in apps

---

### **Issue: Database connection error**

**Check credentials:**
```bash
nano /var/www/distribution-backend/.env.production
```

Ensure matches:
```env
DB_HOST=localhost
DB_USER=distribution_user
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=distribution_db
```

**Test connection:**
```bash
mysql -u distribution_user -p distribution_db
```
Should connect successfully

---

### **Issue: CORS errors**

**Fix:**
```bash
nano /var/www/distribution-backend/.env.production
```

Add/ensure:
```env
CORS_ORIGIN=*
```

Then:
```bash
pm2 restart distribution-api
```

---

### **Issue: Mobile app says "Server not found"**

**Check:**
1. IP address is correct (not 10.8.129.12)
2. Port is 5000
3. Protocol is http (not https)
4. Test in mobile browser: `http://YOUR_VPS_IP:5000/api/health`

---

## 📊 **USEFUL COMMANDS**

**View Logs:**
```bash
pm2 logs distribution-api
pm2 logs distribution-api --lines 50
```

**Restart Backend:**
```bash
pm2 restart distribution-api
```

**Stop Backend:**
```bash
pm2 stop distribution-api
```

**Check Status:**
```bash
pm2 status
```

**Monitor Resources:**
```bash
pm2 monit
```

**Check Port:**
```bash
netstat -tulpn | grep 5000
```

**Database Backup:**
```bash
mysqldump -u distribution_user -p distribution_db > backup_$(date +%Y%m%d).sql
```

---

## 🔐 **POST-DEPLOYMENT SECURITY**

After everything works, do these:

- [ ] Change admin password:
  - Login to desktop
  - Go to Settings
  - Change password

- [ ] Update database password:
  ```bash
  mysql -u root -p
  ALTER USER 'distribution_user'@'localhost' 
  IDENTIFIED BY 'NewSecurePassword123!';
  FLUSH PRIVILEGES;
  EXIT;
  ```
  - Update in `.env.production`
  - `pm2 restart distribution-api`

- [ ] Generate new JWT secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  - Update in `.env.production`
  - `pm2 restart distribution-api`
  - **All users must re-login**

---

## 📝 **DEPLOYMENT NOTES**

**VPS IP:** `___________________________`

**Database Password:** `___________________________` (Keep secure!)

**JWT Secret:** `___________________________` (Keep secure!)

**Deployment Date:** `___________________________`

**Deployed By:** `___________________________`

---

## 📞 **SUPPORT CONTACTS**

**Developer:** Ummahtechinnovations  
**Email:** info@ummahtechinnovations.com

**Hostinger Support:**  
**Website:** hostinger.com/support

---

**Print this checklist and tick items as you complete them!** ✅
