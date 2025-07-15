# Убедимся, что политика выполнения разрешает запуск скриптов
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path -Path $ScriptDir
$ConfigPath = Join-Path -Path $ProjectRoot -ChildPath "config.json"
$LogDir = Join-Path -Path $ProjectRoot -ChildPath "logs"

# Создаем папку для логов, если ее нет
if (-not (Test-Path -Path $LogDir -PathType Container)) {
    New-Item -Path $LogDir -ItemType Directory | Out-Null
}

# Загружаем конфигурацию
if (-not (Test-Path -Path $ConfigPath)) {
    Write-Error "[ERROR] Config file not found at: $ConfigPath"
    exit 1
}
$Config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Starting all FANUC MTConnect Adapters and Agents in background..."
Write-Host "Logs will be written to: $LogDir"
Write-Host "==========================================================" -ForegroundColor Green

# Запускаем адаптеры и агенты для каждой машины
foreach ($Machine in $Config.machines) {
    $MachineName = $Machine.name
    $MachineId = $Machine.id
    $AgentPort = $Machine.port
    $AdapterIp = $Machine.ip
    
    $LogFileBase = Join-Path -Path $LogDir -ChildPath $MachineId
    $MachineDir = Join-Path -Path $ProjectRoot -ChildPath "PIM/Fanuc/$MachineId"
    $AdapterDir = Join-Path -Path $MachineDir -ChildPath "Adapter"
    
    # --- Запуск Адаптера ---
    $AdapterExePath = Get-ChildItem -Path $AdapterDir -Filter "fanuc*.exe" | Select-Object -First 1
    if ($AdapterExePath) {
        $AdapterArgs = "debug port=$AgentPort $AdapterIp"
        
        Write-Host "[INFO] Starting Adapter for $MachineName on port $AgentPort..." -ForegroundColor Cyan
        Start-Process -FilePath $AdapterExePath.FullName -ArgumentList $AdapterArgs -NoNewWindow -RedirectStandardOutput "$($LogFileBase)-adapter.log" -RedirectStandardError "$($LogFileBase)-adapter.err.log"
    } else {
        Write-Warning "[WARN] Adapter executable not found for $MachineName in $AdapterDir"
    }

    # --- Запуск Агента ---
    $AgentDir = Join-Path -Path $MachineDir -ChildPath "Agent"
    $AgentExePath = Join-Path -Path $AgentDir -ChildPath "agent.exe"
    if (Test-Path $AgentExePath) {
        # Создаем временный agent.cfg для передачи порта
        $agentCfgContent = "Port = $AgentPort`n"
        $agentCfgPath = Join-Path -Path $AgentDir -ChildPath "agent.cfg"
        Set-Content -Path $agentCfgPath -Value $agentCfgContent -Encoding ascii

        Write-Host "[INFO] Starting Agent for $MachineName on port $AgentPort..." -ForegroundColor Cyan
        Start-Process -FilePath $AgentExePath -ArgumentList "debug" -WorkingDirectory $AgentDir -NoNewWindow -RedirectStandardOutput "$($LogFileBase)-agent.log" -RedirectStandardError "$($LogFileBase)-agent.err.log"
    } else {
        Write-Warning "[WARN] Agent executable not found for $MachineName in $AgentDir"
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "All services launched in the background."
Write-Host "You can now start the main dashboard server with 'start-local-dev.ps1'."
Write-Host "==========================================================" -ForegroundColor Green 