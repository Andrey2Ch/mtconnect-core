param(
    [string]$CloudApiUrl = "https://mtconnect-core-production.up.railway.app",
    [string]$EdgeGatewayId = $env:COMPUTERNAME + "-edge-gateway"
)

Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-ColorOutput {
    param([string]$Text, [string]$Color = "White")
    
    switch($Color) {
        "Green" { Write-Host $Text -ForegroundColor Green }
        "Red" { Write-Host $Text -ForegroundColor Red }
        "Yellow" { Write-Host $Text -ForegroundColor Yellow }
        "Cyan" { Write-Host $Text -ForegroundColor Cyan }
        default { Write-Host $Text }
    }
}

Clear-Host
Write-ColorOutput "🚀 MTConnect System Launcher v1.0" "Cyan"
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput ""
Write-ColorOutput "📡 Cloud API URL: $CloudApiUrl" "Yellow"
Write-ColorOutput "🏭 Edge Gateway ID: $EdgeGatewayId" "Yellow"
Write-ColorOutput ""

# Остановка существующих процессов
Write-ColorOutput "⏹️  Останавливаем существующие процессы..." "Yellow"
Get-Process -Name "fanuc_0id","fanuc_18i","fanuc","node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-ColorOutput "✅ Процессы остановлены" "Green"

# Освобождение портов
Write-ColorOutput "🔧 Освобождаем порты..." "Yellow"
$ports = @(3000, 3001, 3555, 7701, 7702, 7703, 7704, 7705, 7706, 7707, 7708)
foreach($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach($processId in $processes) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}
Write-ColorOutput "✅ Порты освобождены" "Green"

Start-Sleep -Seconds 3

# Проверка структуры проекта
$requiredPaths = @(
    "Fanuc\M_1_XD-20\Adapter\fanuc_0id.exe",
    "Fanuc\M_2_SR_26\Adapter\fanuc_0id.exe", 
    "Fanuc\M_3_XD_38\Adapter\fanuc_0id.exe",
    "Fanuc\M_4_SR_10\Adapter\fanuc_0id.exe",
    "Fanuc\M_5_DT_26\Adapter\fanuc_0id.exe",
    "Fanuc\M_6_SR_21\Adapter\fanuc_0id.exe",
    "Fanuc\M_7_SR_23\Adapter\fanuc_18i.exe",
    "Fanuc\M_8_SR_25\Adapter\fanuc_18i.exe",
    "src\main.ts",
    "package.json"
)

$missingFiles = @()
foreach($path in $requiredPaths) {
    if(!(Test-Path $path)) {
        $missingFiles += $path
    }
}

