# Полная проверка и запуск Dashboard v2.0
Write-Host "🔍 Проверка системы..." -ForegroundColor Yellow

# 1. Проверяем и убиваем процессы на нужных портах
$ports = @(3000, 3001)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($process) {
        $processId = $process.OwningProcess
        Write-Host "❌ Порт $port занят процессом $processId - убиваю" -ForegroundColor Red
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# 2. Проверяем MongoDB
Write-Host "🗄️ Проверка MongoDB..." -ForegroundColor Yellow
try {
    $mongoCheck = docker exec mtconnect-mongodb-simple mongosh mtconnect --eval "db.machine_data.countDocuments()" --quiet
    if ($mongoCheck -match '\d+') {
        Write-Host "✅ MongoDB работает, записей: $($matches[0])" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ MongoDB недоступен" -ForegroundColor Red
    exit 1
}

# 3. Запускаем Edge Gateway (если нужен)
$edgeRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MTConnect*" }
if (-not $edgeRunning) {
    Write-Host "🚀 Запускаю Edge Gateway..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; `$env:PORT='3000'; npm start" -WindowStyle Minimized
    Start-Sleep -Seconds 5
}

# 4. Запускаем Cloud API v2
Write-Host "🚀 Запускаю Cloud API v2..." -ForegroundColor Yellow
Set-Location "apps/cloud-api"
$env:PORT = '3001'

# Проверяем TypeScript компиляцию
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка компиляции TypeScript:" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

# Запускаем в фоне
Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; `$env:PORT='3001'; npm run start:dev" -WindowStyle Minimized
Set-Location "../.."

# 5. Ждем и проверяем результат
Write-Host "⏳ Ожидание запуска сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Проверяем API
try {
    $apiTest = Invoke-RestMethod -Uri "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 5
    $machineCount = $apiTest.data.Count
    Write-Host "✅ API v2 работает, машин: $machineCount" -ForegroundColor Green
    
    if ($machineCount -gt 0) {
        Write-Host "🎉 Система готова!" -ForegroundColor Green
        Write-Host "📱 Дашборды доступны:" -ForegroundColor Cyan
        Write-Host "   Старый: http://localhost:3001/dashboard-new.html" -ForegroundColor Gray
        Write-Host "   Новый:  http://localhost:3001/dashboard-v2.html" -ForegroundColor White
    } else {
        Write-Host "⚠️ API работает, но машин нет. Проверь данные в MongoDB" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ API v2 не отвечает. Проверь логи." -ForegroundColor Red
    exit 1
} 