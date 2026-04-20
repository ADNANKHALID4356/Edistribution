@echo off
echo.
echo ========================================================================
echo    Building Installer for Distribution Management System
echo    VPS Connected Client
echo ========================================================================
echo.

cd desktop

REM Check if build folder exists
if not exist "build" (
    echo [1/2] Building React app...
    call npm run build
    if %errorlevel% neq 0 (
        echo ERROR: React build failed!
        pause
        exit /b 1
    )
    echo √ React app built
    echo.
) else (
    echo [SKIP] React build already exists
    echo.
)

REM Build installer
echo [2/2] Creating installer...
call npm exec electron-builder -- --win --config electron-builder-client.json
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installer build failed!
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
pause
