const path = require('path');
const fs = require('fs');
const express = require('express');

/**
 * Serve CRA production build from desktop/build (same origin as API).
 * Enables Electron to load http://localhost:5000 without a separate dev server.
 */
function mountDesktopBuild(app) {
  const buildPath = path.resolve(__dirname, '../../../desktop/build');
  const indexPath = path.join(buildPath, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return false;
  }

  app.use(express.static(buildPath));

  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexPath);
  });

  console.log(`📱 Desktop UI served from ${buildPath}`);
  return true;
}

module.exports = { mountDesktopBuild };
