const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('✅ Electron app file loaded');

app.whenReady().then(() => {
  console.log('✅ App ready');
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true  // Show immediately without waiting
  });
  
  console.log('✅ Window created');
  
  const filePath = path.join(__dirname, 'build', 'index.html');
  console.log('Loading:', filePath);
  
  mainWindow.loadFile(filePath).catch(err => {
    console.error('Error loading file:', err);
    mainWindow.loadURL('data:text/html,<h1>Error loading app</h1><p>' + err.message + '</p>');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
  });
  
  mainWindow.webContents.on('crashed', () => {
    console.error('Page crashed');
  });
});

app.on('window-all-closed', () => {
  console.log('Closing app');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
