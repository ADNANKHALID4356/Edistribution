/**
 * Electron main process — production-first startup.
 *
 * Normal use (RUN-APP.bat): requires desktop/build/index.html — never starts webpack dev server.
 * Dev use only: set USE_DEV_SERVER=true (electron:dev / START-DEV-FOR-PRINT-TEST.bat).
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const APP_WINDOW_TITLE = 'Enterprise_Distribution_Management_System';
const BUILD_INDEX = path.join(__dirname, 'build', 'index.html');
const BACKEND_HEALTH = 'http://127.0.0.1:5000/api/health';
const STATIC_PORT = 3010;

let mainWindow;
let backendProcess;
let staticServer;

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, 'public', 'app-icon.png'),
    path.join(__dirname, 'public', 'icon.ico'),
    path.join(__dirname, 'build', 'favicon.ico'),
    path.join(__dirname, 'icon.ico'),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function hasProductionBuild() {
  return fs.existsSync(BUILD_INDEX);
}

function httpOk(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startBackendIfNeeded() {
  return new Promise(async (resolve) => {
    if (await httpOk(BACKEND_HEALTH)) {
      console.log('✅ Backend already running');
      resolve(null);
      return;
    }

    const backendPath = path.join(__dirname, '..', 'backend');
    const serverPath = path.join(backendPath, 'server.js');
    if (!fs.existsSync(serverPath)) {
      console.warn('⚠️ backend/server.js not found');
      resolve(null);
      return;
    }

    console.log('🚀 Starting backend...');
    backendProcess = spawn(process.execPath, [serverPath], {
      cwd: backendPath,
      env: { ...process.env, USE_SQLITE: 'true', NODE_ENV: 'development', PORT: '5000' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    for (let i = 0; i < 45; i++) {
      if (await httpOk(BACKEND_HEALTH)) {
        console.log('✅ Backend ready');
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    resolve(backendProcess);
  });
}

function startStaticServer() {
  const buildDir = path.join(__dirname, 'build');
  return new Promise((resolve, reject) => {
    const mime = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    staticServer = http.createServer((req, res) => {
      let reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(buildDir, safe);
      if (!filePath.startsWith(buildDir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = BUILD_INDEX;
      }
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    staticServer.on('error', reject);
    staticServer.listen(STATIC_PORT, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${STATIC_PORT}`);
    });
  });
}

function showFatalError(message) {
  const win = new BrowserWindow({
    width: 680,
    height: 480,
    title: 'Cannot start application',
    autoHideMenuBar: true,
  });
  const html = `data:text/html,${encodeURIComponent(`
    <html><body style="font-family:Segoe UI,sans-serif;padding:28px;line-height:1.55;color:#111">
      <h2 style="margin:0 0 12px">Could not start the app</h2>
      <pre style="white-space:pre-wrap;background:#f1f5f9;padding:14px;font-size:13px">${message}</pre>
      <h3 style="margin:16px 0 8px;font-size:14px">Fix (recommended)</h3>
      <ol style="margin:0;padding-left:20px;font-size:13px">
        <li>Close Chrome, Cursor, and other heavy apps</li>
        <li>Double-click <b>FORCE-REBUILD-APP.bat</b> in the project folder</li>
        <li>When it says Build OK, double-click <b>RUN-APP.bat</b></li>
      </ol>
      <p style="font-size:12px;color:#555;margin-top:14px">Login: admin / admin123</p>
    </body></html>
  `)}`;
  win.loadURL(html);
}

function createMainWindow(loadUrl) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: resolveAppIcon(),
    title: APP_WINDOW_TITLE,
    autoHideMenuBar: true,
    show: true,
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
    mainWindow.setTitle(APP_WINDOW_TITLE);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isPrintPopup =
      !url || url === 'about:blank' || url.startsWith('about:') || url.startsWith('blob:');
    const isLocal =
      url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('file://');
    if (isPrintPopup || isLocal) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  console.log('Loading UI:', loadUrl);
  mainWindow.loadURL(loadUrl);
}

async function startProductionMode() {
  if (!hasProductionBuild()) {
    showFatalError(
      'Production UI not found (desktop/build/index.html is missing).\n\n' +
        'RUN-APP.bat should build the UI before opening Electron. ' +
        'If build failed, your PC may be low on memory.\n\n' +
        'Do NOT run "npm run electron" alone without a successful build.'
    );
    return;
  }

  await startBackendIfNeeded();
  const url = await startStaticServer();
  createMainWindow(url);
}

async function startDevMode() {
  const { resolveUiUrl } = require('./scripts/app-orchestrator');
  try {
    const result = await resolveUiUrl({
      onStatus: (t) => console.log(t),
      allowDevServer: true,
      skipBuild: true,
    });
    if (result.devChild) {
      // orchestrator may return dev child — parent doesn't track it here
    }
    createMainWindow(result.url);
  } catch (err) {
    console.error(err);
    showFatalError(err.message || String(err));
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  app.setName(APP_WINDOW_TITLE);

  const useDev = process.env.USE_DEV_SERVER === 'true';
  console.log(useDev ? 'Mode: development (port 3000)' : 'Mode: production (desktop/build)');

  if (useDev) {
    await startDevMode();
  } else {
    await startProductionMode();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (staticServer) {
    try { staticServer.close(); } catch (_) {}
  }
  if (backendProcess && !backendProcess.killed) {
    try { backendProcess.kill(); } catch (_) {}
  }
});

app.on('certificate-error', (event, _wc, _url, _err, _cert, callback) => {
  if (!app.isPackaged) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
