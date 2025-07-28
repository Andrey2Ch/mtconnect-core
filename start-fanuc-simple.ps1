#!/usr/bin/env pwsh

# 🚀 ПРОСТОЙ СКРИПТ ЗАПУСКА FANUC АДАПТЕРОВ  
# PowerShell совместимая версия

Write-Host "🚀 Запуск FANUC адаптеров..." -ForegroundColor Green
Write-Host ""

# Остановка старых процессов
Write-Host "🔄 Остановка старых процессов..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*fanuc*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Освобождение портов
$ports = @(7701,7702,7703,7704,7705,7706,7707,7708)
foreach($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conns) {
        foreach($conn in $conns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep 2

# Конфигурация машин
$machines = @(
    @{ Name = "M_1_XD-20"; Exe = "fanuc_0id.exe" },
    @{ Name = "M_2_SR_26"; Exe = "fanuc_0id.exe" },
    @{ Name = "M_3_XD_38"; Exe = "fanuc_0id.exe" },
    @{ Name = "M_4_SR_10"; Exe = "fanuc_0id.exe" },
    @{ Name = "M_5_DT_26"; Exe = "fanuc_0id.exe" },
    @{ Name = "M_6_SR_21"; Exe = "fanuc_0id.exe" },
    @{ Name = "M_7_SR_23"; Exe = "fanuc_18i.exe" },
    @{ Name = "M_8_SR_25"; Exe = "fanuc_18i.exe" }
)

Write-Host "🔧 Запуск адаптеров..." -ForegroundColor Yellow

$started = 0
foreach($machine in $machines) {
    $path = "Fanuc\$($machine.Name)\Adapter"
    $exe = "$path\$($machine.Exe)"
    
    if(Test-Path $exe) {
        Write-Host "  ✅ $($machine.Name)" -ForegroundColor Green
        
        # Запуск в новом окне CMD с переходом в папку и запуском с параметром run
        Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$path`" & $($machine.Exe) run" -WindowStyle Minimized
        
        $started++
        Start-Sleep 1
    } else {
        Write-Host "  ❌ Не найден: $exe" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Запущено: $started из $($machines.Count)" -ForegroundColor Green

# Ожидание инициализации
Write-Host ""
Write-Host "⏳ Ожидание 15 секунд..." -ForegroundColor Cyan
for($i = 15; $i -gt 0; $i--) {
    Write-Host "   $i" -NoNewline
    Start-Sleep 1
    if($i -gt 1) { Write-Host "..." -NoNewline }
}
Write-Host ""

# Проверка портов
Write-Host ""
Write-Host "🔍 Проверка портов..." -ForegroundColor Yellow
for($i = 0; $i -lt $machines.Count; $i++) {
    $port = 7701 + $i
    $machine = $machines[$i]
    
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($conn) {
        Write-Host "  ✅ Порт $port ($($machine.Name)): OK" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Порт $port ($($machine.Name)): не отвечает" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Готово! Теперь можно тестировать:" -ForegroundColor Green
Write-Host "   node test-fanuc-http.js" -ForegroundColor White
Write-Host ""

Read-Host "Нажмите Enter" 