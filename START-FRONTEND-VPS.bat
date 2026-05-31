@echo off
title Edistribution - Frontend Local, Backend VPS
set NODE_OPTIONS=--max-old-space-size=4096
cd /d "%~dp0desktop"

echo ============================================
echo  Mode 2: Local Frontend + VPS Backend
echo  Frontend: http://localhost:3000
echo  Backend:  http://147.93.108.205:5005/api
echo ============================================
echo.

if not exist ".env.local" (
  echo Creating .env.local from .env.local.vps ...
  copy /Y ".env.local.vps" ".env.local" >nul
)

set BROWSER=none
npm.cmd start

pause
