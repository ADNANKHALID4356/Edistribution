# Start Backend and Electron App

Clear-Host

Write-Host ""
Write-Host "Distribution Management System - Electron Launcher"
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $rootPath "backend"
$desktopPath = Join-Path $rootPath "desktop"

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow

$backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" `
    -WorkingDirectory $backendPath -PassThru -NoNewWindow `
    -RedirectStandardOutput "$rootPath\backend-output.log" `
    -RedirectStandardError "$rootPath\backend-error.log"

Write-Host "Backend process started (PID: $($backendProcess.Id))" -ForegroundColor Green
Write-Host "Waiting for backend to be ready..." -ForegroundColor Cyan

# Wait for backend
Start-Sleep -Seconds 3

Write-Host "Backend running on http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Electron App..." -ForegroundColor Yellow
Write-Host ""

# Start Electron
Push-Location $desktopPath
& npm run electron
Pop-Location

# Clean up backend
Write-Host ""
Write-Host "Closing backend..." -ForegroundColor Yellow
if ($backendProcess -and !$backendProcess.HasExited) {
    Stop-Process -InputObject $backendProcess -Force
}

Write-Host "Done." -ForegroundColor Green
