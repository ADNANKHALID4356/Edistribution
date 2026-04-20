# Server Configuration

## Changing the Backend Server

To change the server URL for production deployment, update **only one file** per app:

### Desktop App
Edit `desktop/src/utils/serverConfig.js`:
```javascript
const DEFAULT_CONFIG = {
  host: '147.93.108.205',  // ← Change this IP
  port: '5001',            // ← Change this port
  protocol: 'http'         // ← Use 'https' for SSL
};
```

### Mobile App
Edit `mobile/src/utils/serverConfig.js`:
```javascript
const DEFAULT_CONFIG = {
  host: '147.93.108.205',  // ← Change this IP
  port: '5001',            // ← Change this port
  protocol: 'http'         // ← Use 'https' for SSL
};
```

## Runtime Configuration
Users can also change the server at runtime through **Settings → Server Configuration** in both apps without rebuilding.
