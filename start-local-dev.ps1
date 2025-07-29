#!/usr/bin/env pwsh

Write-Host "🚀 Запуск локальной разработки MTConnect..." -ForegroundColor Green
Write-Host ""

# Загружаем переменные окружения для Edge Gateway
Write-Host "⚙️ Загружаем переменные окружения..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            Write-Host "   📝 $($matches[1])=$($matches[2])" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ⚠️ Файл .env не найден, используем defaults" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Запускаем два сервера:" -ForegroundColor Cyan
Write-Host "   📡 Edge Gateway (порт 3555) - сбор данных с машин" -ForegroundColor White
Write-Host "   ☁️  Cloud API (порт 3001) - прием данных и дашборд" -ForegroundColor White
Write-Host ""

# Запускаем Edge Gateway в отдельном окне
Write-Host "🚀 Запуск Edge Gateway..." -ForegroundColor Green
$edgeProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx ts-node src/main.ts" -PassThru

Start-Sleep 3

# Запускаем Cloud API в отдельном окне  
Write-Host "🚀 Запуск Cloud API..." -ForegroundColor Green
$cloudProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\cloud-api'; pnpm run start:dev" -PassThru

Write-Host ""
Write-Host "✅ Серверы запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Доступные интерфейсы:" -ForegroundColor Cyan
Write-Host "   📡 Edge Gateway API:  http://localhost:3555/api/machines" -ForegroundColor White
Write-Host "   🌐 Edge Dashboard:    http://localhost:3555/dashboard-new.html" -ForegroundColor White  
Write-Host "   💚 Edge Health:       http://localhost:3555/health" -ForegroundColor White
Write-Host ""
Write-Host "   ☁️  Cloud Health:      http://localhost:3001/health" -ForegroundColor Yellow
Write-Host "   📊 Cloud Dashboard:    http://localhost:3001/dashboard-new.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 Архитектура:" -ForegroundColor Cyan
Write-Host "   Edge Gateway → HTTP POST → Cloud API" -ForegroundColor White
Write-Host "   Cloud API → MongoDB → Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Для остановки закройте окна серверов или нажмите Ctrl+C" -ForegroundColor Yellow

# Ждем закрытия любого из процессов
Write-Host "Ожидание завершения серверов..." -ForegroundColor Gray
Wait-Process -Id $edgeProcess.Id, $cloudProcess.Id -ErrorAction SilentlyContinue

Write-Host "🛑 Серверы остановлены" -ForegroundColor Red 