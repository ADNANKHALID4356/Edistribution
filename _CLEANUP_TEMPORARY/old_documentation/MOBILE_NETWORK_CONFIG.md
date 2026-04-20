# Mobile App Network Configuration Guide

## Problem: Login Failed on Mobile Device

When running the mobile app on a physical device or emulator, you may encounter login failures because the app cannot reach the backend server.

## Root Cause

- **Issue**: Mobile app was configured to use `localhost:5000`
- **Why it fails**: `localhost` on a mobile device refers to the device itself, not your computer
- **Solution**: Mobile app must use your computer's actual network IP address

## How to Fix

### Step 1: Find Your Computer's IP Address

#### On Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (Wi-Fi or Ethernet)

#### On Mac/Linux:
```bash
ifconfig
```
or
```bash
ip addr show
```

### Step 2: Update Mobile App Configuration

The default configuration has been updated to use your current IP: **10.8.128.47**

Files updated:
- `mobile/src/utils/serverConfig.js` - Default server host
- `mobile/src/services/api.js` - Initial base URL

### Step 3: Restart the Mobile App

After changing the configuration:
1. Stop the Expo development server (Ctrl+C)
2. Clear the cache: `npx expo start -c`
3. Reload the app on your device

## Using the App's Built-in Server Settings

You can also change the server IP without rebuilding the app:

1. Open the app on your device
2. On the Login screen, tap **"Server Settings"**
3. Enter your computer's IP address: `10.8.128.47`
4. Port: `5000`
5. Protocol: `http`
6. Tap **"Test Connection"** to verify
7. Tap **"Save"** and return to login

## Important Notes

### For Development

- **Same Network**: Ensure both your computer and mobile device are on the same Wi-Fi network
- **Firewall**: Make sure your firewall allows connections on port 5000
- **Backend**: The backend must be running and listening on `0.0.0.0:5000` (already configured)

### IP Address Changes

Your computer's IP may change when:
- You switch networks
- Your router assigns a new IP
- You restart your router

**Solution**: Use the app's "Server Settings" to update the IP without rebuilding

### For Production

For production deployment:
- Use a fixed domain name or static IP
- Enable HTTPS (SSL)
- Update `CORS_ORIGIN` in backend `.env`

## Current Configuration

**Backend Server:**
- Host: `0.0.0.0` (listens on all network interfaces)
- Port: `5000`
- Network IP: `10.8.128.47`
- URL: `http://10.8.128.47:5000/api`

**Mobile App Default:**
- Host: `10.8.128.47`
- Port: `5000`
- Protocol: `http`
- Full URL: `http://10.8.128.47:5000/api`

## Verification

### Check Backend is Running

```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

### Test Backend Connection

```bash
curl http://10.8.128.47:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-01-25T...",
  "environment": "development"
}
```

## Test Credentials

After the connection is fixed, you can test with these credentials:

**Salesmen (role_id = 3):**
- Username: `salesman1` to `salesman10`
- Password: `password123`

**Admin (role_id = 1):**
- Username: `admin`
- Password: `admin123`

## Troubleshooting

### Still Can't Connect?

1. **Check if backend is running:**
   ```bash
   cd backend
   npm start
   ```

2. **Verify firewall allows port 5000:**
   - Windows: Settings → Firewall → Allow an app
   - Mac: System Preferences → Security → Firewall
   - Allow Node.js or port 5000

3. **Check network connectivity:**
   - Both devices on same network?
   - Can you ping your computer from mobile device?

4. **Test from browser on mobile device:**
   - Open browser on mobile
   - Go to: `http://10.8.128.47:5000/api/health`
   - Should see JSON response

### Error: "Network request failed"

- Backend is not running
- Wrong IP address
- Firewall blocking connection
- Devices on different networks

### Error: "Connection refused"

- Backend not listening on `0.0.0.0`
- Port 5000 is not open
- Backend crashed or stopped

## Quick Fix Command

If your IP changes, update the mobile app default config:

```bash
# Edit mobile/src/utils/serverConfig.js
# Change the host value to your new IP
host: 'YOUR_NEW_IP_HERE'
```

Then restart Expo with cache clear:
```bash
npx expo start -c
```
