# Distribution Management System - Mobile App

React Native mobile application built with Expo for the Distribution Management System.

## Prerequisites

- Node.js v22.20.0 or later
- npm or yarn
- Expo Go app installed on your mobile device (iOS/Android)
- Backend server running on http://localhost:5000

## Installation

All dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Configuration

### For Physical Device Testing with Expo Go

1. **Get your computer's IP address:**
   ```powershell
   ipconfig
   ```
   Look for your "IPv4 Address" (e.g., 192.168.1.100)

2. **Update API base URL:**
   Open `src/services/api.js` and replace:
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```
   with:
   ```javascript
   const API_BASE_URL = 'http://YOUR_IP_ADDRESS:5000/api';
   ```
   Example: `http://192.168.1.100:5000/api`

3. **Ensure same WiFi network:**
   Your phone and computer must be on the same WiFi network.

### For Emulator/Simulator

No configuration needed - `localhost` will work fine.

## Running the App

1. **Start the backend server** (in backend directory):
   ```bash
   npm start
   ```

2. **Start Expo development server** (in mobile directory):
   ```bash
   npm start
   ```

3. **Scan QR code with Expo Go:**
   - iOS: Open Camera app and scan QR code
   - Android: Open Expo Go app and tap "Scan QR code"

## Test Credentials

- **Admin:** username: `admin`, password: `admin123`
- **Manager:** username: `manager1`, password: `admin123`
- **Salesman:** username: `salesman1`, password: `admin123`

## Project Structure

```
mobile/
├── app/                    # Expo Router (app entry point)
│   └── _layout.tsx        # Root layout with navigation
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/          # React Context (AuthContext)
│   ├── navigation/       # Navigation stacks (Auth, App, Root)
│   ├── screens/          # Screen components (Login, Dashboard)
│   ├── services/         # API services (api.js, authService.js)
│   └── utils/            # Utility functions
├── assets/               # Images, fonts, etc.
└── package.json
```

## Features (Sprint 1)

- ✅ User authentication (login/logout)
- ✅ JWT token management with AsyncStorage
- ✅ Role-based access control
- ✅ Session persistence
- ✅ Welcome dashboard with user info
- ✅ Material Design UI with React Native Paper

## Technologies

- **Framework:** React Native + Expo
- **UI Library:** React Native Paper (Material Design)
- **Navigation:** React Navigation (Native Stack)
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Local Storage:** AsyncStorage
- **Authentication:** JWT tokens

## Troubleshooting

### Cannot connect to backend

1. Verify backend is running: Open http://localhost:5000/api/health in browser
2. Check your IP address is correct in `src/services/api.js`
3. Ensure phone and computer are on same WiFi network
4. Check Windows Firewall isn't blocking port 5000

### App crashes on launch

1. Clear Expo cache: `npx expo start -c`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for errors in Expo Go app error overlay

### Token expired error

- Tokens expire after 7 days. Simply login again.

## Development Notes

- This app uses Expo's managed workflow
- No native code modifications needed
- Hot reload enabled for fast development
- All API calls go through the centralized `api.js` service

## Next Sprint

Sprint 2 will add:
- Product listing
- Product details view
- Barcode scanning
- Inventory management (read-only for salesmen)

## Support

For issues or questions, contact: ummahtechinnovations.com
