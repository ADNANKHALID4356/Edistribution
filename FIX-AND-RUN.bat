@echo off
title Edistribution - Fix and Run
set NODE_OPTIONS=--max-old-space-size=4096
cd /d "%~dp0"

echo.
echo === Step 1: Check Node version (need 18-22, NOT 24) ===
for /f %%v in ('node -v') do set NODEVER=%%v
echo Node: %NODEVER%
echo %NODEVER% | findstr /R "^v2[4-9]\." >nul && (
  echo.
  echo ERROR: Node 24+ breaks react-scripts 5.
  echo Install Node 22 LTS from https://nodejs.org/ then run this script again.
  pause
  exit /b 1
)

echo.
echo === Step 2: Clean desktop node_modules ===
cd desktop
if exist node_modules (
  echo Removing old node_modules...
  rmdir /s /q node_modules
)
if exist package-lock.json del /f /q package-lock.json

echo.
echo === Step 3: Fresh npm install (5-10 min) ===
call npm.cmd install --legacy-peer-deps --no-audit --no-fund
if errorlevel 1 (
  echo INSTALL FAILED.
  pause
  exit /b 1
)

if not exist "node_modules\webpack\package.json" (
  echo ERROR: webpack still missing after install.
  pause
  exit /b 1
)

echo.
echo === Step 4: Start backend ===
cd ..\backend
start "Backend" cmd /k "npm.cmd run dev"

echo Waiting for backend...
timeout /t 15 /nobreak >nul

echo.
echo === Step 5: Start frontend ===
cd ..\desktop
start "Frontend" cmd /k "set BROWSER=none&& npm.cmd start"

echo.
echo DONE. Open http://localhost:3000 when Frontend shows Compiled successfully.
echo Login: admin / admin123
pause
