@echo off
title Edistribution - Light dev (port 3000, low memory)
cd /d "%~dp0"

echo Close Chrome and extra apps first. Node 22 required.
echo.

start "Backend-5000" cmd /k "cd /d %~dp0backend && npm.cmd run dev"
timeout /t 8 /nobreak >nul

cd /d "%~dp0desktop"
set NODE_OPTIONS=--max-old-space-size=4096
set DISABLE_ESLINT_PLUGIN=true
set GENERATE_SOURCEMAP=false
set BROWSER=none
start "Frontend-3000" cmd /k "cd /d %~dp0desktop && npm.cmd start"

echo.
echo When Frontend shows "Compiled successfully", run in desktop folder:
echo   npm.cmd run electron:dev
echo.
echo If npm start crashes, use RUN-TODAY.bat instead (production build).
pause
