const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Distribution Management System',
    autoHideMenuBar: true,
  });

  // Determine the correct path for index.html
  // In dev: __dirname = public/, so need ../build/index.html
  // In packaged: __dirname = resources/app/, so need build/index.html
  const indexPath = app.isPackaged
    ? path.join(__dirname, 'build', 'index.html')
    : path.join(__dirname, '..', 'build', 'index.html');
  
  const startUrl = url.format({
    pathname: indexPath,
    protocol: 'file:',
    slashes: true
  });
  
  console.log('Is packaged:', app.isPackaged);
  console.log('Loading from:', indexPath);
  mainWindow.loadURL(startUrl);

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
