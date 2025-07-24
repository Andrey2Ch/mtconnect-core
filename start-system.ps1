# MTConnect System Startup Script
# Fixed version using correct npm scripts

Write-Host "Starting MTConnect system..." -ForegroundColor Green
Write-Host ""

# Kill processes on required ports
Write-Host "Freeing up ports..." -ForegroundColor Yellow
$ports = 3000,3001,7701,7702,7703,7704,7705,7706,7707,7708
foreach($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conns) {
        Write-Host "Killing process on port $port" -ForegroundColor Red
        foreach($conn in $conns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# Start FANUC adapters
Write-Host ""
Write-Host "Starting FANUC adapters..." -ForegroundColor Yellow

$fanucPath = "From Anat/Fanuc"
if(!(Test-Path $fanucPath)) {
    Write-Host "FANUC folder not found" -ForegroundColor Red
    exit 1
}

$machines = Get-ChildItem $fanucPath -Directory -Filter "M_*"
$count = 0

foreach($machine in $machines) {
    $adapterPath = Join-Path $machine.FullName "Adapter"
    $exe = $null
    
    if(Test-Path (Join-Path $adapterPath "fanuc_0id.exe")) {
        $exe = "fanuc_0id.exe"
    } elseif(Test-Path (Join-Path $adapterPath "fanuc_18i.exe")) {
        $exe = "fanuc_18i.exe"
    }
    
    if($exe) {
        Write-Host "  Starting $($machine.Name)" -ForegroundColor Green
        $title = "Adapter-$($machine.Name)"
        Start-Process cmd -ArgumentList "/k", "title $title && cd /d `"$adapterPath`" && $exe" -WindowStyle Minimized
        $count++
        Start-Sleep 1
    }
}

Write-Host "Started adapters: $count" -ForegroundColor Green

# Check MongoDB
Write-Host ""
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongo = docker exec mtconnect-mongodb mongosh mtconnect --eval 'db.machine_data.countDocuments()' --quiet 2>$null
    Write-Host "MongoDB is running" -ForegroundColor Green
} catch {
    Write-Host "MongoDB unavailable" -ForegroundColor Red
    Write-Host "Run: docker start mtconnect-mongodb" -ForegroundColor Cyan
    exit 1
}

# Start Edge Gateway using correct npm script
Write-Host ""
Write-Host "Starting Edge Gateway..." -ForegroundColor Yellow
$env:PORT = '3000'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run start:edge" -WindowStyle Minimized
Write-Host "Edge Gateway starting on port 3000" -ForegroundColor Green

# Start Cloud API using correct npm script
Write-Host ""
Write-Host "Starting Cloud API..." -ForegroundColor Yellow
$env:PORT = '3001'
$env:MONGODB_URI = 'mongodb://admin:password@localhost:27017/mtconnect?authSource=admin'

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run start:cloud" -WindowStyle Minimized
Write-Host "Cloud API starting on port 3001" -ForegroundColor Green

# Wait and check
Write-Host ""
Write-Host "Waiting for startup..." -ForegroundColor Yellow
Start-Sleep 20

Write-Host ""
Write-Host "Checking system..." -ForegroundColor Yellow

try {
    Invoke-RestMethod "http://localhost:3000/health" -TimeoutSec 5 | Out-Null
    Write-Host "Edge Gateway is working" -ForegroundColor Green
} catch {
    Write-Host "Edge Gateway not responding" -ForegroundColor Red
}

try {
    $api = Invoke-RestMethod "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 5
    Write-Host "Cloud API is working, machines: $($api.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "Cloud API not responding" -ForegroundColor Red
}

# Results
Write-Host ""
Write-Host "SYSTEM STARTED!" -ForegroundColor Green
Write-Host ""
Write-Host "Interfaces:" -ForegroundColor Cyan
Write-Host "   Edge Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "   Cloud API: http://localhost:3001" -ForegroundColor White
Write-Host "   DASHBOARD: http://localhost:3001/dashboard-v2.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor White
Read-Host 