# Expo Go Connection Issues - Solutions

## Current Issue
Error: "java.IOException: Failed to download remote update"

This happens because Expo Go can't reach your development server.

## Solution 1: Use Tunnel Mode (EASIEST)

Run the mobile app with tunnel mode:
```bash
cd mobile
npx expo start --tunnel
```

When prompted to install @expo/ngrok, press `Y` and Enter.

Scan the new tunnel QR code with Expo Go - this works on any network!

---

## Solution 2: Use Local Backend for Development

If you want to develop locally instead of using VPS:

1. Start local backend:
```bash
cd backend
npm start
```

2. Update mobile/src/utils/serverConfig.js:
```javascript
// Comment out VPS config:
// const DEFAULT_CONFIG = {
//   host: '147.93.108.205',
//   port: '5001',
//   protocol: 'http'
// };

// Uncomment local config:
const DEFAULT_CONFIG = {
  host: '172.16.0.2',    // Your current local IP
  port: '5000',
  protocol: 'http'
};
```

3. Start Expo normally:
```bash
cd mobile
npx expo start
```

---

## Solution 3: Check Network Settings

Make sure:
- ✅ Phone and computer are on the SAME WiFi network
- ✅ Windows Firewall allows Node.js connections
- ✅ Your IP address hasn't changed (current: 172.16.0.2)

---

## Production vs Development

**For Expo Go Testing (Development):**
- Use tunnel mode: `npx expo start --tunnel`
- OR use local backend with local IP

**For Production Testing:**
- App is already configured for VPS (147.93.108.205:5001)
- Build APK using: `npm run build:apk`
- Install APK on device (doesn't need Expo Go)

---

## Quick Commands

```bash
# Tunnel mode (recommended for Expo Go)
cd mobile && npx expo start --tunnel

# Local mode with clear cache
cd mobile && npx expo start --clear

# Stop all and restart local backend
cd backend && npm start
```
