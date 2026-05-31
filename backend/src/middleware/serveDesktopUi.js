const path = require('path');
const fs = require('fs');
const express = require('express');

const buildDir = path.join(__dirname, '../../../desktop/build');
const indexHtml = path.join(buildDir, 'index.html');

/**
 * Serves the React production build from desktop/build at the site root.
 * API routes under /api are registered before this middleware.
 */
function serveDesktopUi(app) {
  if (!fs.existsSync(indexHtml)) {
    console.log('[UI] No desktop/build — API only. Run desktop build or use dev server on :3000.');
    return false;
  }

  console.log('[UI] Serving desktop app from', buildDir);
  app.use(express.static(buildDir, { index: false, maxAge: '1h' }));

  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });

  return true;
}

module.exports = { serveDesktopUi, buildDir, indexHtml };
