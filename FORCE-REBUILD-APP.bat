@echo off
title Force rebuild desktop UI
cd /d "%~dp0"

echo Stopping stray Node processes (optional)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

cd /d "%~dp0desktop"
if exist build (
  echo Removing old build...
  rmdir /s /q build
)

set NODE_OPTIONS=--max-old-space-size=8192
set GENERATE_SOURCEMAP=false
set CI=true
echo Building...
call npm.cmd run build:prod
if errorlevel 1 (
  echo BUILD FAILED
  pause
  exit /b 1
)

call node scripts\preflight-check.js
echo.
echo SUCCESS. Now double-click RUN-APP.bat
pause
