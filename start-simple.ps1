# MTConnect System Launcher
# Simple version without emojis

Write-Host "Starting MTConnect system..." -ForegroundColor Green

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

# Start FANUC adapters
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
            $title = "Adapter-$($machine.Name)"
            Start-Process cmd -ArgumentList "/k", "title $title && cd /d `"$adapterPath`" && $exe" -WindowStyle Minimized
            $count++
            Start-Sleep 1
        }
    }
    Write-Host "Started $count adapters" -ForegroundColor Green
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
    npm run build
    if($LASTEXITCODE -ne 0) {
        Write-Host "Build failed" -ForegroundColor Red
        exit 1
    }
}

# Start Edge Gateway
Write-Host "Starting Edge Gateway..." -ForegroundColor Yellow
$env:PORT = '3000'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node dist/main.js" -WindowStyle Minimized
Write-Host "Edge Gateway started on port 3000" -ForegroundColor Green

# Start Cloud API
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

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run start:dev" -WindowStyle Minimized
Set-Location "../.."
Write-Host "Cloud API started on port 3001" -ForegroundColor Green

# Wait and check
Write-Host "Waiting for startup..." -ForegroundColor Yellow
Start-Sleep 15

Write-Host "Checking system..." -ForegroundColor Yellow

try {
    Invoke-RestMethod "http://localhost:3000/health" -TimeoutSec 5 | Out-Null
    Write-Host "Edge Gateway OK" -ForegroundColor Green
} catch {
    Write-Host "Edge Gateway not responding" -ForegroundColor Red
}

try {
    $api = Invoke-RestMethod "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 5
    Write-Host "Cloud API OK, machines: $($api.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "Cloud API not responding" -ForegroundColor Red
}

# Result
Write-Host ""
Write-Host "SYSTEM STARTED!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Edge Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "  Cloud API: http://localhost:3001" -ForegroundColor White
Write-Host "  DASHBOARD: http://localhost:3001/dashboard-v2.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
Read-Host 