@echo off
title Start Electron App (frontend + window)
cd /d "%~dp0desktop"
set NODE_OPTIONS=--max-old-space-size=4096
set BROWSER=none

echo.
echo This starts React on port 3000 AND Electron together.
echo Do NOT run "npm run electron" alone.
echo.
call npm.cmd run electron:dev
pause
