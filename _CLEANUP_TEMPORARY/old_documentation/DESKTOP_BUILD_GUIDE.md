# Distribution System - Desktop App Build Guide

## 🖥️ Building Desktop App for Client Distribution

This guide explains how to build and distribute the desktop application to your clients.

---

## 📋 Prerequisites

- Node.js 18.x or newer
- npm or yarn
- Windows/Linux/macOS (depending on target platform)

---

## 🔧 Configure Server URL (Before Building)

### Option 1: Hardcoded Server URL (Recommended for Enterprise)

Edit `desktop/src/utils/serverConfig.js`:

```javascript
const DEFAULT_CONFIG = {
  host: 'your-server-ip-or-domain',  // e.g., 'api.yourdomain.com' or '147.93.108.205'
  port: '443',  // 443 for HTTPS, 80 for HTTP, 5000 for direct
  protocol: 'https'  // 'https' recommended, 'http' for testing
};
```

**Advantages:**
- Clients don't need to configure anything
- Easier support and deployment
- Consistent across all installations

### Option 2: User-Configurable (Flexible)

Leave the default as `localhost`. Users will configure the server URL on first launch.

**Advantages:**
- Flexible for different servers
- Can work with local and remote servers
- Easy testing

---

## 🏗️ Build Instructions

### Step 1: Navigate to Desktop Folder
```bash
cd desktop
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build React App
```bash
npm run build
```

### Step 4: Package Desktop App

#### For Windows:
```bash
npm run electron-build
```

This creates:
- `dist/Distribution Management System-Setup.exe` (Installer)
- `dist/win-unpacked/` (Portable version)

#### For Linux:
```bash
npm run electron-build -- --linux
```

#### For macOS:
```bash
npm run electron-build -- --mac
```

---

## 📦 Distribution Options

### Option 1: Installer (.exe for Windows)

**Location:** `desktop/dist/Distribution Management System-Setup.exe`

**Distribution Methods:**
1. **Upload to Website**
   - Host on your website: `https://yourdomain.com/downloads/app-setup.exe`
   - Provide download link to clients

2. **Email Distribution**
   - Compress the installer: `zip app-setup.zip app-setup.exe`
   - Email to clients
   - Include installation instructions

3. **Cloud Storage**
   - Google Drive, Dropbox, OneDrive
   - Share link with clients

4. **USB/Physical Media**
   - Copy installer to USB drives
   - Distribute physically

### Option 2: Portable Version (No Installation Required)

**Location:** `desktop/dist/win-unpacked/`

**Advantages:**
- No installation needed
- Can run from USB
- No admin rights required

**Distribution:**
1. Zip the entire `win-unpacked` folder
2. Clients extract and run `Distribution Management System.exe`

---

## 📝 Client Installation Instructions

### Using Installer (.exe)

1. Download the installer
2. Double-click to run
3. Follow installation wizard
4. Launch app from Desktop/Start Menu
5. Configure server connection (if not hardcoded):
   - Click "Settings" or "Server Configuration"
   - Enter server IP/domain
   - Enter port (usually 5000, 80, or 443)
   - Select protocol (http or https)
   - Click "Save"
6. Login with provided credentials

### Using Portable Version

1. Download and extract the zip file
2. Navigate to extracted folder
3. Double-click `Distribution Management System.exe`
4. Configure server connection (if needed)
5. Login with credentials

---

## 🔄 Auto-Update Configuration (Optional)

To enable auto-updates for your desktop app:

1. Host your releases on GitHub Releases
2. Configure electron-builder for auto-updates
3. Clients will be notified of new versions

---

## 🌐 Server Connection Configuration

### For Clients

**If server URL is NOT hardcoded:**

On first launch, clients need to configure:

1. **Server Settings Screen:**
   - Host: `your-server-ip` or `yourdomain.com`
   - Port: 
     - `5000` - Direct connection to backend
     - `80` - If using Nginx without SSL
     - `443` - If using Nginx with SSL
   - Protocol:
     - `http` - For non-SSL connections
     - `https` - For SSL connections (recommended)

2. **Test Connection:**
   - App should show "Connected" status
   - If connection fails, verify:
     - Server is running
     - Firewall allows the port
     - Server IP/domain is correct

---

## 🛠️ Troubleshooting

### Build Errors

**Error: "Cannot find module 'electron'"**
```bash
npm install
```

**Error: "electron-builder not found"**
```bash
npm install electron-builder --save-dev
```

### Connection Issues

**App shows "Cannot connect to server"**
- Verify server is running: `pm2 status distribution-api`
- Check server IP/domain
- Verify port is open in firewall
- Test with curl: `curl http://your-server:5000/api`

**Login fails**
- Verify credentials
- Check backend logs: `pm2 logs distribution-api`
- Ensure database is running

### Performance Issues

**App is slow**
- Check network latency to server
- Verify server resources (CPU, RAM)
- Check database performance

---

## 📊 Build Configurations

### Development Build (Testing)
```bash
npm start  # Runs in development mode
```

### Production Build (Distribution)
```bash
npm run build  # Creates optimized build
npm run electron-build  # Packages for distribution
```

---

## 🔐 Security Notes

1. **Always use HTTPS** in production
2. **Change default credentials** before distributing
3. **Secure server access** with firewall rules
4. **Regular updates** for security patches
5. **SSL certificates** for encrypted communication

---

## 📞 Support Information

Provide clients with:
- Installation guide (this document)
- Server connection details
- Login credentials
- Support contact information
- Troubleshooting steps

---

## ✅ Pre-Distribution Checklist

Before distributing to clients:

- [ ] Server is deployed and running
- [ ] Database is configured
- [ ] SSL certificate installed (if applicable)
- [ ] Server URL configured in app (if hardcoded)
- [ ] App tested with server connection
- [ ] Login credentials created for clients
- [ ] Installation instructions prepared
- [ ] Support contact information ready
- [ ] Backup procedures in place

---

**Happy deploying! 🚀**
