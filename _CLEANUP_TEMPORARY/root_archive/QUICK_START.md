# Quick Start Guide - Distribution Management System

## 🚀 For Deployment Team

### Before Pushing to GitHub

1. **Update Backend Configuration**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with production database credentials
   # Generate new JWT_SECRET: 
   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update Desktop Configuration**
   ```bash
   cd desktop
   cp .env.example .env
   # Edit .env with production API URL
   # Example: REACT_APP_API_URL=https://api.yourdomain.com
   ```

3. **Verify Sensitive Files are Excluded**
   - Check `.gitignore` includes `.env` files
   - Make sure `node_modules/` is excluded
   - Ensure database files (`*.db`, `*.sqlite`) are excluded

4. **Push to GitHub**
   
   **Windows:**
   ```cmd
   push-to-github.bat
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x push-to-github.sh
   ./push-to-github.sh
   ```
   
   **Manual:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Production-ready distribution system"
   git remote add origin https://github.com/yourusername/distribution_system.git
   git branch -M main
   git push -u origin main
   ```

---

## 🌐 Server Deployment (For System Administrator)

### Quick Deploy Steps

1. **Server Requirements**
   - Ubuntu 20.04+ or CentOS 7+
   - Node.js 18+
   - MySQL 8.0+
   - Nginx
   - 2GB RAM, 20GB storage

2. **Install Dependencies**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs mysql-server nginx git
   
   # Install PM2
   sudo npm install -g pm2
   ```

3. **Setup Database**
   ```bash
   sudo mysql
   CREATE DATABASE distribution_system;
   CREATE USER 'dist_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';
   GRANT ALL PRIVILEGES ON distribution_system.* TO 'dist_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

4. **Clone and Setup**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/distribution_system.git
   cd distribution_system/backend
   
   # Configure environment
   cp .env.example .env
   nano .env  # Update all values
   
   # Install and start
   npm install --production
   pm2 start server.js --name distribution-backend
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/distribution
   # Copy configuration from PRODUCTION_DEPLOYMENT.md
   
   sudo ln -s /etc/nginx/sites-available/distribution /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Setup SSL**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

7. **Build and Deploy Frontend**
   ```bash
   cd desktop
   npm install
   npm run build
   # Copy build folder to /var/www/distribution_system/desktop/build
   ```

---

## 👥 For End Users (Clients)

### Option 1: Web Browser Access (Recommended)

**No installation required!**

1. Open your web browser (Chrome, Firefox, Edge)
2. Go to: `https://yourdomain.com`
3. Login with credentials provided by administrator
4. Start using the system

**Benefits:**
- ✅ Works on any device (PC, laptop, tablet)
- ✅ Always up to date
- ✅ No installation needed
- ✅ Access from anywhere

### Option 2: Desktop Application

**For offline work or dedicated desktop experience**

1. **Download**
   - Get installer from: `https://yourdomain.com/download/setup.exe`
   - Or obtain from USB drive/network share

2. **Install**
   - Run `Distribution-System-Setup.exe`
   - Follow installation wizard
   - Default location: `C:\Program Files\Distribution System`

3. **First Run Configuration**
   - Launch application
   - Go to **Settings** → **Server**
   - Enter: `https://api.yourdomain.com`
   - Click **Save**
   - Restart application

4. **Login**
   - Use credentials provided by administrator
   - Username: (your username)
   - Password: (your password)

---

## 🔑 Default Admin Access

**First-time setup:**

After deployment, create the first admin user:

1. Open web browser to: `https://yourdomain.com/register`
2. Create admin account:
   - Username: `admin`
   - Password: (choose strong password)
   - Full Name: Administrator
   - Email: admin@yourcompany.com
   - Role: Admin

Or via direct database:
```bash
# On server
cd /var/www/distribution_system/backend
node scripts/create-admin.js
```

---

## 📱 Mobile Access

The web application is responsive and works on mobile devices:

1. Open mobile browser (Chrome, Safari)
2. Navigate to: `https://yourdomain.com`
3. Add to home screen for app-like experience
4. Login and use

---

## 🔧 User Roles

### Administrator
- Full system access
- User management
- System configuration
- Reports and analytics
- All CRUD operations

### Manager
- View all data
- Manage products, shops, routes
- Approve orders
- Generate reports

### Salesman
- View assigned routes/shops
- Create orders
- Update shop information
- View own performance

### Data Entry
- Add products
- Add shops
- Basic data entry
- Limited view access

---

## 📞 Support

**For Technical Issues:**
- Email: support@yourcompany.com
- Phone: Your support number
- Documentation: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

**For Business Questions:**
- Contact your system administrator

---

## 🔐 Security Best Practices

### For Administrators:
- ✅ Use strong passwords (minimum 12 characters)
- ✅ Enable HTTPS only
- ✅ Regular backups (automated daily)
- ✅ Keep system updated
- ✅ Monitor logs regularly
- ✅ Limit user permissions appropriately

### For End Users:
- ✅ Never share your login credentials
- ✅ Logout when finished
- ✅ Use secure networks (avoid public WiFi)
- ✅ Report suspicious activity immediately
- ✅ Keep desktop app updated

---

## 🆘 Common Issues

### "Cannot connect to server"
**Desktop App:**
- Check internet connection
- Verify server URL in Settings
- Ensure `https://` is included
- Contact administrator if persists

**Web Browser:**
- Check internet connection
- Try refreshing page (Ctrl+F5)
- Clear browser cache
- Try different browser

### "Login failed"
- Verify username and password
- Check Caps Lock is off
- Contact administrator to reset password

### "Page not loading"
- Check internet connection
- Ensure using supported browser (Chrome, Firefox, Edge)
- Clear cookies and cache
- Try incognito/private mode

---

## 📊 System Features

### Core Modules
- ✅ Product Management
- ✅ Shop/Customer Management
- ✅ Route Management
- ✅ Order Processing
- ✅ Inventory Tracking
- ✅ Salesman Management
- ✅ Delivery Management
- ✅ Invoice Generation
- ✅ Payment Processing
- ✅ Reports & Analytics
- ✅ User Management
- ✅ Dashboard Overview

### Reports Available
- Sales reports by period
- Product performance
- Salesman performance
- Shop purchase history
- Inventory status
- Payment summaries
- Delivery tracking

---

## 🔄 Regular Maintenance

### Daily (Automated)
- Database backups at 2 AM
- Log rotation
- Cache cleanup

### Weekly (Administrator)
- Review system logs
- Check disk space
- Monitor performance

### Monthly (Administrator)
- Security updates
- Database optimization
- Backup verification
- User account review

---

**System is ready for production use! 🎉**

For detailed technical deployment instructions, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
