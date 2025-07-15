# Create Fanuc adapter simulators
Write-Host "Creating Fanuc adapter simulators..." -ForegroundColor Green

$adapters = @(
    @{Name="XD-20"; Station="M_1_XD-20"; Port=7878}
    @{Name="SR-26"; Station="M_2_SR_26"; Port=7879}
    @{Name="XD-38"; Station="M_3_XD_38"; Port=7880}
    @{Name="SR-10"; Station="M_4_SR_10"; Port=7881}
    @{Name="DT-26"; Station="M_5_DT_26"; Port=7882}
    @{Name="SR-21"; Station="M_6_SR_21"; Port=7883}
    @{Name="SR-23"; Station="M_7_SR_23"; Port=7884}
    @{Name="SR-25"; Station="M_8_SR_25"; Port=7885}
)

# Create Node.js simulator for each adapter
foreach ($adapter in $adapters) {
    $adapterPath = "PIM/Fanuc/$($adapter.Station)/Adapter"
    $simulatorPath = "$adapterPath/simulator.js"
    
    # Create directory if it doesn't exist
    if (!(Test-Path $adapterPath)) {
        New-Item -ItemType Directory -Force -Path $adapterPath
    }
    
    Write-Host "Creating simulator for $($adapter.Name) on port $($adapter.Port)..." -ForegroundColor Yellow
    
    # Create Node.js simulator
    $simulator = @"
const net = require('net');

const PORT = $($adapter.Port);
const MACHINE_NAME = '$($adapter.Name)';

console.log('Starting Fanuc adapter simulator for ' + MACHINE_NAME + ' on port ' + PORT);

const server = net.createServer((socket) => {
    console.log('MTConnect Agent connected to ' + MACHINE_NAME);
    
    let partCount = Math.floor(Math.random() * 1000) + 100;
    let spindle = Math.floor(Math.random() * 2000) + 500;
    let xPos = Math.floor(Math.random() * 100) + 50;
    let yPos = Math.floor(Math.random() * 100) + 50;
    let zPos = Math.floor(Math.random() * 100) + 50;
    
    // Send initial data
    socket.write('|avail|AVAILABLE\n');
    socket.write('|execution|ACTIVE\n');
    socket.write('|program|O' + Math.floor(Math.random() * 9000 + 1000) + '\n');
    socket.write('|line|' + Math.floor(Math.random() * 100 + 1) + '\n');
    socket.write('|partcount|' + partCount + '\n');
    socket.write('|spindle|' + spindle + '\n');
    socket.write('|Xact|' + xPos + '\n');
    socket.write('|Yact|' + yPos + '\n');
    socket.write('|Zact|' + zPos + '\n');
    
    // Update data every 5 seconds
    const interval = setInterval(() => {
        // Simulate part production
        if (Math.random() > 0.7) {
            partCount++;
            socket.write('|partcount|' + partCount + '\n');
        }
        
        // Simulate spindle speed changes
        if (Math.random() > 0.5) {
            spindle = Math.floor(Math.random() * 2000) + 500;
            socket.write('|spindle|' + spindle + '\n');
        }
        
        // Simulate axis position changes
        if (Math.random() > 0.6) {
            xPos = Math.floor(Math.random() * 100) + 50;
            yPos = Math.floor(Math.random() * 100) + 50;
            zPos = Math.floor(Math.random() * 100) + 50;
            socket.write('|Xact|' + xPos + '\n');
            socket.write('|Yact|' + yPos + '\n');
            socket.write('|Zact|' + zPos + '\n');
        }
        
        // Simulate execution status changes
        if (Math.random() > 0.9) {
            const statuses = ['ACTIVE', 'IDLE', 'FEED_HOLD'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            socket.write('|execution|' + status + '\n');
        }
        
        console.log(MACHINE_NAME + ' - Part Count: ' + partCount + ', Spindle: ' + spindle + ' RPM');
    }, 5000);
    
    socket.on('close', () => {
        console.log('MTConnect Agent disconnected from ' + MACHINE_NAME);
        clearInterval(interval);
    });
    
    socket.on('error', (err) => {
        console.error('Socket error for ' + MACHINE_NAME + ':', err);
        clearInterval(interval);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('Fanuc adapter simulator for ' + MACHINE_NAME + ' listening on port ' + PORT);
});

server.on('error', (err) => {
    console.error('Server error for ' + MACHINE_NAME + ':', err);
});
"@
    
    $simulator | Out-File -FilePath $simulatorPath -Encoding ASCII
    
    # Create batch file to run the simulator
    $batchPath = "$adapterPath/start-simulator.bat"
    $batch = @"
@echo off
echo Starting Fanuc adapter simulator for $($adapter.Name) on port $($adapter.Port)...
node simulator.js
pause
"@
    
    $batch | Out-File -FilePath $batchPath -Encoding ASCII
    
    Write-Host "Simulator created: $simulatorPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "All Fanuc adapter simulators created!" -ForegroundColor Green
Write-Host "Each simulator provides realistic MTConnect data:" -ForegroundColor Cyan
Write-Host "- Part count with incremental updates" -ForegroundColor White
Write-Host "- Spindle speed variations" -ForegroundColor White
Write-Host "- Axis positions (X, Y, Z)" -ForegroundColor White
Write-Host "- Execution status changes" -ForegroundColor White
Write-Host "- Program information" -ForegroundColor White
Write-Host ""
Write-Host "To start all simulators, run: .\start-fanuc-simulators.ps1" -ForegroundColor Yellow 