@echo off
title Edistribution - Local Full Stack
set NODE_OPTIONS=--max-old-space-size=4096
cd /d "%~dp0"

echo ============================================
echo  Mode 1: Local Backend + Local Frontend
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo  Login:    admin / admin123
echo ============================================
echo.

start "Backend API" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"

echo Waiting for backend (up to 60s)...
set /a tries=0
:wait_backend
set /a tries+=1
powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://localhost:5000/api/health' -TimeoutSec 2; if ($r.status -eq 'OK') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto backend_ok
if %tries% geq 30 (
  echo WARNING: Backend health check timed out. Check the Backend API window.
  goto start_frontend
)
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_ok
echo Backend is ready.
echo.

:start_frontend
start "Desktop Frontend" cmd /k "cd /d "%~dp0desktop" && set BROWSER=none&& set NODE_OPTIONS=--max-old-space-size=4096&& npm.cmd start"

echo.
echo Open http://localhost:3000 in your browser when compile finishes.
echo Press any key to close this launcher (servers keep running in other windows).
pause >nul
