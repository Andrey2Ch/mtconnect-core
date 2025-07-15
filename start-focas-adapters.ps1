# Start all FOCAS adapters for real Fanuc machines
Write-Host "Starting FOCAS adapters for real Fanuc machines..." -ForegroundColor Green

$machines = @(
    @{Name="XD-20"; Station="M_1_XD-20"; Port=7878; RealIP="192.168.1.105"}
    @{Name="SR-26"; Station="M_2_SR_26"; Port=7879; RealIP="192.168.1.54"}
    @{Name="XD-38"; Station="M_3_XD_38"; Port=7880; RealIP="192.168.1.106"}
    @{Name="SR-10"; Station="M_4_SR_10"; Port=7881; RealIP="192.168.1.91"}
    @{Name="DT-26"; Station="M_5_DT_26"; Port=7882; RealIP="192.168.1.90"}
    @{Name="SR-21"; Station="M_6_SR_21"; Port=7883; RealIP="192.168.1.199"}
    @{Name="SR-23"; Station="M_7_SR_23"; Port=7884; RealIP="192.168.1.103"}
    @{Name="SR-25"; Station="M_8_SR_25"; Port=7885; RealIP="192.168.1.104"}
)

foreach ($machine in $machines) {
    $adapterPath = "PIM/Fanuc/$($machine.Station)/Adapter"
    $adapterScript = "$adapterPath/focas-adapter.js"
    
    Write-Host "Starting FOCAS adapter for $($machine.Name) -> $($machine.RealIP):8193..." -ForegroundColor Yellow
    
    if (Test-Path $adapterScript) {
        # Start FOCAS adapter in minimized window
        Start-Process -FilePath "node" -ArgumentList "$adapterScript" -WorkingDirectory $adapterPath -WindowStyle Minimized
        Write-Host "FOCAS adapter $($machine.Name) started on port $($machine.Port)" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "FOCAS adapter file not found: $adapterScript" -ForegroundColor Red
        Write-Host "Run .\create-focas-adapters.ps1 first" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "All FOCAS adapters started!" -ForegroundColor Green
Write-Host "Each adapter is:" -ForegroundColor Cyan
Write-Host "- Connecting to real machine IP via UDP/TCP port 8193" -ForegroundColor White
Write-Host "- Providing MTConnect data stream on ports 7878-7885" -ForegroundColor White
Write-Host "- Falling back to IP-based simulation if connection fails" -ForegroundColor White
Write-Host "- Logging connection status and data updates" -ForegroundColor White
Write-Host ""
Write-Host "Checking running Node.js processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Format-Table ProcessName, Id, WorkingSet -AutoSize

Write-Host ""
Write-Host "Next: MTConnect Agents will connect to these adapters" -ForegroundColor Yellow
Write-Host "Expected result: Real machine data in MTConnect format" -ForegroundColor Green 