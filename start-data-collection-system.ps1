#!/usr/bin/env pwsh

# 🚀 Скрипт запуска системы сбора данных MTConnect
# Edge Gateway (сборщик) + Cloud API (хранитель)

Write-Host "🚀 Запуск системы сбора данных MTConnect..." -ForegroundColor Green
Write-Host "📡 Edge Gateway: Сбор данных от FANUC + ADAM" -ForegroundColor Cyan
Write-Host "☁️  Cloud API: Прием и сохранение в MongoDB" -ForegroundColor Cyan
Write-Host ""

# Проверка занятых портов
Write-Host "🔍 Проверка портов..." -ForegroundColor Yellow

$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "⚠️  Порт 3000 занят! Освобождаем..." -ForegroundColor Yellow
    $processes = Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force
            Write-Host "✅ Процесс $processId остановлен" -ForegroundColor Green
        } catch {
            Write-Host "❌ Не удалось остановить процесс $processId" -ForegroundColor Red
        }
    }
}

if ($port3001) {
    Write-Host "⚠️  Порт 3001 занят! Освобождаем..." -ForegroundColor Yellow
    $processes = Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force
            Write-Host "✅ Процесс $processId остановлен" -ForegroundColor Green
        } catch {
            Write-Host "❌ Не удалось остановить процесс $processId" -ForegroundColor Red
        }
    }
}

# Небольшая пауза
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🔧 Настройка переменных окружения..." -ForegroundColor Yellow
$env:CLOUD_API_PORT = "3001"
$env:MONGODB_URI = 'mongodb://admin:password@localhost:27017/mtconnect?authSource=admin'

Write-Host ""
Write-Host "🚀 Запуск системы..." -ForegroundColor Green
Write-Host "📊 Edge Gateway будет отправлять данные на: http://localhost:3001/api/v1/machine-data/ingest" -ForegroundColor Cyan
Write-Host "☁️  Cloud API будет доступен на: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📈 Дашборд доступен на: http://localhost:3001/dashboard-new.html" -ForegroundColor Cyan
Write-Host ""

# Запуск через concurrently
Write-Host Starting services -ForegroundColor Green
npm run start:dev 