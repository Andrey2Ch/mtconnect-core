# new terminal and run this command: 
npx @agentdeskai/browser-tools-server@latest

# Start Dashboard v2.0
Write-Host "Starting MTConnect Dashboard v2.0..." -ForegroundColor Cyan

# Kill processes on ports
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "Killing process on port $port" -ForegroundColor Yellow
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Start Cloud API in background
Write-Host "Starting Cloud API..." -ForegroundColor Yellow
cd apps/cloud-api
$env:PORT = '3001'
$env:MONGODB_URI = 'mongodb://admin:password@localhost:27017/mtconnect?authSource=admin'
Start-Process powershell -ArgumentList "-Command", "npm run start:dev" -WindowStyle Hidden
cd ../..

# Wait and test
Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 10
    $count = $result.data.Count
    Write-Host "SUCCESS! API v2 running with $count machines" -ForegroundColor Green
    Write-Host "Dashboards:" -ForegroundColor Cyan
    Write-Host "  Old: http://localhost:3001/dashboard-new.html" -ForegroundColor Gray
    Write-Host "  New: http://localhost:3001/dashboard-v2.html" -ForegroundColor White
} catch {
    Write-Host "ERROR: API not responding" -ForegroundColor Red
} 