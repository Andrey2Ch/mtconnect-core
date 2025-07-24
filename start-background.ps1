# MTConnect System Launcher - BACKGROUND MODE
# All services run in background without terminal windows

Write-Host "Starting MTConnect system in background..." -ForegroundColor Green

# Kill processes on ports
Write-Host "Freeing ports..." -ForegroundColor Yellow
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

# Start FANUC adapters in background
Write-Host "Starting FANUC adapters..." -ForegroundColor Yellow
$fanucPath = "From Anat/Fanuc"
if(Test-Path $fanucPath) {
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
            Write-Host "Starting adapter: $($machine.Name)" -ForegroundColor Green
            # Start in background without window
            Start-Process -FilePath (Join-Path $adapterPath $exe) -WorkingDirectory $adapterPath -WindowStyle Hidden
            $count++
            Start-Sleep 1
        }
    }
    Write-Host "Started $count adapters in background" -ForegroundColor Green
}

# Check MongoDB
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    docker exec mtconnect-mongodb mongosh mtconnect --eval 'db.machine_data.countDocuments()' --quiet | Out-Null
    Write-Host "MongoDB is running" -ForegroundColor Green
} catch {
    Write-Host "MongoDB not available" -ForegroundColor Red
    Write-Host "Run: docker start mtconnect-mongodb" -ForegroundColor Cyan
    exit 1
}

# Build project
Write-Host "Building project..." -ForegroundColor Yellow
if(!(Test-Path "dist/main.js")) {
    npm run build | Out-Null
    if($LASTEXITCODE -ne 0) {
        Write-Host "Build failed" -ForegroundColor Red
        exit 1
    }
}

# Start Edge Gateway in background
Write-Host "Starting Edge Gateway..." -ForegroundColor Yellow
$env:PORT = '3000'
Start-Process node -ArgumentList "dist/main.js" -WorkingDirectory $PWD -WindowStyle Hidden
Write-Host "Edge Gateway started in background on port 3000" -ForegroundColor Green

# Start Cloud API in background
Write-Host "Starting Cloud API..." -ForegroundColor Yellow
Set-Location "apps/cloud-api"
$env:PORT = '3001'
$env:MONGODB_URI = 'mongodb://admin:password@localhost:27017/mtconnect?authSource=admin'

npm run build | Out-Null
if($LASTEXITCODE -ne 0) {
    Write-Host "API build failed" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

# Start Cloud API process in background
$cloudApiPath = $PWD
Start-Process npm -ArgumentList "run", "start:dev" -WorkingDirectory $cloudApiPath -WindowStyle Hidden
Set-Location "../.."
Write-Host "Cloud API started in background on port 3001" -ForegroundColor Green

# Wait for startup
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep 20

# Check services
Write-Host "Checking services..." -ForegroundColor Yellow

$edgeOK = $false
$apiOK = $false

try {
    Invoke-RestMethod "http://localhost:3000/health" -TimeoutSec 10 | Out-Null
    Write-Host "Edge Gateway: OK" -ForegroundColor Green
    $edgeOK = $true
} catch {
    Write-Host "Edge Gateway: Starting..." -ForegroundColor Yellow
}

try {
    $api = Invoke-RestMethod "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 10
    Write-Host "Cloud API: OK - $($api.data.Count) machines" -ForegroundColor Green
    $apiOK = $true
} catch {
    Write-Host "Cloud API: Starting..." -ForegroundColor Yellow
}

# Final status
Write-Host ""
if($apiOK) {
    Write-Host "SYSTEM RUNNING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "DASHBOARD: http://localhost:3001/dashboard-v2.html" -ForegroundColor Yellow
    Write-Host "API: http://localhost:3001" -ForegroundColor White
    if($edgeOK) {
        Write-Host "Edge Gateway: http://localhost:3000" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "All services running in background - NO WINDOWS!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To stop services, run: Get-Process node,fanuc* | Stop-Process" -ForegroundColor Gray
} else {
    Write-Host "SYSTEM STARTING... Check again in 30 seconds" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit this script..."
Read-Host 