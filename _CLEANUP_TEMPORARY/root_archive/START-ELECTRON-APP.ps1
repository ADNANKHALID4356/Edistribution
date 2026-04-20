# Distribution System - Electron App Launcher
# This script starts the backend and Electron app together

Clear-Host

Write-Host "`n" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   DISTRIBUTION MANAGEMENT SYSTEM" -ForegroundColor Green
Write-Host "   Electron Desktop Application Launcher" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "`n"

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $rootPath "backend"
$desktopPath = Join-Path $rootPath "desktop"

# Function to start backend
function Start-Backend {
    Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Yellow
    Write-Host "      Backend Path: $backendPath" -ForegroundColor Gray
    
    $backendProcess = Start-Process -FilePath "node" `
        -ArgumentList "server.js" `
        -WorkingDirectory $backendPath `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput (Join-Path $rootPath "backend-output.log") `
        -RedirectStandardError (Join-Path $rootPath "backend-error.log")
    
    Write-Host "      ✓ Backend process started (PID: $($backendProcess.Id))" -ForegroundColor Green
    Write-Host "      Waiting for server to respond..." -ForegroundColor Yellow
    
    # Wait for backend to be ready
    $healthy = $false
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # Server not ready yet
        }
        Start-Sleep -Seconds 1
    }
    
    if ($healthy) {
        Write-Host "      ✓ Backend is responding!" -ForegroundColor Green
    } else {
        Write-Host "      ⚠ Backend health check timed out, but continuing..." -ForegroundColor Yellow
    }
    
    Write-Host "      Backend running on http://localhost:5000" -ForegroundColor Cyan
    Write-Host ""
    
    return $backendProcess
}

# Function to start Electron
function Start-Electron {
    Write-Host "[2/2] Starting Electron Application..." -ForegroundColor Yellow
    Write-Host "      Desktop Path: $desktopPath" -ForegroundColor Gray
    
    Push-Location $desktopPath
    
    Write-Host "      Building/Checking React app..." -ForegroundColor Yellow
    
    # Ensure build folder exists
    if (!(Test-Path (Join-Path $desktopPath "build"))) {
        Write-Host "      Build folder not found, building React app..." -ForegroundColor Yellow
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "      ❌ Build failed!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }
    
    Write-Host "      ✓ React app ready" -ForegroundColor Green
    Write-Host "      Launching Electron..." -ForegroundColor Yellow
    
    # Start Electron
    & npm run electron
    
    Pop-Location
}

# Main execution
try {
    $backendProcess = Start-Backend
    
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    
    Start-Electron
    
    # If Electron exits, kill backend
    Write-Host "`nElectron app closed, stopping backend..." -ForegroundColor Yellow
    if ($backendProcess -and !$backendProcess.HasExited) {
        Stop-Process -InputObject $backendProcess -Force
        Write-Host "✓ Backend stopped" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nSystem shutdown complete." -ForegroundColor Green
