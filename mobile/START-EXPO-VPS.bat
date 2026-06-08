@echo off
title Distribution System - Expo Go (VPS Production API)
cd /d "%~dp0"

echo.
echo ============================================================
echo   Expo Go - VPS Production Testing
echo   API: http://147.93.108.205:5005/api
echo   Health: http://147.93.108.205:5005/api/health
echo ============================================================
echo.
echo No local backend needed. Phone must have internet access.
echo.
echo STEPS:
echo   1. Install "Expo Go" from Play Store on your Android phone
echo   2. Phone and PC on same WiFi (for QR scan)
echo   3. When Expo asks: arrow DOWN + Enter = Proceed anonymously
echo   4. Scan QR code with Expo Go
echo   5. On login screen tap "Test Connection" to verify VPS
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set LAN_IP=%%a
  goto :gotip
)
:gotip
set LAN_IP=%LAN_IP: =%
if "%LAN_IP%"=="" set LAN_IP=192.168.1.1

set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%
set NODE_OPTIONS=--max-old-space-size=8192
set METRO_MAX_WORKERS=1
set EXPO_PORT=8082

if not exist "node_modules\expo" (
  echo Installing dependencies...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)

echo Packager LAN IP: %REACT_NATIVE_PACKAGER_HOSTNAME%:%EXPO_PORT%
echo VPS API: http://147.93.108.205:5005/api
echo.

call node scripts\patch-jest-worker.js
call npx.cmd expo start --lan --port %EXPO_PORT%

pause
