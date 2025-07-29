param(
    [string]$CloudApiUrl = "https://mtconnect-core-production.up.railway.app"
)

# Console setup
$Host.UI.RawUI.WindowTitle = "MTConnect System Launcher"
Clear-Host

Write-Host "MTConnect System Launcher v1.2 (Silent)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cloud API URL: $CloudApiUrl" -ForegroundColor Yellow
Write-Host "Edge Gateway ID: $($env:COMPUTERNAME)-edge-gateway" -ForegroundColor Yellow
Write-Host ""

Write-Host "STOPPING EXISTING PROCESSES..." -ForegroundColor Yellow
Write-Host "  Stopping FANUC adapters..." -ForegroundColor Gray
Stop-Process -Name "fanuc_0id","fanuc_18i","fanuc" -Force -ErrorAction SilentlyContinue

Write-Host "  Stopping Edge Gateway API..." -ForegroundColor Gray  
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

Write-Host "  Freeing ports..." -ForegroundColor Gray
$ports = @(3000, 3001, 3555, 7701, 7702, 7703, 7704, 7705, 7706, 7707, 7708)
foreach($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "  Process cleanup completed" -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "STARTING FANUC ADAPTERS IN HIDDEN MODE..." -ForegroundColor Yellow

# Launch adapters
$adapters = @(
    @{Path="Fanuc\M_1_XD-20\Adapter"; Exe="fanuc_0id.exe"; Name="XD-20"},
    @{Path="Fanuc\M_2_SR_26\Adapter"; Exe="fanuc_0id.exe"; Name="SR-26"},  
    @{Path="Fanuc\M_3_XD_38\Adapter"; Exe="fanuc_0id.exe"; Name="XD-38"},
    @{Path="Fanuc\M_4_SR_10\Adapter"; Exe="fanuc_0id.exe"; Name="SR-10"},
    @{Path="Fanuc\M_5_DT_26\Adapter"; Exe="fanuc_0id.exe"; Name="DT-26"},
    @{Path="Fanuc\M_6_SR_21\Adapter"; Exe="fanuc_0id.exe"; Name="SR-21"},
    @{Path="Fanuc\M_7_SR_23\Adapter"; Exe="fanuc_18i.exe"; Name="SR-23"},
    @{Path="Fanuc\M_8_SR_25\Adapter"; Exe="fanuc_18i.exe"; Name="SR-25"}
)

foreach($adapter in $adapters) {
    $fullPath = Join-Path $adapter.Path $adapter.Exe
    if(Test-Path $fullPath) {
        Push-Location $adapter.Path
        Start-Process -FilePath $adapter.Exe -ArgumentList "run" -WindowStyle Hidden
        Pop-Location
        Write-Host "  OK $($adapter.Name): Started" -ForegroundColor Green
    } else {
        Write-Host "  ERROR $($adapter.Name): $($adapter.Exe) not found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  Waiting for adapter initialization (10 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "STARTING EDGE GATEWAY API..." -ForegroundColor Yellow
Write-Host "  API will be available on port 3555" -ForegroundColor Gray
Write-Host "  Starting in completely hidden process..." -ForegroundColor Gray

# Set environment variables
$env:CLOUD_API_URL = $CloudApiUrl
$env:EDGE_GATEWAY_ID = $env:COMPUTERNAME + "-edge-gateway"

# Create a batch file to run Edge Gateway completely hidden
$batchContent = @"
@echo off
set CLOUD_API_URL=$CloudApiUrl
set EDGE_GATEWAY_ID=$($env:COMPUTERNAME)-edge-gateway
cd /d "$PWD"
npx ts-node src/main.ts
"@

$batchContent | Out-File -FilePath "start-edge-silent.bat" -Encoding ASCII

# Start the batch file completely hidden using WScript
$vbsContent = @"
CreateObject("Wscript.Shell").Run """$PWD\start-edge-silent.bat""", 0, False
"@

$vbsContent | Out-File -FilePath "start-edge-hidden.vbs" -Encoding ASCII

# Execute the VBS script to start Edge Gateway completely hidden
Start-Process -FilePath "cscript.exe" -ArgumentList "//NoLogo", "start-edge-hidden.vbs" -WindowStyle Hidden -Wait

Write-Host "  Waiting for API initialization (20 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "SYSTEM VERIFICATION..." -ForegroundColor Yellow
Write-Host "  Checking FANUC adapters:" -ForegroundColor Cyan

# Check adapter ports
$activeAdapters = 0
for($port = 7701; $port -le 7708; $port++) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($connection) {
        Write-Host "    OK Port $port - Active" -ForegroundColor Green
        $activeAdapters++
    } else {
        Write-Host "    ERROR Port $port - Not responding" -ForegroundColor Red
    }
}

Write-Host "  Checking Edge Gateway API:" -ForegroundColor Cyan
Start-Sleep -Seconds 3
$apiStatus = "ERROR"
try {
    # Check if port 3555 is listening
    $port3555 = Get-NetTCPConnection -LocalPort 3555 -State Listen -ErrorAction SilentlyContinue
    if($port3555) {
        Write-Host "    OK API Port 3555 - Listening" -ForegroundColor Green
        $apiStatus = "OK"
    } else {
        Write-Host "    ERROR API Port 3555 - Not listening" -ForegroundColor Red
    }
} catch {
    Write-Host "    ERROR API - Not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "STARTUP REPORT:" -ForegroundColor Cyan
Write-Host "  FANUC Adapters: $activeAdapters/8 active" -ForegroundColor Yellow
Write-Host "  Edge Gateway API: http://localhost:3555/api/machines" -ForegroundColor Yellow
Write-Host "  Local Dashboard: http://localhost:3555/dashboard-new.html" -ForegroundColor Yellow

if($activeAdapters -eq 8 -and $apiStatus -eq "OK") {
    Write-Host ""
    Write-Host "SUCCESS: ALL SYSTEMS STARTED!" -ForegroundColor Green
    Write-Host "Opening dashboard in browser..." -ForegroundColor Green
    Start-Process "http://localhost:3555/dashboard-new.html"
} else {
    Write-Host ""
    Write-Host "WARNING: SYSTEM STARTED WITH ISSUES" -ForegroundColor Yellow
    if($apiStatus -ne "OK") {
        Write-Host "  API not responding. Edge Gateway may need more time to start." -ForegroundColor Yellow
    }
    if($activeAdapters -lt 8) {
        Write-Host "  Not all adapters responding. Check machine connections." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "SYSTEM READY!" -ForegroundColor Green
Write-Host ""
Write-Host "Useful links:" -ForegroundColor Cyan
Write-Host "  - Local Dashboard: http://localhost:3555/dashboard-new.html" -ForegroundColor White
Write-Host "  - Cloud Dashboard: $CloudApiUrl/dashboard-new.html" -ForegroundColor White
Write-Host "  - API Status: http://localhost:3555/api/machines" -ForegroundColor White
Write-Host ""
Write-Host "NOTICE: All processes are running completely hidden!" -ForegroundColor Yellow
Write-Host "No PowerShell windows will remain open." -ForegroundColor Yellow
Write-Host "This window will close automatically in 8 seconds..." -ForegroundColor Yellow

# Auto-close after 8 seconds
Start-Sleep -Seconds 8
Write-Host "Closing..." -ForegroundColor Gray

# Clean up temp files
Remove-Item "start-edge-silent.bat" -ErrorAction SilentlyContinue
Remove-Item "start-edge-hidden.vbs" -ErrorAction SilentlyContinue 