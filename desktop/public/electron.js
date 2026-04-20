const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

// Detect if in development or production
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'Distribution Management System - Ummahtechinnovations'
  });

  // Load the app
  let startUrl;
  if (isDev) {
    startUrl = 'http://localhost:3000';
  } else {
    // In packaged app, index.html is in the same directory as this file
    const indexPath = path.join(__dirname, 'index.html');
    startUrl = url.format({
      pathname: indexPath,
      protocol: 'file:',
      slashes: true
    });
  }
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
