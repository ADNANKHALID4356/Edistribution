@echo off
echo Starting Backend Server...
cd /d C:\distribution\distribution_system\backend
start "Distribution System - Backend" /min node server-debug.js
echo.
echo Backend server started in minimized window!
echo Server URL: http://localhost:5000
echo.
echo Press any key to close this window...
pause > nul
