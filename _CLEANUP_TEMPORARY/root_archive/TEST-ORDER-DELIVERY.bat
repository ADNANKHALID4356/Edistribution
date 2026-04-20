@echo off
REM Test Order-to-Delivery Workflow
REM Verifies the new invoice-less delivery challan creation

echo.
echo ============================================================
echo   TESTING ORDER-TO-DELIVERY WORKFLOW
echo   (Invoice Removal Feature Verification)
echo ============================================================
echo.

cd /d "%~dp0backend"

echo [1/2] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found!
echo.

echo [2/2] Running verification tests...
echo.
node test-order-delivery-workflow.js

echo.
echo ============================================================
echo   TEST COMPLETE
echo ============================================================
echo.

pause
