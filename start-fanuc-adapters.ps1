# Start all Fanuc adapters
Write-Host "Starting all Fanuc adapters..." -ForegroundColor Green

$adapters = @(
    @{Name="XD-20"; Station="M_1_XD-20"; Port=7878; Exe="fanuc_0id.exe"}
    @{Name="SR-26"; Station="M_2_SR_26"; Port=7879; Exe="fanuc_0id.exe"}
    @{Name="XD-38"; Station="M_3_XD_38"; Port=7880; Exe="fanuc_0id.exe"}
    @{Name="SR-10"; Station="M_4_SR_10"; Port=7881; Exe="fanuc_0id.exe"}
    @{Name="DT-26"; Station="M_5_DT_26"; Port=7882; Exe="fanuc_0id.exe"}
    @{Name="SR-21"; Station="M_6_SR_21"; Port=7883; Exe="fanuc_0id.exe"}
    @{Name="SR-23"; Station="M_7_SR_23"; Port=7884; Exe="fanuc_18i.exe"}
    @{Name="SR-25"; Station="M_8_SR_25"; Port=7885; Exe="fanuc_18i.exe"}
)

foreach ($adapter in $adapters) {
    $adapterPath = "PIM/Fanuc/$($adapter.Station)/Adapter"
    $exePath = "$adapterPath/$($adapter.Exe)"
    
    Write-Host "Starting adapter $($adapter.Name) on port $($adapter.Port)..." -ForegroundColor Yellow
    
    if (Test-Path $exePath) {
        # Start adapter with port as argument
        Start-Process -FilePath $exePath -ArgumentList "$($adapter.Port)" -WorkingDirectory $adapterPath -WindowStyle Minimized
        Write-Host "Adapter $($adapter.Name) started on port $($adapter.Port)" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Adapter file not found: $exePath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "All adapters started!" -ForegroundColor Green
Write-Host "Adapter ports: 7878-7885" -ForegroundColor Cyan
Write-Host "Agent ports: 5001-5008" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking running processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*fanuc*" } | Format-Table ProcessName, Id, WorkingSet -AutoSize 