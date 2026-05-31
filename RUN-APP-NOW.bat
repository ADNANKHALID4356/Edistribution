@echo off
title START APP - Edistribution
set NODE_OPTIONS=--max-old-space-size=8192
cd /d "%~dp0"

echo [1/4] Stopping old node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Installing webpack if missing...
cd desktop
if not exist "node_modules\webpack\lib\webpack.js" (
  echo webpack missing - installing...
  call npm.cmd install webpack@5.64.4 webpack-dev-server@4.6.0 --legacy-peer-deps --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo INSTALL FAILED - Reboot PC, close all apps, run this file again.
    pause
    exit /b 1
  )
)

if not exist "node_modules\webpack\lib\webpack.js" (
  echo ERROR: webpack still missing.
  pause
  exit /b 1
)
echo webpack OK.

echo [3/4] Starting BACKEND on port 5000...
cd ..\backend
start "BACKEND - keep open" cmd /k "set NODE_OPTIONS=--max-old-space-size=4096&& npm.cmd run dev"
timeout /t 12 /nobreak >nul

echo [4/4] Starting FRONTEND on port 3000...
cd ..\desktop
start "FRONTEND - wait for Compiled successfully" cmd /k "set BROWSER=none&& set NODE_OPTIONS=--max-old-space-size=8192&& npm.cmd start"

echo.
echo ============================================
echo  WAIT for FRONTEND window to show:
echo  "Compiled successfully"
echo  THEN open:  http://localhost:3000
echo  Login: admin / admin123
echo ============================================
pause
