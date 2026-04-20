@echo off
:: Distribution Management System Installer
:: This will install the application to C:\Program Files\Distribution Management System
:: and create shortcuts on Desktop and Start Menu

echo.
echo ========================================================================
echo    Distribution Management System - Installer
echo    Version 1.0.0
echo    Ummah Tech Innovations
echo ========================================================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This installer requires administrator privileges.
    echo Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

set "INSTALL_DIR=C:\Program Files\Distribution Management System"
set "SOURCE_DIR=%~dp0desktop\dist-client\win-unpacked"

echo Installing to: %INSTALL_DIR%
echo.
echo This will:
echo   - Copy application files to Program Files
echo   - Create Desktop shortcut
echo   - Create Start Menu shortcut
echo.
pause

:: Create installation directory
if not exist "%INSTALL_DIR%" (
    echo Creating installation directory...
    mkdir "%INSTALL_DIR%"
)

:: Copy files
echo.
echo Copying application files...
xcopy /E /I /Y "%SOURCE_DIR%\*" "%INSTALL_DIR%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy files!
    pause
    exit /b 1
)

:: Create Desktop shortcut
echo Creating Desktop shortcut...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Distribution Management System.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Distribution Management System.exe'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Save()"

:: Create Start Menu shortcut
echo Creating Start Menu shortcut...
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Distribution Management System" mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Distribution Management System"
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Distribution Management System\Distribution Management System.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Distribution Management System.exe'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Save()"

:: Create uninstaller
echo Creating uninstaller...
(
echo @echo off
echo echo Uninstalling Distribution Management System...
echo.
echo :: Remove shortcuts
echo del "%USERPROFILE%\Desktop\Distribution Management System.lnk" 2^>nul
echo rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Distribution Management System" 2^>nul
echo.
echo :: Remove application files
echo cd /d "%%~dp0.."
echo cd ..
echo rmdir /S /Q "Distribution Management System"
echo.
echo echo Uninstallation complete!
echo pause
) > "%INSTALL_DIR%\Uninstall.bat"

echo.
echo ========================================================================
echo    INSTALLATION COMPLETE!
echo ========================================================================
echo.
echo Application installed to: %INSTALL_DIR%
echo.
echo Shortcuts created:
echo   - Desktop: Distribution Management System
echo   - Start Menu: Distribution Management System
echo.
echo To uninstall, run: %INSTALL_DIR%\Uninstall.bat
echo.
echo NOTE: This app connects to VPS backend at:
echo       http://147.93.108.205:5001/api
echo.
echo Would you like to launch the application now? (Y/N)
set /p LAUNCH=

if /i "%LAUNCH%"=="Y" (
    start "" "%INSTALL_DIR%\Distribution Management System.exe"
)

echo.
echo Thank you for installing Distribution Management System!
pause
