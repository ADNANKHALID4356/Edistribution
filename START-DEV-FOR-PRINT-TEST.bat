@echo off
title Dev mode - print changes without full rebuild
cd /d "%~dp0"

echo Starts backend + React on :3000 + Electron.
echo Print layout updates apply immediately (no build folder needed).
echo.

start "Backend" cmd /k "cd /d %~dp0backend && npm.cmd run dev"
timeout /t 8 /nobreak >nul
cd /d "%~dp0desktop"
call npm.cmd run electron:dev
