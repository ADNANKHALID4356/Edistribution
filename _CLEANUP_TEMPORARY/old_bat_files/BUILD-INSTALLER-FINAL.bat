@echo off
echo.
echo ========================================================================
echo    Building Distribution Management System Installer
echo    VPS Connected Client Application
echo ========================================================================
echo.

cd desktop

REM Check if build folder exists
if not exist "build" (
    echo [1/2] Building React application...
    echo ----------------------------------------
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: React build failed!
        pause
        exit /b 1
    )
    echo √ React app built successfully
    echo.
) else (
    echo [SKIP] React build already exists
    echo.
)

REM Build installer
echo [2/2] Creating installer package...
echo ----------------------------------------
call npm exec electron-builder -- --win --config electron-builder-client.json
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installer build failed!
    echo.
    echo Common issues:
    echo   - Node modules missing: run "npm install" in desktop folder
    echo   - electron-builder not installed: run "npm install electron-builder --save-dev"
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo    INSTALLER BUILD COMPLETE!
echo ========================================================================
echo.
echo Installer location: desktop\dist-client\
dir /B dist-client\*Setup*.exe 2>nul
echo.
echo This installer will:
echo   - Install to C:\Program Files\Distribution Management System
echo   - Create desktop shortcut
echo   - Create start menu shortcut
echo   - Connect to VPS: http://147.93.108.205:5001/api
echo.
echo Double-click the installer to install the application.
echo.
pause
