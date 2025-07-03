# Set execution policy for the current process to avoid errors
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# Get the directory of the script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Указываем правильную корневую директорию, где лежат папки со станками
$FanucDir = Join-Path -Path $ScriptDir -ChildPath "PIM/Fanuc"

# Корневая директория, где лежат папки со станками (M_1_..., M_2_...)
$baseDir = "PIM/Fanuc"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Starting all FANUC MTConnect Adapters and Agents..."
Write-Host "Each service will launch in a hidden background window."
Write-Host "Searching for machines in: $FanucDir"
Write-Host "==========================================================" -ForegroundColor Green

# Check if the Fanuc directory exists
if (-not (Test-Path -Path $FanucDir -PathType Container)) {
    Write-Error "[ERROR] Fanuc directory not found at: $FanucDir"
    exit 1
}

# Get all machine directories (e.g., M_1_XD-20)
$MachineDirs = Get-ChildItem -Path $FanucDir -Directory -Filter "M_*"

if ($MachineDirs.Count -eq 0) {
    Write-Warning "[WARN] No machine directories (M_*) found in $FanucDir"
    exit 0
}

foreach ($MachineDir in $MachineDirs) {
    $MachineName = $MachineDir.Name
    Write-Host "`n--- Processing Machine: $MachineName ---" -ForegroundColor Yellow

    $AdapterDir = Join-Path -Path $MachineDir.FullName -ChildPath "Adapter"
    $AgentDir = Join-Path -Path $MachineDir.FullName -ChildPath "Agent"

    # --- Start Adapter ---
    $AdapterExeName = $null
    $AdapterExePath = $null
    if (Test-Path -Path (Join-Path $AdapterDir "fanuc_0id.exe")) {
        $AdapterExeName = "fanuc_0id.exe"
        $AdapterExePath = Join-Path $AdapterDir $AdapterExeName
    }
    elseif (Test-Path -Path (Join-Path $AdapterDir "fanuc_18i.exe")) {
        $AdapterExeName = "fanuc_18i.exe"
        $AdapterExePath = Join-Path $AdapterDir $AdapterExeName
    }

    if ($AdapterExePath) {
        # Check if process is already running
        $existingProcess = Get-Process -Name ($AdapterExeName -replace '\.exe$') -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $AdapterExePath }
        if ($existingProcess) {
            Write-Warning "[WARN] Adapter for $MachineName is already running. PID: $($existingProcess.Id). Skipping."
        } else {
            Write-Host "[INFO] Starting Adapter for $MachineName..."
            $Title = "Adapter - $MachineName"
            Start-Process -FilePath "cmd.exe" -ArgumentList "/k title $Title && cd /d `"$AdapterDir`" && `"$AdapterExePath`" run" -WindowStyle Hidden
        }
    } else {
        Write-Warning "[WARN] Adapter executable not found for $MachineName in $AdapterDir"
    }

    # --- Start Agent ---
    $AgentExePath = Join-Path $AgentDir "agent.exe"
    if (Test-Path -Path $AgentExePath) {
        # Check if agent process is already running from this specific path
        $existingAgent = Get-Process -Name "agent" -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $AgentExePath }
        if ($existingAgent) {
            Write-Warning "[WARN] Agent for $MachineName is already running. PID: $($existingAgent.Id). Skipping."
        } else {
            Write-Host "[INFO] Starting Agent for $MachineName..."
            $Title = "Agent - $MachineName"
            Start-Process -FilePath "cmd.exe" -ArgumentList "/k title $Title && cd /d `"$AgentDir`" && `"$AgentExePath`" run" -WindowStyle Hidden
        }
    } else {
        Write-Warning "[WARN] Agent executable not found for $MachineName in $AgentDir"
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "All service windows have been launched."
Write-Host "Check each window for errors."
Write-Host "You can now start the main dashboard server."
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Note: Services are running in the background. Check Task Manager to see the processes."
Write-Host "Press any key to exit this script..."
Read-Host 