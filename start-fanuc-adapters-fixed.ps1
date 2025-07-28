#!/usr/bin/env pwsh

# 🚀 ИСПРАВЛЕННЫЙ СКРИПТ ЗАПУСКА FANUC АДАПТЕРОВ
# Основан на рабочем проекте Fanuk_Test

Write-Host "🚀 Запуск FANUC адаптеров (исправленная версия)..." -ForegroundColor Green
Write-Host ""

# Освобождаем порты адаптеров
Write-Host "🔍 Освобождение портов адаптеров..." -ForegroundColor Yellow
$adapterPorts = 7701,7702,7703,7704,7705,7706,7707,7708
foreach($port in $adapterPorts) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conns) {
        Write-Host "❌ Освобождаю порт $port" -ForegroundColor Red
        foreach($conn in $conns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# Убиваем старые процессы адаптеров
Write-Host "🔄 Остановка старых адаптеров..." -ForegroundColor Yellow
$fanucProcesses = Get-Process | Where-Object { $_.ProcessName -like "*fanuc*" -or $_.ProcessName -like "*0id*" -or $_.ProcessName -like "*18i*" }
foreach($proc in $fanucProcesses) {
    Write-Host "  ❌ Останавливаю $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Red
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep 2

# Запуск FANUC адаптеров из правильной папки
Write-Host ""
Write-Host "🔧 Запуск FANUC адаптеров с параметром 'run'..." -ForegroundColor Yellow

# Используем папку Fanuc (не "From Anat/Fanuc")
$fanucPath = "Fanuc"
if(!(Test-Path $fanucPath)) {
    Write-Host "❌ Папка '$fanucPath' не найдена. Проверьте структуру проекта." -ForegroundColor Red
    exit 1
}

# Определяем машины и их исполняемые файлы (как в рабочем проекте)
$machines = @(
    @{ Name = "M_1_XD-20"; Port = 7701; Exe = "fanuc_0id.exe" },
    @{ Name = "M_2_SR_26"; Port = 7702; Exe = "fanuc_0id.exe" },
    @{ Name = "M_3_XD_38"; Port = 7703; Exe = "fanuc_0id.exe" },
    @{ Name = "M_4_SR_10"; Port = 7704; Exe = "fanuc_0id.exe" },
    @{ Name = "M_5_DT_26"; Port = 7705; Exe = "fanuc_0id.exe" },
    @{ Name = "M_6_SR_21"; Port = 7706; Exe = "fanuc_0id.exe" },
    @{ Name = "M_7_SR_23"; Port = 7707; Exe = "fanuc_18i.exe" },
    @{ Name = "M_8_SR_25"; Port = 7708; Exe = "fanuc_18i.exe" }
)

$startedCount = 0

foreach($machine in $machines) {
    $adapterPath = Join-Path $fanucPath "$($machine.Name)/Adapter"
    $exePath = Join-Path $adapterPath $machine.Exe
    
    if(Test-Path $exePath) {
        Write-Host "  ✅ Запуск $($machine.Name) на порту $($machine.Port)" -ForegroundColor Green
        
        # ✅ ИСПРАВЛЕНО: используем PowerShell синтаксис с точкой с запятой
        $title = "FANUC-Adapter-$($machine.Name)"
        $cmd = "title $title; cd /d `"$adapterPath`"; $($machine.Exe) run"
        
        Start-Process cmd -ArgumentList "/k", $cmd -WindowStyle Minimized
        $startedCount++
        Start-Sleep 1
    } else {
        Write-Host "  ❌ Не найден: $exePath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Запущено адаптеров: $startedCount из $($machines.Count)" -ForegroundColor $(if($startedCount -eq $machines.Count) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "⏳ Ожидание 15 секунд для инициализации адаптеров..." -ForegroundColor Cyan
Start-Sleep 15

# Проверка портов
Write-Host ""
Write-Host "🔍 Проверка портов адаптеров..." -ForegroundColor Yellow
foreach($machine in $machines) {
    $port = $machine.Port
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conn) {
        Write-Host "  ✅ Порт $port ($($machine.Name)): активен" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Порт $port ($($machine.Name)): не отвечает" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Запуск адаптеров завершен!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Для тестирования подключений запустите:" -ForegroundColor Cyan  
Write-Host "   cd apps/cloud-api; npm run start:dev" -ForegroundColor White
Write-Host "   Затем откройте: http://localhost:3000/api/fanuc/test" -ForegroundColor White
Write-Host ""

Read-Host "Нажмите Enter для выхода" 