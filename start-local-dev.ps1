#!/usr/bin/env pwsh

Write-Host "🚀 Запуск локальной разработки MTConnect..." -ForegroundColor Green
Write-Host ""

# Проверяем что проект собран
Write-Host "📦 Проверка сборки..." -ForegroundColor Yellow
if (!(Test-Path "dist/main.js")) {
    Write-Host "⚙️ Проект не собран, запускаем сборку..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка сборки!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎯 Запускаем два сервера:" -ForegroundColor Cyan
Write-Host "   📡 Edge Gateway (порт 5000) - сбор данных с машин" -ForegroundColor White
Write-Host "   ☁️  Cloud API (порт 3000) - дашборды и анализ" -ForegroundColor White
Write-Host ""

# Запускаем Edge Gateway в отдельном окне
Write-Host "🚀 Запуск Edge Gateway..." -ForegroundColor Green
$edgeProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node dist/main.js" -PassThru

Start-Sleep 3

# Запускаем Cloud API в отдельном окне  
Write-Host "🚀 Запуск Cloud API..." -ForegroundColor Green
$cloudProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\cloud-api'; npm run start:dev" -PassThru

Write-Host ""
Write-Host "✅ Серверы запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Доступные интерфейсы:" -ForegroundColor Cyan
Write-Host "   🌐 Edge Gateway:    http://localhost:5000" -ForegroundColor White
Write-Host "   📊 MTConnect данные: http://localhost:5000/current" -ForegroundColor White  
Write-Host "   💚 Health check:    http://localhost:5000/health" -ForegroundColor White
Write-Host "   ☁️  Railway статус:  http://localhost:5000/railway-status" -ForegroundColor White
Write-Host ""
Write-Host "   🔥 Cloud Dashboard:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "   📈 Dashboard API:    http://localhost:3000/api/dashboard/health" -ForegroundColor White
Write-Host ""
Write-Host "📡 Данные идут от одних и тех же машин в оба интерфейса!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Для остановки закройте окна серверов или нажмите Ctrl+C" -ForegroundColor Yellow

# Ждем закрытия любого из процессов
Write-Host "Ожидание завершения серверов..." -ForegroundColor Gray
Wait-Process -Id $edgeProcess.Id, $cloudProcess.Id -ErrorAction SilentlyContinue

Write-Host "🛑 Серверы остановлены" -ForegroundColor Red 