@echo off
title Launch Edistribution (3 windows)
cd /d "%~dp0"

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODEVER=%%v
echo Node: %NODEVER%
echo %NODEVER% | findstr /R "v24 v25 v26" >nul && (
  echo ERROR: Use Node 22 LTS, not Node 24+
  pause
  exit /b 1
)

echo.
echo Opening 3 CMD windows - DO NOT CLOSE THEM:
echo   1) Backend  - port 5000
echo   2) Frontend - port 3000  (wait for Compiled successfully)
echo   3) Electron - opens after frontend is ready
echo.

start "1-Backend" cmd /k "cd /d %~dp0backend && npm.cmd run dev"
timeout /t 5 /nobreak >nul
start "2-Frontend" cmd /k "cd /d %~dp0desktop && set BROWSER=none&& set NODE_OPTIONS=--max-old-space-size=4096&& npm.cmd start"
timeout /t 3 /nobreak >nul
start "3-Electron" cmd /k "cd /d %~dp0desktop && echo Waiting for http://localhost:3000 ... && ping -n 45 127.0.0.1 >nul && set USE_DEV_SERVER=true&& npm.cmd run electron"

echo.
echo When window 2 shows "Compiled successfully", Electron will load the app.
echo Or open browser: http://localhost:3000
echo Login: admin / admin123
pause
