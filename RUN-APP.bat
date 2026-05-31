@echo off
title Edistribution - RUN APP
cd /d "%~dp0"

echo ============================================
echo   Enterprise Distribution - Full Start
echo ============================================
echo.

for /f "tokens=*" %%v in ('node -v 2^>nul') do (
  echo Node: %%v
  echo %%v| findstr /R "v24 v25 v26" >nul && (
    echo ERROR: Use Node 22 LTS from https://nodejs.org
    pause
    exit /b 1
  )
)

echo [1/4] Starting backend (keep that window open)...
start "Backend-5000" cmd /k "cd /d %~dp0backend && npm.cmd run dev"
timeout /t 10 /nobreak >nul

cd /d "%~dp0desktop"

echo [2/4] Building UI (5-15 min first time; close Chrome if it fails)...
set NODE_OPTIONS=--max-old-space-size=8192
set GENERATE_SOURCEMAP=false
set CI=true
call npm.cmd run build:prod
if errorlevel 1 (
  echo.
  echo BUILD FAILED. Reboot, close other apps, run FORCE-REBUILD-APP.bat
  pause
  exit /b 1
)

echo [3/4] Checking build...
call node scripts\preflight-check.js
if errorlevel 1 (
  pause
  exit /b 1
)

echo [4/4] Opening Electron (production UI only - no port 3000)...
set ELECTRON_SKIP_AUTO_BUILD=true
call npm.cmd run electron

pause