if($missingFiles.Count -gt 0) {
    Write-ColorOutput "❌ ОШИБКА: Отсутствуют необходимые файлы:" "Red"
    foreach($file in $missingFiles) {
        Write-ColorOutput "   - $file" "Red"  
    }
    Write-ColorOutput ""
    Write-ColorOutput "Убедитесь что EXE файл запущен в корне проекта MTConnect" "Yellow"
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Запуск FANUC адаптеров
Write-ColorOutput "🔧 Запускаем FANUC адаптеры..." "Yellow"

$adapters = @(
    @{Path="Fanuc\M_1_XD-20\Adapter"; Exe="fanuc_0id.exe"; Name="XD-20"; Port="7701"},
    @{Path="Fanuc\M_2_SR_26\Adapter"; Exe="fanuc_0id.exe"; Name="SR-26"; Port="7702"},
    @{Path="Fanuc\M_3_XD_38\Adapter"; Exe="fanuc_0id.exe"; Name="XD-38"; Port="7703"},
    @{Path="Fanuc\M_4_SR_10\Adapter"; Exe="fanuc_0id.exe"; Name="SR-10"; Port="7704"},
    @{Path="Fanuc\M_5_DT_26\Adapter"; Exe="fanuc_0id.exe"; Name="DT-26"; Port="7705"},
    @{Path="Fanuc\M_6_SR_21\Adapter"; Exe="fanuc_0id.exe"; Name="SR-21"; Port="7706"},
    @{Path="Fanuc\M_7_SR_23\Adapter"; Exe="fanuc_18i.exe"; Name="SR-23"; Port="7707"},
    @{Path="Fanuc\M_8_SR_25\Adapter"; Exe="fanuc_18i.exe"; Name="SR-25"; Port="7708"}
)

$activeAdapters = 0
foreach($adapter in $adapters) {
    $fullPath = $adapter.Path + "\" + $adapter.Exe
    if(Test-Path $fullPath) {
        Push-Location $adapter.Path
        Start-Process -FilePath $adapter.Exe -ArgumentList "run" -WindowStyle Hidden -ErrorAction SilentlyContinue
        Pop-Location
        Write-ColorOutput "✅ $($adapter.Name): Запущен на порту $($adapter.Port)" "Green"
        $activeAdapters++
    } else {
        Write-ColorOutput "❌ $($adapter.Name): $($adapter.Exe) не найден" "Red"
    }
}

Write-ColorOutput "⏱️  Ждем инициализации адаптеров (10 секунд)..." "Yellow"
Start-Sleep -Seconds 10

# Запуск Edge Gateway
Write-ColorOutput "🚀 Запускаем Edge Gateway..." "Yellow"

# Устанавливаем переменные окружения
$env:CLOUD_API_URL = $CloudApiUrl
$env:EDGE_GATEWAY_ID = $EdgeGatewayId

# Проверяем наличие Node.js
try {
    $nodeVersion = & node --version 2>$null
    Write-ColorOutput "✅ Node.js найден: $nodeVersion" "Green"
} catch {
    Write-ColorOutput "❌ Node.js не найден! Установите Node.js для работы системы." "Red"
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Устанавливаем зависимости если нужно
if(!(Test-Path "node_modules")) {
    Write-ColorOutput "📦 Устанавливаем зависимости..." "Yellow"
    try {
        if(Get-Command pnpm -ErrorAction SilentlyContinue) {
            & pnpm install
        } else {
            & npm install
        }
        Write-ColorOutput "✅ Зависимости установлены" "Green"
    } catch {
        Write-ColorOutput "❌ Ошибка установки зависимостей" "Red"
        Read-Host "Нажмите Enter для выхода"
        exit 1
    }
}

# Запускаем Edge Gateway в отдельном процессе
Write-ColorOutput "📡 Запускаем Edge Gateway на порту 3555..." "Yellow"
try {
    Start-Process -FilePath "npx" -ArgumentList "ts-node","src/main.ts" -WindowStyle Minimized
    Write-ColorOutput "✅ Edge Gateway запущен" "Green"
} catch {
    Write-ColorOutput "❌ Ошибка запуска Edge Gateway" "Red"
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

Write-ColorOutput "⏱️  Ждем инициализации API (15 секунд)..." "Yellow"
Start-Sleep -Seconds 15

# Проверка системы
Write-ColorOutput "🔍 Проверка системы..." "Yellow"

# Проверка портов адаптеров
Write-ColorOutput "📊 Проверка FANUC адаптеров:" "Cyan"
$workingAdapters = 0
for($port = 7701; $port -le 7708; $port++) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if($connection) {
            Write-ColorOutput "   ✅ Порт $port - Активен" "Green"
            $workingAdapters++
        } else {
            Write-ColorOutput "   ❌ Порт $port - Не отвечает" "Red"
        }
    } catch {
        Write-ColorOutput "   ❌ Порт $port - Не отвечает" "Red"
    }
}

# Проверка Edge Gateway API
Write-ColorOutput "📊 Проверка Edge Gateway API:" "Cyan"
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3555/api/machines" -TimeoutSec 10 -ErrorAction Stop
    Write-ColorOutput "   ✅ API: Активен" "Green"
    $apiStatus = "OK"
} catch {
    Write-ColorOutput "   ❌ API: Не отвечает" "Red"
    $apiStatus = "ERROR"
}

# Итоговый отчет
Write-ColorOutput ""
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput "📊 ИТОГОВЫЙ ОТЧЕТ ЗАПУСКА:" "Cyan"
Write-ColorOutput "   🔧 FANUC Адаптеры: $workingAdapters/8 активны" "Yellow"
Write-ColorOutput "   📡 Edge Gateway API: http://localhost:3555/api/machines" "Yellow"
Write-ColorOutput "   🌐 Локальный дашборд: http://localhost:3555/dashboard-new.html" "Yellow"
Write-ColorOutput "   ☁️  Облачный дашборд: $CloudApiUrl/dashboard-new.html" "Yellow"

if($workingAdapters -eq 8 -and $apiStatus -eq "OK") {
    Write-ColorOutput ""
    Write-ColorOutput "✅ ВСЯ СИСТЕМА ЗАПУЩЕНА УСПЕШНО!" "Green"
    Write-ColorOutput "🌐 Открываем дашборд в браузере..." "Green"
    Start-Process "http://localhost:3555/dashboard-new.html"
} else {
    Write-ColorOutput ""
    Write-ColorOutput "⚠️  СИСТЕМА ЗАПУЩЕНА С ПРЕДУПРЕЖДЕНИЯМИ" "Yellow"
    if($apiStatus -ne "OK") {
        Write-ColorOutput "   API не отвечает. Проверьте логи Edge Gateway." "Yellow"
    }
    if($workingAdapters -lt 8) {
        Write-ColorOutput "   Не все адаптеры отвечают. Проверьте подключения станков." "Yellow"
    }
}

Write-ColorOutput ""
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput "🎯 СИСТЕМА ГОТОВА К РАБОТЕ!" "Green"
Write-ColorOutput ""
Write-ColorOutput "💡 Полезные ссылки:" "Cyan"
Write-ColorOutput "   - Локальный дашборд: http://localhost:3555/dashboard-new.html" "White"
$cloudDashboard = $CloudApiUrl + "/dashboard-new.html"
Write-ColorOutput "   - Облачный дашборд: $cloudDashboard" "White"
Write-ColorOutput "   - API статус: http://localhost:3555/api/machines" "White"
Write-ColorOutput ""
Write-ColorOutput "⚠️  ВНИМАНИЕ: Можно безопасно закрыть это окно!" "Yellow"
Write-ColorOutput "   Все процессы работают независимо в фоне." "Yellow"
Write-ColorOutput ""

Read-Host "Нажмите Enter для выхода" 