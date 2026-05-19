@echo off
title Distribution System - Expo Go (LAN)
cd /d "%~dp0"

REM Use your PC's WiFi IPv4 (run: ipconfig ^| findstr IPv4)
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.148.95

echo.
echo ============================================
echo  Expo Go - LAN mode
echo  Packager host: %REACT_NATIVE_PACKAGER_HOSTNAME%
echo  Backend API:   http://%REACT_NATIVE_PACKAGER_HOSTNAME%:5000/api
echo ============================================
echo.
echo 1. Phone and PC must be on the same WiFi
echo 2. Open Expo Go app - Scan QR code
echo 3. If scan fails, run: npm run start:tunnel
echo.

call npx expo start --lan --clear

pause
