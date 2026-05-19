# Mobile App - Local Backend Testing Configuration

## Expo Go (physical phone) — quick start

1. **Backend** must be running: `cd backend && npm start` (port **5000**).
2. **Same WiFi** — phone and PC on the same network.
3. **Start Expo with LAN** (from `mobile` folder):
   - Double-click `START-EXPO-GO.bat`, **or**
   - `npm run start:go`
4. **Scan QR** in the **Expo Go** app (not the camera app on Android).
5. If QR still fails: `npm run start:tunnel` and scan again (slower but works across networks).
6. **Update Expo Go** from the Play Store / App Store (SDK 54 required).

**LAN IP in config:** `192.168.148.95` — update `START-EXPO-GO.bat` and `src/utils/serverConfig.js` if your PC IP changes (`ipconfig`).

**Common fixes:**
- Close old Metro/Expo windows (port 8081 busy).
- Allow Node.js through Windows Firewall (ports 8081, 19000).
- Do not use `172.16.x.x` unless the phone is on that same subnet.

---

## Current Configuration

**File:** `mobile/src/utils/serverConfig.js`

```javascript
host: '192.168.148.95'  // PC WiFi IPv4 (Expo Go on physical device)
port: '5000'
protocol: 'http'
```

For **Android Emulator**, use `host: '10.0.2.2'`. For **iOS Simulator**, use `host: 'localhost'`.

---

## Testing Scenarios

### ✅ Scenario 1: Android Emulator (CURRENT SETUP)
**Configuration:** `host: '10.0.2.2'`

**Steps:**
1. Start backend server: `cd backend && npm start`
2. Verify backend running on port 5000
3. Start Metro: `cd mobile && npm start`
4. Press `a` to run on Android emulator
5. Login and test order placement

**Advantages:**
- Works out of the box
- No network configuration needed
- Fast and reliable

---

### Scenario 2: iOS Simulator
**Configuration:** Change to `host: 'localhost'`

**Edit:** `mobile/src/utils/serverConfig.js`
```javascript
const DEFAULT_CONFIG = {
  host: 'localhost',  // For iOS Simulator
  port: '5000',
  protocol: 'http'
};
```

---

### Scenario 3: Physical Android/iOS Device
**Configuration:** Use your computer's actual IP address

**Steps to find your IP:**

**Windows:**
```bash
ipconfig | findstr IPv4
```
Look for something like: `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

**Update Configuration:**
```javascript
const DEFAULT_CONFIG = {
  host: '192.168.1.100',  // Your actual IP
  port: '5000',
  protocol: 'http'
};
```

**Important:**
- ✅ Both device and computer must be on same WiFi network
- ✅ Disable Windows Firewall temporarily OR add port 5001 exception
- ✅ Test connection: Open `http://192.168.1.100:5000/api/health` in device browser

---

## Testing the Order Placement Flow

### 1. Start Backend
```bash
cd backend
npm start
```

**Verify:** 
- ✅ Server running on port 5001
- ✅ Database connected successfully
- ✅ No errors in console

### 2. Start Mobile App
```bash
cd mobile
npm start
```

**For Android Emulator:**
```bash
# Press 'a' in Metro terminal
```

**For Physical Device:**
```bash
# Scan QR code shown in terminal
# OR shake device → Settings → Debug server → Enter computer IP
```

### 3. Login
- Username: `admin`
- Password: `admin123`

### 4. Test Order Flow
1. Go to **Orders** or **Order Management**
2. Create a new order:
   - Select shop
   - Select products
   - Set quantities
   - Save order
3. **Verify** order appears in list
4. **Check Backend Logs** - should show order creation

### 5. Test Delivery Creation (Desktop)
1. Open desktop app
2. Go to **Delivery Challan** page
3. Select the order you just created
4. Generate delivery challan
5. **Verify** delivery created successfully

---

## Troubleshooting

### Issue: "Network Error" or "Cannot connect to server"

**Android Emulator:**
1. Check backend is running: `http://localhost:5000/api/health`
2. Verify emulator can reach host: `adb shell ping 10.0.2.2`
3. Try restarting Metro: Close and run `npm start`
4. Clear app data: Settings → Apps → Distribution App → Clear Data

**Physical Device:**
1. Check device and computer on same WiFi
2. Test in device browser: `http://YOUR_IP:5000/api/health`
3. Disable firewall temporarily
4. Check port 5000 not blocked

### Issue: "Connection Timeout"

**Solution:**
1. Increase timeout in `mobile/src/services/api.js`:
```javascript
timeout: 60000, // Increase to 60 seconds
```

2. Check backend performance - large orders may take time

### Issue: "Cannot find module" or build errors

**Solution:**
```bash
cd mobile
rm -rf node_modules
npm install
npm start -- --reset-cache
```

---

## Reset to Production Server

To switch back to VPS production server:

**Edit:** `mobile/src/utils/serverConfig.js`
```javascript
const DEFAULT_CONFIG = {
  host: '147.93.108.205',  // VPS Production
  port: '5000',
  protocol: 'http'
};
```

Then **rebuild the app** or force close and reopen.

---

## Quick Reference

| Platform | Host Configuration |
|----------|-------------------|
| Android Emulator | `10.0.2.2` |
| iOS Simulator | `localhost` |
| Physical Device (same WiFi) | Your computer's IP (e.g., `192.168.1.100`) |
| Production (VPS) | `147.93.108.205` |

**All use:**
- Port: `5000` (local) or `5005` (VPS)
- Protocol: `http`
- Path: `/api`

---

## Testing Checklist

**Backend:**
- [ ] Backend server running on port 5000
- [ ] Database connected (SQLite for local testing)
- [ ] No console errors
- [ ] Health check responds: `http://localhost:5000/api/health`

**Mobile:**
- [ ] Metro bundler running
- [ ] App installed on emulator/device
- [ ] Can reach login screen
- [ ] Server config matches testing scenario (Android/iOS/Physical)

**Login:**
- [ ] Can login with admin credentials
- [ ] Token stored successfully
- [ ] User data loaded

**Order Creation:**
- [ ] Shops list loads
- [ ] Products list loads
- [ ] Can create order
- [ ] Order appears in backend (check logs)
- [ ] Order appears in mobile app list

**Integration:**
- [ ] Desktop app can see mobile-created orders
- [ ] Can create delivery from mobile order
- [ ] Shop ledger updated correctly

---

**Status:** Ready for mobile testing with local backend! 📱

**Note:** If testing on physical device, don't forget to update to your actual IP address!
