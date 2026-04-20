# Upload Invoice.js Fix to VPS
# Quick deployment script for invoice creation fix

$VPS_IP = "147.93.108.205"
$VPS_USER = "root"
$REMOTE_PATH = "/var/www/distribution-system/backend/src/models"
$LOCAL_FILE = "backend\src\models\Invoice.js"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Uploading Invoice.js Fix to VPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if file exists
if (!(Test-Path $LOCAL_FILE)) {
    Write-Host "❌ Error: Invoice.js not found at $LOCAL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found: $LOCAL_FILE" -ForegroundColor Green
Write-Host "📡 Target: ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}" -ForegroundColor Yellow
Write-Host ""

# Option 1: Using SCP (if available)
Write-Host "Attempting upload via SCP..." -ForegroundColor Yellow
$scpCommand = "scp `"$LOCAL_FILE`" ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/Invoice.js"

Write-Host "Command: $scpCommand" -ForegroundColor Gray
Write-Host ""
Write-Host "Enter VPS password when prompted..." -ForegroundColor Yellow
Write-Host ""

try {
    # Try SCP upload
    & scp $LOCAL_FILE "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/Invoice.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ File uploaded successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Restart PM2
        Write-Host "🔄 Restarting backend service..." -ForegroundColor Yellow
        $sshCommand = "cd /var/www/distribution-system; pm2 restart distribution-api"
        & ssh "${VPS_USER}@${VPS_IP}" $sshCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend restarted successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
            Write-Host "Test invoice creation from your desktop app now." -ForegroundColor Cyan
        } else {
            Write-Host "⚠️ Upload successful but restart failed" -ForegroundColor Yellow
            Write-Host "Manually restart with: ssh root@147.93.108.205 'pm2 restart distribution-api'" -ForegroundColor Yellow
        }
    } else {
        throw "SCP upload failed"
    }
} catch {
    Write-Host ""
    Write-Host "❌ SCP not available or upload failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 MANUAL UPLOAD INSTRUCTIONS:" -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Open FileZilla or WinSCP" -ForegroundColor White
    Write-Host "2. Connect to: $VPS_IP (Port 22)" -ForegroundColor White
    Write-Host "3. Username: $VPS_USER" -ForegroundColor White
    Write-Host "4. Navigate to: $REMOTE_PATH" -ForegroundColor White
    Write-Host "5. Upload this file: $LOCAL_FILE" -ForegroundColor White
    Write-Host "6. SSH to VPS and run: pm2 restart distribution-api" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Full file path on your computer:" -ForegroundColor Cyan
    Write-Host "   $(Resolve-Path $LOCAL_FILE)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
