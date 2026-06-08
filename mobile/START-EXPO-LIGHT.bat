@echo off
title Expo Go - Low memory mode
cd /d "%~dp0"

echo ============================================
echo  LOW MEMORY MODE (fixes OOM / jest-worker)
echo ============================================
echo.
echo BEFORE starting:
echo   1. Close Electron, extra browsers, other Node windows
echo   2. Keep ONLY backend running in another CMD:
echo      cd ..\backend
echo      npm.cmd run dev
echo.
pause

set REACT_NATIVE_PACKAGER_HOSTNAME=10.8.128.217
set NODE_OPTIONS=--max-old-space-size=8192
set METRO_MAX_WORKERS=1

echo.
echo When prompted: arrow DOWN + Enter = Proceed anonymously
echo Do NOT use --clear (uses too much RAM)
echo.

call npx.cmd expo start --lan

pause
