@echo off
title Start Backend + Desktop + Mobile
cd /d "%~dp0"

echo Starting Backend (port 5000)...
start "1-Backend" cmd /k "cd /d %~dp0backend && npm.cmd run dev"
timeout /t 6 /nobreak >nul

echo Starting Desktop (Electron uses build folder)...
start "2-Desktop-Electron" cmd /k "cd /d %~dp0desktop && npm.cmd run electron"

echo Starting Mobile Expo (QR in this window)...
cd /d "%~dp0mobile"
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.148.95
echo.
echo When asked: choose "Proceed anonymously" with arrow keys + Enter
echo.
call npx.cmd expo start --lan --clear
pause
