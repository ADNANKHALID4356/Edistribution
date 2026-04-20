@echo off
REM ==========================================
REM Clean Development Files Before GitHub Push
REM ==========================================

echo.
echo ============================================
echo   Cleaning Development Files
echo ============================================
echo.

echo [33mRemoving .env files (will be excluded from Git)...[0m

if exist "backend\.env" (
    echo [32m   Keeping backend\.env locally but will be gitignored[0m
)

if exist "desktop\.env" (
    echo [32m   Keeping desktop\.env locally but will be gitignored[0m
)

echo.
echo [33mVerifying .env.example files exist...[0m

if exist "backend\.env.example" (
    echo [32m   backend\.env.example - OK[0m
) else (
    echo [31m   backend\.env.example - MISSING! Creating from .env...[0m
    if exist "backend\.env" (
        copy "backend\.env" "backend\.env.example"
        echo [33m   Please edit backend\.env.example and remove actual passwords![0m
    )
)

if exist "desktop\.env.example" (
    echo [32m   desktop\.env.example - OK[0m
) else (
    echo [31m   desktop\.env.example - MISSING! Creating from .env...[0m
    if exist "desktop\.env" (
        copy "desktop\.env" "desktop\.env.example"
        echo [33m   Please edit desktop\.env.example and remove actual passwords![0m
    )
)

echo.
echo [33mDatabase files will remain but are gitignored...[0m
echo [32m   backend\data\*.db will not be committed[0m

echo.
echo [33mnode_modules will remain but are gitignored...[0m
echo [32m   All node_modules directories will not be committed[0m

echo.
echo [33mVerifying .gitignore...[0m
findstr /C:".env" .gitignore >nul 2>&1
if %errorlevel% equ 0 (
    echo [32m   .env files are gitignored[0m
) else (
    echo [31m   WARNING: .env may not be properly gitignored![0m
)

findstr /C:"node_modules" .gitignore >nul 2>&1
if %errorlevel% equ 0 (
    echo [32m   node_modules are gitignored[0m
) else (
    echo [31m   WARNING: node_modules may not be properly gitignored![0m
)

findstr /C:"*.db" .gitignore >nul 2>&1
if %errorlevel% equ 0 (
    echo [32m   Database files are gitignored[0m
) else (
    echo [31m   WARNING: .db files may not be properly gitignored![0m
)

echo.
echo ============================================
echo   Cleanup Complete!
echo ============================================
echo.
echo [32mYour project is ready for GitHub![0m
echo.
echo [33mNext steps:[0m
echo   1. Review .env.example files and ensure no secrets
echo   2. Run: push-to-github.bat
echo   3. Verify on GitHub that no sensitive files were committed
echo.

pause
