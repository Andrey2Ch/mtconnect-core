#!/usr/bin/env pwsh

# MTConnect System Local Development Startup Script
# Start all MTConnect system components

Write-Host "Starting MTConnect system..." -ForegroundColor Green

# Check ports
Write-Host "Checking occupied ports..." -ForegroundColor Yellow
$ports = @(3000, 3001, 1883, 27017, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet
    if ($connection) {
        Write-Host "Port $port is already in use" -ForegroundColor Yellow
    }
}

# 1. Start MongoDB
Write-Host "Starting MongoDB..." -ForegroundColor Cyan
Start-Process -FilePath "docker" -ArgumentList "run --name mongodb-simple -p 27017:27017 -d mongo:latest"

# 2. Start MQTT Broker
Write-Host "Starting MQTT Broker..." -ForegroundColor Cyan
Start-Process -FilePath "docker" -ArgumentList "run --name mosquitto -p 1883:1883 -d eclipse-mosquitto:latest"

# 3. Start all FOCAS adapters for real machines
Write-Host "Starting all FOCAS adapters for real machines..." -ForegroundColor Cyan
$adapters = @(
    @{Name="XD-20"; Station="M_1_XD-20"; Port=7878; RealIP="192.168.1.105"}
    @{Name="SR-26"; Station="M_2_SR_26"; Port=7879; RealIP="192.168.1.54"}
    @{Name="XD-38"; Station="M_3_XD_38"; Port=7880; RealIP="192.168.1.106"}
    @{Name="SR-10"; Station="M_4_SR_10"; Port=7881; RealIP="192.168.1.91"}
    @{Name="DT-26"; Station="M_5_DT_26"; Port=7882; RealIP="192.168.1.90"}
    @{Name="SR-21"; Station="M_6_SR_21"; Port=7883; RealIP="192.168.1.199"}
    @{Name="SR-23"; Station="M_7_SR_23"; Port=7884; RealIP="192.168.1.103"}
    @{Name="SR-25"; Station="M_8_SR_25"; Port=7885; RealIP="192.168.1.104"}
)

foreach ($adapter in $adapters) {
    $adapterPath = "PIM/Fanuc/$($adapter.Station)/Adapter"
    $adapterScript = "$adapterPath/focas-adapter.js"
    
    if (Test-Path $adapterScript) {
        Write-Host "  Starting FOCAS adapter $($adapter.Name) -> $($adapter.RealIP):8193..." -ForegroundColor Yellow
        Start-Process -FilePath "node" -ArgumentList "$adapterScript" -WorkingDirectory $adapterPath -WindowStyle Minimized
        Start-Sleep -Seconds 2
    } else {
        Write-Host "  FOCAS adapter file not found: $adapterScript" -ForegroundColor Red
        Write-Host "  Run .\create-focas-adapters.ps1 first" -ForegroundColor Yellow
    }
}

# 4. Start all MTConnect agents
Write-Host "Starting all MTConnect agents..." -ForegroundColor Cyan
$agents = @(
    @{Name="XD-20"; Station="M_1_XD-20"; Port=5001}
    @{Name="SR-26"; Station="M_2_SR_26"; Port=5002}
    @{Name="XD-38"; Station="M_3_XD_38"; Port=5003}
    @{Name="SR-10"; Station="M_4_SR_10"; Port=5004}
    @{Name="DT-26"; Station="M_5_DT_26"; Port=5005}
    @{Name="SR-21"; Station="M_6_SR_21"; Port=5006}
    @{Name="SR-23"; Station="M_7_SR_23"; Port=5007}
    @{Name="SR-25"; Station="M_8_SR_25"; Port=5008}
)

foreach ($agent in $agents) {
    $agentPath = "PIM/Fanuc/$($agent.Station)/Agent"
    $exePath = "$agentPath/agent.exe"
    
    if (Test-Path $exePath) {
        Write-Host "  Starting agent $($agent.Name) on port $($agent.Port)..." -ForegroundColor Yellow
        Start-Process -FilePath $exePath -WorkingDirectory $agentPath -WindowStyle Minimized
        Start-Sleep -Seconds 1
    } else {
        Write-Host "  Agent file not found: $exePath" -ForegroundColor Red
    }
}

# 5. Build project
Write-Host "Building project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# 6. Start Edge Gateway
Write-Host "Starting Edge Gateway..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "dist/src/main.js" -WindowStyle Normal

# 7. Start Cloud API
Write-Host "Starting Cloud API..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process -FilePath "npm" -ArgumentList "--prefix", "apps/cloud-api", "run", "start:dev" -WindowStyle Normal

# Final check
Write-Host ""
Write-Host "MTConnect system started!" -ForegroundColor Green
Write-Host "Adapter ports: 7878-7885" -ForegroundColor Cyan
Write-Host "Agent ports: 5001-5008" -ForegroundColor Cyan
Write-Host "Edge Gateway: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Cloud API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3000/dashboard-new.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*fanuc*" -or $_.ProcessName -like "*agent*" -or $_.ProcessName -like "*node*" } | Format-Table ProcessName, Id, WorkingSet -AutoSize 