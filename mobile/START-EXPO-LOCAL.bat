@echo off
title Distribution System - Expo Go (LOCAL backend)
cd /d "%~dp0"

echo.
echo ============================================================
echo   Mobile App - LOCAL Development (same backend as Desktop)
echo ============================================================
echo.

REM Auto-detect PC LAN IPv4 for Expo QR + API
set LAN_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined LAN_IP set LAN_IP=%%a
)
set LAN_IP=%LAN_IP: =%
if "%LAN_IP%"=="" set LAN_IP=10.8.128.217

set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%
set EXPO_PUBLIC_API_HOST=%LAN_IP%
set EXPO_PUBLIC_API_PORT=5000
set NODE_OPTIONS=--max-old-space-size=8192
set METRO_MAX_WORKERS=1
set EXPO_PORT=8082

echo PC LAN IP:     %LAN_IP%
echo Metro (QR):    exp://%LAN_IP%:8082
echo Local API:     http://%LAN_IP%:5000/api
echo Health check:  http://%LAN_IP%:5000/api/health
echo.
echo STEP 1 - Start backend (separate window):
echo   cd ..\backend
echo   npm.cmd run dev
echo.
echo STEP 2 - Install Expo Go on your phone (Play Store)
echo STEP 3 - Phone and PC on SAME WiFi
echo STEP 4 - Scan QR code below (arrow DOWN + Enter if prompted)
echo.
echo If backend uses a different port, edit EXPO_PUBLIC_API_PORT above.
echo.

if not exist "node_modules\expo" (
  echo Installing dependencies...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)

call node scripts\patch-jest-worker.js
call npm.cmd run start

pause
