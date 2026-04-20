@echo off
setlocal
cd /d "%~dp0" || exit /b 1

echo Killing running Electron processes...
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Cleaning previous output...
if exist dist-standalone rmdir /s /q dist-standalone

echo Building React app...
call npm run build
if errorlevel 1 goto :error

echo Setting Electron Builder environment...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_NO_NATIVE_REBUILD=true
set CSC_FOR_PULL_REQUEST=true

echo Building Windows Setup EXE (NSIS)...
call npx electron-builder --win nsis --config.directories.output=dist-standalone --config.win.signAndEditExecutable=false --config.win.forceCodeSigning=false
if errorlevel 1 goto :error

echo.
echo Build complete. Setup file(s):
dir /b dist-standalone\*.exe
echo.
pause
exit /b 0

:error
echo.
echo Build failed. Check errors above.
pause
exit /b 1
