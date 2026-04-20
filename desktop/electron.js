const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

// Start backend server
function startBackend() {
  console.log('🚀 Starting backend server...');
  
  // Use Node.js backend instead of executable
  const backendPath = path.join(__dirname, '..', 'backend');
  const serverPath = path.join(backendPath, 'server.js');
  
  console.log(`📂 Backend path: ${serverPath}`);
  
  // Check if backend exists
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Backend server.js not found!');
    console.error(`   Expected at: ${serverPath}`);
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
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    // Don't log experimental warnings
    if (!message.includes('ExperimentalWarning')) {
      console.error(`Backend Error: ${message}`);
    }
  });

  backendProcess.on('error', (error) => {
    console.error(`Failed to start backend: ${error.message}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Inform user that backend stopped
      mainWindow.webContents.executeJavaScript(`
        alert('Backend server stopped unexpectedly. Please restart the application.');
      `);
    }
  });

  // Wait for backend to start
  return new Promise((resolve) => {
    console.log('⏳ Waiting for backend to start...');
    setTimeout(() => {
      console.log('✅ Backend should be ready now');
      resolve();
    }, 5000); // Give backend 5 seconds to start
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'Distribution Management System'
  });

  // Load the React app using loadFile (more reliable than loadURL)
  const filePath = path.join(__dirname, 'build', 'index.html');
  console.log(`📂 Loading app from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ ERROR: Build folder not found!');
    console.error(`   Expected: ${filePath}`);
    console.error('   Please run: npm run build');
    mainWindow.loadURL('data:text/html,<h1>Error: Build folder not found</h1><p>Please run: npm run build</p>');
  } else {
    mainWindow.loadFile(filePath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Handle page load errors
  mainWindow.webContents.on('crashed', () => {
    console.error('❌ Renderer process crashed');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`❌ Failed to load: ${errorDescription} (code: ${errorCode})`);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page finished loading');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app
app.whenReady().then(async () => {
  // Start backend first
  await startBackend();
  
  // Then create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill backend process when app closes
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Ensure backend is stopped
  if (backendProcess) {
    backendProcess.kill();
  }
});
