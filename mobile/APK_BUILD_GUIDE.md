# Distribution System Mobile APK Build Guide
## Professional Build Instructions

---

## ✅ PREBUILD COMPLETE

The Android project has been successfully generated at:
```
c:\distribution\distribution_system\mobile\android\
```

---

## 📱 APK BUILD OPTIONS

### OPTION 1: EASIEST - Expo EAS Build (Cloud)

**Advantages:**
- No local Android SDK needed
- Builds in the cloud
- Professional signing
- Automatic updates

**Steps:**
1. Install EAS CLI globally:
   ```powershell
   npm install -g eas-cli
   ```

2. Login to Expo (create free account if needed):
   ```powershell
   cd c:\distribution\distribution_system\mobile
   eas login
   ```

3. Configure project:
   ```powershell
   eas build:configure
   ```

4. Build APK:
   ```powershell
   eas build --platform android --profile preview
   ```

5. Download APK from link provided by EAS

**Time:** ~15-20 minutes (cloud build)
**Cost:** Free for open source projects

---

### OPTION 2: LOCAL BUILD - Using Android Studio

**Requirements:**
- Android Studio installed
- Android SDK configured
- Java JDK 17+
- 8GB+ RAM

**Steps:**

1. Install Android Studio:
   - Download from: https://developer.android.com/studio
   - Install with Android SDK
   - Install Android SDK Platform 34
   - Install Android Build Tools 34.0.0

2. Set environment variables:
   ```powershell
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk', 'User')
   [System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Android\Android Studio\jbr', 'User')
   ```

3. Restart PowerShell and verify:
   ```powershell
   $env:ANDROID_HOME
   ```

4. Build APK:
   ```powershell
   cd c:\distribution\distribution_system\mobile\android
   .\gradlew assembleRelease
   ```

5. Find APK at:
   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```

**Time:** ~30-45 minutes (first build)
**Cost:** Free (but requires setup)

---

### OPTION 3: QUICK TEST - Expo Development Build

**For testing only (not for distribution):**

```powershell
cd c:\distribution\distribution_system\mobile
npx expo run:android
```

This requires Android Studio but creates a development build for immediate testing.

---

## 🔧 CURRENT CONFIGURATION

**App Details:**
- Package Name: `com.ummahtechinnovations.distributionsystem`
- App Name: Distribution System
- Version: 1.0.0
- Version Code: 1

**API Configuration:**
- Current: `http://localhost:5000/api`
- Location: `mobile/src/services/api.js`

⚠️ **IMPORTANT:** Before building for production:
1. Update API URL to your server IP or domain
2. Ensure backend is accessible from mobile devices
3. Test on actual device, not emulator

**To update API URL:**
Edit `mobile/src/services/api.js`:
```javascript
const API_BASE_URL = 'http://YOUR_SERVER_IP:5000/api';
// or
const API_BASE_URL = 'https://yourdomain.com/api';
```

---

## 📦 APK DETAILS

**Expected APK Size:** 50-80 MB
**Minimum Android Version:** Android 6.0 (API 23)
**Target Android Version:** Android 14 (API 34)

**Permissions:**
- INTERNET (required)
- ACCESS_NETWORK_STATE (required)
- ACCESS_WIFI_STATE (optional)

---

## 🚀 DISTRIBUTION

Once APK is built:

1. **Testing:**
   - Install on test device
   - Verify backend connection
   - Test all features

2. **Distribution Methods:**
   - Direct download link
   - Google Play Store (requires developer account $25)
   - Internal distribution via MDM
   - Email/WhatsApp sharing

3. **Installation:**
   - Enable "Install from unknown sources"
   - Transfer APK to device
   - Open and install

---

## ⚠️ TROUBLESHOOTING

**Issue: "Android SDK not found"**
- Solution: Install Android Studio and set ANDROID_HOME

**Issue: "Build failed - no Java"**
- Solution: Install JDK 17 and set JAVA_HOME

**Issue: "App crashes on startup"**
- Solution: Check API URL is correct and backend is running

**Issue: "Cannot connect to backend"**
- Solution: 
  - Use computer's local IP, not "localhost"
  - Ensure backend accepts connections from 0.0.0.0
  - Check firewall settings

---

## 📞 BACKEND CONFIGURATION FOR MOBILE

For mobile devices to connect, backend must listen on all interfaces:

```javascript
// In backend/server.js
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
```

Find your local IP:
```powershell
ipconfig | Select-String "IPv4"
```

Update mobile API URL to: `http://YOUR_LOCAL_IP:5000/api`

---

## ✅ RECOMMENDED: EAS BUILD

For the easiest and most professional approach, I recommend **Option 1 (EAS Build)**.

**Quick Start:**
```powershell
# Install EAS CLI
npm install -g eas-cli

# Navigate to mobile folder
cd c:\distribution\distribution_system\mobile

# Login (creates free account)
eas login

# Build APK
eas build --platform android --profile preview

# Wait ~15 minutes, download APK from link provided
```

---

## 📱 FINAL APK LOCATION

After successful build:

**EAS Build:** Download link will be provided in console
**Local Build:** `mobile/android/app/build/outputs/apk/release/app-release.apk`

---

**Need help?** The Expo documentation is excellent:
https://docs.expo.dev/build/setup/

---

*Build prepared on December 3, 2025*
*Ummahtechinnovations - Distribution Management System*
