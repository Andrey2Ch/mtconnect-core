param(
    [string]$CloudApiUrl = "https://mtconnect-core-production.up.railway.app"
)

# Настройка консоли
$Host.UI.RawUI.WindowTitle = "MTConnect System Launcher"
Clear-Host

Write-Host "🚀 ПОЛНЫЙ ПЕРЕЗАПУСК СИСТЕМЫ MTConnect" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📡 Cloud API URL: $CloudApiUrl" -ForegroundColor Yellow
Write-Host ""

Write-Host "⏹️  ОСТАНАВЛИВАЕМ СУЩЕСТВУЮЩИЕ ПРОЦЕССЫ..." -ForegroundColor Yellow
Write-Host "    🔪 Останавливаем FANUC адаптеры..." -ForegroundColor Gray
Stop-Process -Name "fanuc_0id","fanuc_18i","fanuc" -Force -ErrorAction SilentlyContinue

Write-Host "    🔪 Останавливаем Edge Gateway API..." -ForegroundColor Gray  
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

Write-Host "    🔪 Освобождаем порты..." -ForegroundColor Gray
$ports = @(3000, 3001, 3555, 7701, 7702, 7703, 7704, 7705, 7706, 7707, 7708)
foreach($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "    ✅ Очистка процессов завершена" -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🔧 ЗАПУСКАЕМ FANUC АДАПТЕРЫ В СКРЫТОМ РЕЖИМЕ..." -ForegroundColor Yellow

# Запуск адаптеров
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
        Write-Host "✅ $($adapter.Name): Запущен" -ForegroundColor Green
    } else {
        Write-Host "❌ $($adapter.Name): $($adapter.Exe) не найден" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "    ⏱️  Ждем инициализации адаптеров (10 секунд)..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🚀 ЗАПУСКАЕМ EDGE GATEWAY API..." -ForegroundColor Yellow
Write-Host "    📡 API будет доступен на порту 3555" -ForegroundColor Gray
Write-Host "    🔄 Запускаем в независимом процессе..." -ForegroundColor Gray

# Устанавливаем переменные окружения
$env:CLOUD_API_URL = $CloudApiUrl
$env:EDGE_GATEWAY_ID = $env:COMPUTERNAME + "-edge-gateway"

# Запускаем Edge Gateway
Start-Process -FilePath "cmd" -ArgumentList "/c","npx ts-node src/main.ts" -WindowStyle Minimized

Write-Host "    ⏱️  Ждем инициализации API (15 секунд)..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "🔍 ПРОВЕРКА СИСТЕМЫ..." -ForegroundColor Yellow
Write-Host "    📊 Проверка FANUC адаптеров:" -ForegroundColor Cyan

# Проверяем порты адаптеров
$activeAdapters = 0
for($port = 7701; $port -le 7708; $port++) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($connection) {
        Write-Host "       ✅ Порт $port - Активен" -ForegroundColor Green
        $activeAdapters++
    } else {
        Write-Host "       ❌ Порт $port - Не отвечает" -ForegroundColor Red
    }
}

Write-Host "    📊 Проверка Edge Gateway API:" -ForegroundColor Cyan
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3555/api/machines" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "       ✅ API - Активен" -ForegroundColor Green
    $apiStatus = "OK"
} catch {
    Write-Host "       ❌ API - Не отвечает" -ForegroundColor Red
    $apiStatus = "ERROR"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 ИТОГОВЫЙ ОТЧЕТ ЗАПУСКА:" -ForegroundColor Cyan
Write-Host "    🔧 FANUC Адаптеры: $activeAdapters/8 активны" -ForegroundColor Yellow
Write-Host "    📡 Edge Gateway API: http://localhost:3555/api/machines" -ForegroundColor Yellow
Write-Host "    🌐 Дашборд: http://localhost:3555/dashboard-new.html" -ForegroundColor Yellow

if($activeAdapters -eq 8 -and $apiStatus -eq "OK") {
    Write-Host ""
    Write-Host "✅ ВСЯ СИСТЕМА ЗАПУЩЕНА УСПЕШНО!" -ForegroundColor Green
    Write-Host "🌐 Открываем дашборд в браузере..." -ForegroundColor Green
    Start-Process "http://localhost:3555/dashboard-new.html"
} else {
    Write-Host ""
    Write-Host "⚠️  СИСТЕМА ЗАПУЩЕНА С ПРЕДУПРЕЖДЕНИЯМИ" -ForegroundColor Yellow
    if($apiStatus -ne "OK") {
        Write-Host "    API не отвечает. Проверьте логи Edge Gateway." -ForegroundColor Yellow
    }
    if($activeAdapters -lt 8) {
        Write-Host "    Не все адаптеры отвечают. Проверьте подключения станков." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🎯 СИСТЕМА ГОТОВА К РАБОТЕ!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Полезные команды:" -ForegroundColor Cyan
Write-Host "    - Локальный дашборд: http://localhost:3555/dashboard-new.html" -ForegroundColor White
Write-Host "    - Облачный дашборд: $CloudApiUrl/dashboard-new.html" -ForegroundColor White
Write-Host "    - API статус: http://localhost:3555/api/machines" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  ВНИМАНИЕ: Можно безопасно закрыть это окно!" -ForegroundColor Yellow
Write-Host "    Все процессы работают независимо в фоне." -ForegroundColor Yellow
Write-Host ""

Read-Host "Нажмите Enter для выхода" 