@echo off
title Edistribution - Node 22 Fix and Run
setlocal EnableDelayedExpansion

echo.
echo ============================================
echo  REQUIRED: Node.js 22 LTS (NOT 24)
echo ============================================
echo.

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODEVER=%%v
echo Current Node: %NODEVER%

echo %NODEVER% | findstr /R /C:"v24" /C:"v25" /C:"v26" >nul
if !errorlevel!==0 (
  echo.
  echo ERROR: You are on Node 24+. This breaks the app.
  echo.
  echo FIX:
  echo   1. Download Node 22 LTS: https://nodejs.org/en/download
  echo   2. Install it ^(choose 22.x, not Current/24^)
  echo   3. Close ALL terminals and Cursor
  echo   4. Open NEW cmd and run this script again
  echo.
  echo Verify with: node -v   ^(must show v22.x^)
  pause
  exit /b 1
)

echo Node version OK.
echo.

echo === Stopping old node processes ===
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo === Backend: rebuild better-sqlite3 for this Node ===
cd /d "%~dp0backend"
call npm.cmd rebuild better-sqlite3
if errorlevel 1 (
  echo Backend rebuild failed. Trying full reinstall...
  if exist node_modules\better-sqlite3 rmdir /s /q node_modules\better-sqlite3
  call npm.cmd install better-sqlite3 --no-audit --no-fund
)

echo === Desktop: clean reinstall node_modules ===
cd /d "%~dp0desktop"
if exist node_modules (
  echo Removing broken node_modules...
  rmdir /s /q node_modules
)
if exist package-lock.json del /f /q package-lock.json

set NODE_OPTIONS=--max-old-space-size=8192
echo Installing desktop packages ^(5-15 min^)...
call npm.cmd install --legacy-peer-deps --no-audit --no-fund
if errorlevel 1 (
  echo Desktop install FAILED. Close other apps, reboot, run again.
  pause
  exit /b 1
)

if not exist "node_modules\react-scripts\package.json" (
  echo react-scripts still broken.
  pause
  exit /b 1
)

echo.
echo === Starting Backend ===
cd /d "%~dp0backend"
start "Backend API" cmd /k "cd /d %~dp0backend && npm.cmd run dev"

echo Waiting 20s for backend...
timeout /t 20 /nobreak >nul

echo === Starting Frontend ===
cd /d "%~dp0desktop"
start "Frontend React" cmd /k "cd /d %~dp0desktop && set BROWSER=none&& npm.cmd start"

echo.
echo ============================================
echo  When Frontend shows "Compiled successfully":
echo  Open: http://localhost:3000
echo  Login: admin / admin123
echo ============================================
pause
