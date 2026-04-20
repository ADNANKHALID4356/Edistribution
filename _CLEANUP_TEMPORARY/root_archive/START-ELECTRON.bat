@echo off
title Distribution System - Electron App Launcher
color 0A

echo.
echo ===============================================
echo   DISTRIBUTION MANAGEMENT SYSTEM
echo   Electron Desktop Application
echo ===============================================
echo.

REM Get the root directory
cd /d "%~dp0"
set ROOT=%cd%

REM Start Backend Server
echo [1/2] Starting Backend Server...
echo        Path: %ROOT%\backend
cd /d "%ROOT%\backend"
start "Distribution System - Backend" node server.js
echo        Backend process started
timeout /t 2 /nobreak > nul

echo.
echo [2/2] Starting Electron Application...
echo        Path: %ROOT%\desktop
cd /d "%ROOT%\desktop"
npm run electron

echo.
echo ===============================================
echo   SYSTEM SHUTDOWN
echo ===============================================
echo.

REM Kill backend when done
taskkill /FI "WINDOWTITLE eq Distribution System - Backend" /f 2>nul

