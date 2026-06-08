@echo off
title Distribution System - Expo Go (low memory)
cd /d "%~dp0"

echo.
echo === Free RAM first ===
echo Closing extra Node processes (backend/desktop will need restart after)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

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

if not exist "node_modules\expo" (
  echo Installing dependencies...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)

echo.
echo ============================================
echo  Expo Go - LAN (1 worker, avoids OOM)
set EXPO_PORT=8082
echo  Packager: %REACT_NATIVE_PACKAGER_HOSTNAME%:8082
echo  Backend:  http://%REACT_NATIVE_PACKAGER_HOSTNAME%:5000/api
echo ============================================
echo.
echo BEFORE scanning QR:
echo   1. Start backend in another window:
echo      cd ..\backend ^& npm.cmd run dev
echo   2. When Expo asks: Down arrow + Enter = Proceed anonymously
echo   3. Do NOT use expo start --clear on this PC
echo.

call node scripts\patch-jest-worker.js
call npm.cmd run start

echo.
echo If you used "npx expo start" and got OOM, always use this bat file or "npm.cmd run start"
pause
