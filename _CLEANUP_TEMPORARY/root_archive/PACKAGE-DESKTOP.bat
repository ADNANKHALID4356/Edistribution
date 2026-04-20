@echo off
title Package Desktop App - Distribution System
color 0A

echo.
echo ========================================================================
echo    PACKAGING DESKTOP APP FOR DISTRIBUTION
echo ========================================================================
echo.

cd /d "%~dp0desktop"

if not exist "dist-standalone\win-unpacked\Distribution Management System.exe" (
    echo ERROR: Executable not found!
    echo Please run BUILD-DESKTOP-PORTABLE.bat first.
    pause
    exit /b 1
)

echo [1/2] Creating portable ZIP package...
cd dist-standalone

if exist "Distribution-Management-System-Portable.zip" del "Distribution-Management-System-Portable.zip"

powershell -Command "Compress-Archive -Path 'win-unpacked\*' -DestinationPath 'Distribution-Management-System-Portable.zip' -CompressionLevel Optimal"

if errorlevel 1 (
    echo ERROR: Failed to create ZIP
    pause
    exit /b 1
)

echo      Done!

echo.
echo [2/2] Creating installation instructions...
(
echo ========================================================================
echo    DISTRIBUTION MANAGEMENT SYSTEM - PORTABLE VERSION
echo ========================================================================
echo.
echo INSTALLATION INSTRUCTIONS:
echo.
echo 1. Extract the ZIP file to any folder on your computer
echo    Example: C:\Programs\Distribution System\
echo.
echo 2. Run "Distribution Management System.exe"
echo.
echo 3. Login with your credentials
echo    - Server: 147.93.108.205:5001
echo    - Username: admin
echo    - Password: ^(ask administrator^)
echo.
echo SYSTEM REQUIREMENTS:
echo    - Windows 10/11 ^(64-bit^)
echo    - 4GB RAM minimum
echo    - Internet connection
echo.
echo FEATURES:
echo    - Order Management
echo    - Inventory Control
echo    - Delivery Tracking
echo    - Customer Ledger
echo    - Salesman Management
echo    - Reports and Analytics
echo.
echo SUPPORT:
echo    Company: Ummahtechinnovations
echo    Version: 1.0.0
echo.
echo ========================================================================
) > README.txt

echo      Done!

echo.
echo ========================================================================
echo    PACKAGING COMPLETE!
echo ========================================================================
echo.
echo Files ready for distribution:
echo.
dir /b Distribution-Management-System-Portable.zip
echo.
echo Package location: %CD%\
echo Package size:
for %%A in (Distribution-Management-System-Portable.zip) do echo     %%~zA bytes
echo.
echo DISTRIBUTION:
echo    1. Send the ZIP file to users
echo    2. Include README.txt for installation instructions
echo    3. Users extract and run the .exe file
echo.
pause
