/**
 * Shared startup logic: backend health, optional build, UI URL detection.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const INDEX_HTML = path.join(BUILD_DIR, 'index.html');
const BACKEND_PORT = 5000;
const DEV_PORT = 3000;
const STATIC_PORT = 3010;

function httpOk(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
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

function hasProductionBuild() {
  return fs.existsSync(INDEX_HTML);
}

function startBuildStaticServer() {
  return new Promise((resolve, reject) => {
    const mime = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    const server = http.createServer((req, res) => {
      let reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(BUILD_DIR, safePath);
      if (!filePath.startsWith(BUILD_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = INDEX_HTML;
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

    server.on('error', reject);
    server.listen(STATIC_PORT, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${STATIC_PORT}` });
    });
  });
}

function runBuild(onLog) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, 'build-production.js');
    const child = spawn(process.execPath, [script], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const forward = (chunk) => {
      const text = chunk.toString();
      if (onLog) onLog(text);
      else process.stdout.write(text);
    };

    child.stdout.on('data', forward);
    child.stderr.on('data', forward);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && hasProductionBuild()) resolve(true);
      else reject(new Error(`Build exited with code ${code}`));
    });
  });
}

function startDevServer(onLog) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const child = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'start'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        BROWSER: 'none',
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
        DISABLE_ESLINT_PLUGIN: 'true',
        GENERATE_SOURCEMAP: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWin,
    });

    const forward = (chunk) => {
      const text = chunk.toString();
      if (onLog) onLog(text);
    };
    child.stdout.on('data', forward);
    child.stderr.on('data', forward);
    child.on('error', reject);

    let settled = false;
    const poll = setInterval(async () => {
      if (await httpOk(`http://127.0.0.1:${DEV_PORT}`)) {
        clearInterval(poll);
        if (!settled) {
          settled = true;
          resolve({ child, url: `http://127.0.0.1:${DEV_PORT}` });
        }
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(poll);
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error('Dev server did not start within 5 minutes'));
      }
    }, 300000);

    child.on('close', (code) => {
      if (!settled && code !== 0) {
        settled = true;
        clearInterval(poll);
        reject(new Error(`Dev server exited (${code})`));
      }
    });
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '..', '..', 'backend');
    const serverPath = path.join(backendPath, 'server.js');
    if (!fs.existsSync(serverPath)) {
      reject(new Error('backend/server.js not found'));
      return;
    }

    const child = spawn(process.execPath, [serverPath], {
      cwd: backendPath,
      env: { ...process.env, USE_SQLITE: 'true', NODE_ENV: 'development', PORT: String(BACKEND_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      if (await httpOk(`http://127.0.0.1:${BACKEND_PORT}/api/health`)) {
        clearInterval(timer);
        resolve(child);
      } else if (attempts > 45) {
        clearInterval(timer);
        resolve(child);
      }
    }, 1000);
  });
}

async function ensureBackend(onStatus) {
  if (await httpOk(`http://127.0.0.1:${BACKEND_PORT}/api/health`)) {
    onStatus?.('Backend already running on port 5000');
    return null;
  }
  onStatus?.('Starting backend on port 5000...');
  return startBackend();
}

/**
 * Returns { url, staticServer, devChild, backendChild }
 */
async function resolveUiUrl({ onStatus, onLog, skipBuild = false, allowDevServer = false }) {
  const backendChild = await ensureBackend(onStatus);

  if (hasProductionBuild()) {
    onStatus?.('Opening login screen...');
    const { server, url } = await startBuildStaticServer();
    return { url, staticServer: server, backendChild };
  }

  if (allowDevServer) {
    if (await httpOk(`http://127.0.0.1:${DEV_PORT}`)) {
      onStatus?.('Dev server already on port 3000');
      return { url: `http://127.0.0.1:${DEV_PORT}`, backendChild };
    }

    if (!skipBuild) {
      try {
        onStatus?.('Building UI (5–15 min)...');
        await runBuild(onLog);
        const { server, url } = await startBuildStaticServer();
        return { url, staticServer: server, backendChild };
      } catch (buildErr) {
        onStatus?.(`Build failed: ${buildErr.message}. Trying dev server...`);
      }
    }

    try {
      onStatus?.('Starting dev server on port 3000...');
      const { child, url } = await startDevServer(onLog);
      return { url, devChild: child, backendChild };
    } catch (devErr) {
      throw new Error(
        `Dev server failed (${devErr.message}).\n` +
          'Close other apps and use RUN-APP.bat (production build) instead.'
      );
    }
  }

  throw new Error(
    'Desktop UI is not built (desktop/build/index.html missing).\n\n' +
      'Run FORCE-REBUILD-APP.bat, then RUN-APP.bat.\n' +
      'Do not use "npm run electron" without a successful build.'
  );
}

module.exports = {
  resolveUiUrl,
  ensureBackend,
  hasProductionBuild,
  BUILD_DIR,
  BACKEND_PORT,
  DEV_PORT,
  STATIC_PORT,
  httpOk,
};
