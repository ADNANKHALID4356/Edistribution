@echo off
title Repair Desktop Dependencies
set NODE_OPTIONS=--max-old-space-size=4096
cd /d "%~dp0desktop"

echo ============================================
echo  REPAIR: Desktop node_modules
echo ============================================
echo.
echo BEFORE continuing:
echo   1. Close Cursor Simple Browser tabs
echo   2. Task Manager - end ALL node.exe processes
echo   3. Close Chrome/extra apps to free RAM
echo.
pause

echo Stopping node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Removing broken desktop node_modules (this may take 1-2 min)...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo Installing dependencies (5-15 min, do not close this window)...
call npm.cmd install --legacy-peer-deps --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo FAILED. Increase Windows virtual memory, reboot, run this script again.
  pause
  exit /b 1
)

if not exist "node_modules\react-scripts\bin\react-scripts.js" (
  echo react-scripts still missing.
  pause
  exit /b 1
)

echo.
echo SUCCESS. Now double-click START-LOCAL-FULL.bat
echo Then open http://localhost:3000 after you see "Compiled successfully"
pause
