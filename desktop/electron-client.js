const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;

// Check if backend is responding
function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start the backend Node.js server
function startBackend() {
  console.log('🚀 Starting backend server...');
  
  const backendPath = path.join(__dirname, '..', 'backend');
  const serverPath = path.join(backendPath, 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Backend server.js not found!');
    return Promise.reject(new Error('Backend server.js not found'));
  }
  
  // Start backend process
  backendProcess = spawn('node', [serverPath], {
    cwd: backendPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      USE_SQLITE: 'true',
      PORT: '5000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (!message.includes('ExperimentalWarning') && message) {
      console.error(`Backend Error: ${message}`);
    }
  });

  backendProcess.on('error', (error) => {
    console.error(`Failed to start backend: ${error.message}`);
  });

  // Wait for backend to respond
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    const checkInterval = setInterval(async () => {
      attempts++;
      const isHealthy = await checkBackendHealth();
      
      if (isHealthy) {
        clearInterval(checkInterval);
        console.log('✅ Backend is ready!');
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('⚠️ Backend might not be ready, but continuing...');
        resolve();
      }
    }, 1000);
  });
}

function createWindow() {
  console.log('📱 Creating main window...');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'build', 'favicon.ico'),
    title: 'Distribution Management System',
    show: false, // Don't show until ready
  });

  // Load the built React app from file system using loadFile which is more reliable
  const filePath = path.join(__dirname, 'build', 'index.html');
  console.log('Loading file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ ERROR: index.html not found at:', filePath);
    mainWindow.loadURL('data:text/html,<h1>Error: Build folder not found. Please run: npm run build</h1>');
  } else {
    mainWindow.loadFile(filePath);
  }

  // Show window when ready - with timeout fallback
  let isShown = false;
  
  mainWindow.once('ready-to-show', () => {
    if (!isShown) {
      console.log('✅ Window ready-to-show event fired');
      isShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  // Fallback: Show window after 3 seconds if ready-to-show doesn't fire
  const showWindowTimeout = setTimeout(() => {
    if (!isShown && mainWindow && !mainWindow.isDestroyed()) {
      console.warn('⏱️  Timeout waiting for ready-to-show, showing window anyway');
      isShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);
  
  // Handle page load errors
  mainWindow.webContents.on('crashed', () => {
    console.error('❌ Renderer process has crashed');
    if (!isShown) {
      mainWindow.show();
    }
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`❌ Failed to load: ${errorDescription} (code: ${errorCode})`);
    if (!isShown) {
      isShown = true;
      mainWindow.show();
    }
  });
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Console [${level}]: ${message}`);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page finished loading');
    if (!isShown) {
      isShown = true;
      clearTimeout(showWindowTimeout);
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
    clearTimeout(showWindowTimeout);
  });

  // Create application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Distribution Management System',
              detail: 'Version 1.0.0\n\nDeveloped by Ummahtechinnovations\n\nA professional distribution management system for warehouse and sales operations.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  console.log('\n🕐 Electron app is ready!');
  console.log('📝 Creating main window...');
  
  // Create the window
  createWindow();
  
  console.log('✅ Window creation initiated');
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  console.log('All windows closed, quitting app...');
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App is quitting');
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// Handle certificate errors (for development with self-signed certs)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // In development, ignore certificate errors
  if (!app.isPackaged) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
