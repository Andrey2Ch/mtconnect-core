# Скрипт для перезапуска только Edge Gateway (без FANUC адаптеров)
Write-Host "🔄 Перезапуск только Edge Gateway..." -ForegroundColor Yellow

# Останавливаем только Edge Gateway процессы
$edgeProcesses = Get-Process | Where-Object {
    $_.ProcessName -like "*node*" -and 
    $_.CommandLine -like "*main.ts*"
}

if ($edgeProcesses) {
    Write-Host "🛑 Останавливаем Edge Gateway процессы..." -ForegroundColor Red
    $edgeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
} else {
    Write-Host "ℹ️ Edge Gateway процессы не найдены" -ForegroundColor Blue
}

# Проверяем что порт 3555 свободен
$portInUse = netstat -an | findstr ":3555"
if ($portInUse) {
    Write-Host "⚠️ Порт 3555 все еще занят, ждем освобождения..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Запускаем Edge Gateway
Write-Host "🚀 Запускаем Edge Gateway..." -ForegroundColor Green
Set-Location "src"
Start-Process -FilePath "npx" -ArgumentList "ts-node", "main.ts" -WindowStyle Hidden

# Ждем запуска
Write-Host "⏳ Ждем запуска Edge Gateway (15 секунд)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Проверяем статус
$portActive = netstat -an | findstr ":3555"
if ($portActive) {
    Write-Host "✅ Edge Gateway запущен на порту 3555" -ForegroundColor Green
    Write-Host "🌐 Дашборд: http://localhost:3555/dashboard-new.html" -ForegroundColor Cyan
} else {
    Write-Host "❌ Edge Gateway не запустился" -ForegroundColor Red
}

Write-Host "✅ Перезапуск Edge Gateway завершен!" -ForegroundColor Green 