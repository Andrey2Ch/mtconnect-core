# MTConnect System Diagnostics
# Check what's broken

Write-Host "=== MTConnect System Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check ports
Write-Host "1. Checking ports..." -ForegroundColor Yellow
$ports = @{3000="Edge Gateway"; 3001="Cloud API"; 7701="FANUC-1"; 7702="FANUC-2"}
foreach($port in $ports.Keys) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conn) {
        Write-Host "  Port $port ($($ports[$port])): RUNNING" -ForegroundColor Green
    } else {
        Write-Host "  Port $port ($($ports[$port])): NOT RUNNING" -ForegroundColor Red
    }
}

Write-Host ""

# Check processes
Write-Host "2. Checking processes..." -ForegroundColor Yellow
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue
$fanucProcs = Get-Process fanuc* -ErrorAction SilentlyContinue

Write-Host "  Node processes: $($nodeProcs.Count)" -ForegroundColor $(if($nodeProcs.Count -gt 0){"Green"}else{"Red"})
Write-Host "  FANUC processes: $($fanucProcs.Count)" -ForegroundColor $(if($fanucProcs.Count -gt 0){"Green"}else{"Red"})

Write-Host ""

# Check MongoDB
Write-Host "3. Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoResult = docker exec mtconnect-mongodb mongosh mtconnect --eval 'db.machine_data.countDocuments()' --quiet 2>&1
    if($mongoResult -match '\d+') {
        Write-Host "  MongoDB: OK - $($matches[0]) records" -ForegroundColor Green
    } else {
        Write-Host "  MongoDB: ERROR - $mongoResult" -ForegroundColor Red
    }
} catch {
    Write-Host "  MongoDB: NOT ACCESSIBLE" -ForegroundColor Red
}

Write-Host ""

# Check APIs
Write-Host "4. Checking APIs..." -ForegroundColor Yellow

# Edge Gateway
try {
    $edge = Invoke-RestMethod "http://localhost:3000/health" -TimeoutSec 3 2>&1
    Write-Host "  Edge Gateway Health: OK" -ForegroundColor Green
} catch {
    Write-Host "  Edge Gateway Health: FAILED" -ForegroundColor Red
}

# Cloud API
try {
    $api = Invoke-RestMethod "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 3
    Write-Host "  Cloud API: OK - $($api.data.Count) machines" -ForegroundColor Green
    
    # Show machine details
    if($api.data.Count -gt 0) {
        Write-Host "    Machines found:" -ForegroundColor Cyan
        foreach($machine in $api.data | Select-Object -First 5) {
            Write-Host "      $($machine.id): $($machine.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  Cloud API: FAILED" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check dashboard files
Write-Host "5. Checking dashboard files..." -ForegroundColor Yellow
$dashFiles = @(
    "apps/cloud-api/public/dashboard-v2.html",
    "apps/cloud-api/public/dashboard-new.html"
)

foreach($file in $dashFiles) {
    if(Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  ${file}: EXISTS ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ${file}: MISSING" -ForegroundColor Red
    }
}

Write-Host ""

# Direct API test
Write-Host "6. Testing direct API calls..." -ForegroundColor Yellow
try {
    $url = "http://localhost:3001/api/v2/dashboard/machines"
    $directTest = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3
    Write-Host "  HTTP Status: $($directTest.StatusCode)" -ForegroundColor Green
    Write-Host "  Content Length: $($directTest.Content.Length) chars" -ForegroundColor Green
} catch {
    Write-Host "  Direct API call FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== END DIAGNOSTICS ===" -ForegroundColor Cyan
Write-Host ""

# Recommendations
Write-Host "RECOMMENDATIONS:" -ForegroundColor Yellow
Write-Host "1. If ports not running -> Run start script again" -ForegroundColor White
Write-Host "2. If MongoDB error -> docker start mtconnect-mongodb" -ForegroundColor White  
Write-Host "3. If API fails -> Check logs in Cloud API window" -ForegroundColor White
Write-Host "4. If dashboard empty -> API not returning data" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to exit..."
Read-Host 