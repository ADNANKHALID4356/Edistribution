@echo off
title Distribution System Startup
color 0A

echo.
echo ===============================================
echo   DISTRIBUTION MANAGEMENT SYSTEM
echo   Company: Ummahtechinnovations.com
echo ===============================================
echo.

echo [1/2] Starting Backend Server...
cd /d "%~dp0backend"
start "Backend Server - Port 5000" /min node server.js
echo     Backend starting on http://localhost:5000
timeout /t 3 /nobreak > nul

echo.
echo [2/2] Starting Desktop Application...
cd /d "%~dp0desktop"
start "Desktop App - Port 3000" npm start
echo     Desktop app starting on http://localhost:3000

echo.
echo ===============================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ===============================================
echo   Backend Server: http://localhost:5000
echo   Desktop App:    http://localhost:3000 (opening...)
echo ===============================================
echo.
echo   Login Credentials:
echo   Username: admin
echo   Password: admin123
echo ===============================================
echo.
echo Keep this window open while using the system.
echo Press any key to shutdown both servers...
pause > nul

echo.
echo Shutting down servers...
taskkill /FI "WINDOWTITLE eq Backend Server - Port 5000" > nul 2>&1
taskkill /FI "WINDOWTITLE eq Desktop App - Port 3000" > nul 2>&1
echo System shutdown complete.
timeout /t 2 /nobreak > nul
