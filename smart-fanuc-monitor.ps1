#!/usr/bin/env pwsh

# 🚀 ПРАВИЛЬНЫЙ СКРИПТ ЗАПУСКА СИСТЕМЫ MTConnect
# Автор: AgentDeskai

Write-Host "🚀 Запуск MTConnect системы..." -ForegroundColor Green
Write-Host ""

# Освобождаем порты
Write-Host "🔍 Освобождение портов..." -ForegroundColor Yellow
$ports = 3000,3001,7701,7702,7703,7704,7705,7706,7707,7708
foreach($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conns) {
        Write-Host "❌ Убиваю процесс на порту $port" -ForegroundColor Red
        foreach($conn in $conns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# Запуск FANUC адаптеров
Write-Host ""
Write-Host "🔧 Запуск FANUC адаптеров..." -ForegroundColor Yellow

$fanucPath = "From Anat/Fanuc"
if(!(Test-Path $fanucPath)) {
    Write-Host "❌ Папка FANUC не найдена" -ForegroundColor Red
    exit 1
}

$machines = Get-ChildItem $fanucPath -Directory -Filter "M_*"
$count = 0

foreach($machine in $machines) {
    $adapterPath = Join-Path $machine.FullName "Adapter"
    $exe = $null
    
    if(Test-Path (Join-Path $adapterPath "fanuc_0id.exe")) {
        $exe = "fanuc_0id.exe"
    } elseif(Test-Path (Join-Path $adapterPath "fanuc_18i.exe")) {
        $exe = "fanuc_18i.exe"
    }
    
    if($exe) {
        Write-Host "  ✅ Запуск $($machine.Name)" -ForegroundColor Green
        $title = "Adapter-$($machine.Name)"
        Start-Process cmd -ArgumentList "/k", "title $title && cd /d `"$adapterPath`" && $exe" -WindowStyle Minimized
        $count++
        Start-Sleep 1
    }
}

Write-Host "✅ Запущено адаптеров: $count" -ForegroundColor Green

# Проверка MongoDB
Write-Host ""
Write-Host "🗄️ Проверка MongoDB..." -ForegroundColor Yellow
try {
    $mongo = docker exec mtconnect-mongodb-simple mongosh mtconnect --eval 'db.machine_data.countDocuments()' --quiet
    Write-Host "✅ MongoDB работает" -ForegroundColor Green
} catch {
    Write-Host "❌ MongoDB недоступен" -ForegroundColor Red
    Write-Host "💡 Запустите: docker start mtconnect-mongodb-simple" -ForegroundColor Cyan
    exit 1
}

# Сборка проекта
Write-Host ""
Write-Host "📦 Сборка проекта..." -ForegroundColor Yellow
if(!(Test-Path "dist/main.js")) {
    npm run build
    if($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка сборки" -ForegroundColor Red
        exit 1
    }
}

# Запуск Edge Gateway
Write-Host ""
Write-Host "🚀 Запуск Edge Gateway..." -ForegroundColor Yellow
$env:PORT = '3000'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node dist/main.js" -WindowStyle Minimized
Write-Host "✅ Edge Gateway на порту 3000" -ForegroundColor Green

# Запуск Cloud API
Write-Host ""
Write-Host "☁️ Запуск Cloud API..." -ForegroundColor Yellow
Set-Location "apps/cloud-api"
$env:PORT = '3001'
$env:MONGODB_URI = 'mongodb://admin:password@localhost:27017/mtconnect?authSource=admin'

npm run build | Out-Null
if($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка компиляции API" -ForegroundColor Red
    Set-Location "../.."
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run start:dev" -WindowStyle Minimized
Set-Location "../.."
Write-Host "✅ Cloud API на порту 3001" -ForegroundColor Green

# Ожидание и проверка
Write-Host ""
Write-Host "⏳ Ожидание запуска..." -ForegroundColor Yellow
Start-Sleep 15

Write-Host ""
Write-Host "🔍 Проверка системы..." -ForegroundColor Yellow

try {
    Invoke-RestMethod "http://localhost:3000/health" -TimeoutSec 5 | Out-Null
    Write-Host "✅ Edge Gateway работает" -ForegroundColor Green
} catch {
    Write-Host "❌ Edge Gateway не отвечает" -ForegroundColor Red
}

try {
    $api = Invoke-RestMethod "http://localhost:3001/api/v2/dashboard/machines" -TimeoutSec 5
    Write-Host "✅ Cloud API работает, машин: $($api.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Cloud API не отвечает" -ForegroundColor Red
}

# Результат
Write-Host ""
Write-Host "🎉 СИСТЕМА ЗАПУЩЕНА!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Интерфейсы:" -ForegroundColor Cyan
Write-Host "   🌐 Edge Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "   ☁️ Cloud API: http://localhost:3001" -ForegroundColor White
Write-Host '   DASHBOARD: http://localhost:3001/dashboard-v2.html' -ForegroundColor Yellow
Write-Host ""
Write-Host 'Press any key to exit...' -ForegroundColor White
$null = Read-Host