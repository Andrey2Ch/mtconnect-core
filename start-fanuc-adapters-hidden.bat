@echo off
echo 🚀 СКРЫТЫЙ ЗАПУСК FANUC АДАПТЕРОВ...
echo ⏹️  Останавливаем существующие процессы...

REM Убиваем существующие адаптеры
taskkill /f /im fanuc_0id.exe >nul 2>&1
taskkill /f /im fanuc_18i.exe >nul 2>&1
taskkill /f /im fanuc.exe >nul 2>&1

echo 🧹 Очистка завершена
echo.

REM Ждем завершения процессов
timeout /t 2 >nul

echo 🔧 ЗАПУСКАЕМ АДАПТЕРЫ В СКРЫТОМ РЕЖИМЕ:

REM M_1_XD-20 (порт 7701)
cd /d "%~dp0Fanuc\M_1_XD-20\Adapter"
if exist fanuc_0id.exe (
    echo ✅ XD-20: Запускаем адаптер на порту 7701
    start /b fanuc_0id.exe run >nul 2>&1
) else (
    echo ❌ XD-20: fanuc_0id.exe не найден
)
cd /d "%~dp0"

REM M_2_SR_26 (порт 7702)  
cd /d "%~dp0Fanuc\M_2_SR_26\Adapter"
if exist fanuc_0id.exe (
    echo ✅ SR-26: Запускаем адаптер на порту 7702
    start /b fanuc_0id.exe run >nul 2>&1
) else (
    echo ❌ SR-26: fanuc_0id.exe не найден
)
cd /d "%~dp0"

REM M_3_XD_38 (порт 7703)
cd /d "%~dp0Fanuc\M_3_XD_38\Adapter" 
if exist fanuc_0id.exe (
    echo ✅ XD-38: Запускаем адаптер на порту 7703
    start /b fanuc_0id.exe run >nul 2>&1
) else (
    echo ❌ XD-38: fanuc_0id.exe не найден
)
cd /d "%~dp0"

REM M_4_SR_10 (порт 7704)
cd /d "%~dp0Fanuc\M_4_SR_10\Adapter"
if exist fanuc_0id.exe (
    echo ✅ SR-10: Запускаем адаптер на порту 7704
    start /b fanuc_0id.exe run >nul 2>&1
) else (
    echo ❌ SR-10: fanuc_0id.exe не найден
)
cd /d "%~dp0"

REM M_5_DT_26 (порт 7705)
cd /d "%~dp0Fanuc\M_5_DT_26\Adapter"
if exist fanuc_0id.exe (
    echo ✅ DT-26: Запускаем адаптер на порту 7705
    start /b fanuc_0id.exe run >nul 2>&1
) else (
    echo ❌ DT-26: fanuc_0id.exe не найден
)
cd /d "%~dp0"

REM M_6_SR_21 (порт 7706)
cd /d "%~dp0Fanuc\M_6_SR_21\Adapter"
if exist fanuc_0id.exe (
    echo ✅ SR-21: Запускаем адаптер на порту 7706
    start /b fanuc_0id.exe run >nul 2>&1
) else (
    echo ❌ SR-21: fanuc_0id.exe не найден
)
cd /d "%~dp0"

REM M_7_SR_23 (порт 7707) - ТОЛЬКО fanuc_18i
cd /d "%~dp0Fanuc\M_7_SR_23\Adapter"
if exist fanuc_18i.exe (
    echo ✅ SR-23: Запускаем адаптер на порту 7707
    start /b fanuc_18i.exe run >nul 2>&1
)
cd /d "%~dp0"

REM M_8_SR_25 (порт 7708) - ТОЛЬКО fanuc_18i
cd /d "%~dp0Fanuc\M_8_SR_25\Adapter"
if exist fanuc_18i.exe (
    echo ✅ SR-25: Запускаем адаптер на порту 7708
    start /b fanuc_18i.exe run >nul 2>&1
)
cd /d "%~dp0"

echo.
echo ⏱️  Ждем инициализации адаптеров...
timeout /t 5 >nul

echo.
echo 🔍 ПРОВЕРКА ПОРТОВ:
netstat -an | findstr "770" | findstr "LISTENING"

echo.
echo ✅ ВСЕ АДАПТЕРЫ ЗАПУЩЕНЫ В СКРЫТОМ РЕЖИМЕ!
echo 📊 Адаптеры работают в фоне без окон
echo. 