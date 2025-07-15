# Setup script for MTConnect Fanuc Agents
Write-Host "Setting up MTConnect Fanuc Agents..." -ForegroundColor Green

$machines = @(
    @{Name="XD-20"; Port=5001; AdapterPort=7878; Station="M_1_XD-20"; SerialNumber="XD20-001"}
    @{Name="SR-26"; Port=5002; AdapterPort=7879; Station="M_2_SR_26"; SerialNumber="SR26-002"}
    @{Name="XD-38"; Port=5003; AdapterPort=7880; Station="M_3_XD_38"; SerialNumber="XD38-003"}
    @{Name="SR-10"; Port=5004; AdapterPort=7881; Station="M_4_SR_10"; SerialNumber="SR10-004"}
    @{Name="DT-26"; Port=5005; AdapterPort=7882; Station="M_5_DT_26"; SerialNumber="DT26-005"}
    @{Name="SR-21"; Port=5006; AdapterPort=7883; Station="M_6_SR_21"; SerialNumber="SR21-006"}
    @{Name="SR-23"; Port=5007; AdapterPort=7884; Station="M_7_SR_23"; SerialNumber="SR23-007"}
    @{Name="SR-25"; Port=5008; AdapterPort=7885; Station="M_8_SR_25"; SerialNumber="SR25-008"}
)

foreach ($machine in $machines) {
    $configPath = "PIM/Fanuc/$($machine.Station)/Agent/agent.cfg"
    Write-Host "Creating configuration for $($machine.Name)..." -ForegroundColor Yellow
    
    $config = @"
Port = $($machine.Port)

Adapters {
    Fanuc {
        Host = 127.0.0.1
        Port = $($machine.AdapterPort)
        ScanDelay = 200
        ReconnectInterval = 10000
        RealTime = true
        RelativeTime = true
        ConversionRequired = true
        UpcaseDataItemValue = true
        FilterDuplicates = true
        Device = $($machine.Name)
        AutoAvailable = true
        IgnoreTimestamps = false
        PreserveUuid = true
        LegacyTimeout = 600
        HeartbeatInterval = 30000
        Manufacturer = Fanuc
        Station = $($machine.Station)
        SerialNumber = $($machine.SerialNumber)
        Uuid = $($machine.SerialNumber)
        Description = Fanuc $($machine.Name) CNC Machine
    }
}

Files {
    Schemas {
        Path = .
        Location = /schemas/
    }
    
    Styles {
        Path = .
        Location = /styles/
    }
    
    JavaScript {
        Path = .
        Location = /javascript/
    }
}

StreamsStyle {
    Location = /styles/Streams.xsl
}

Devices = devices.xml
ServiceName = MTConnect Agent - $($machine.Name)
ServiceDescription = MTConnect Agent for Fanuc $($machine.Name) Machine
MonitorConfigFiles = true
CheckpointFrequency = 1000
WorkerThreads = 1
MaxAssets = 128
AssetBufferSize = 1024
BufferSize = 131072
"@
    
    $config | Out-File -FilePath $configPath -Encoding ASCII
    Write-Host "Configuration created: $configPath" -ForegroundColor Green
}

Write-Host "All MTConnect agent configurations created!" -ForegroundColor Green
Write-Host "Agent ports: 5001-5008" -ForegroundColor Cyan
Write-Host "Adapter ports: 7878-7885" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: Start adapters on ports 7878-7885" -ForegroundColor Yellow 