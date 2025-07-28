@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cls

echo 🚀 ПОЛНЫЙ ПЕРЕЗАПУСК СИСТЕМЫ MTConnect
echo ============================================================

echo.
echo ⏹️  ОСТАНАВЛИВАЕМ СУЩЕСТВУЮЩИЕ ПРОЦЕССЫ...
echo    🔪 Останавливаем FANUC адаптеры...
taskkill /f /im fanuc_0id.exe >nul 2>&1
taskkill /f /im fanuc_18i.exe >nul 2>&1
taskkill /f /im fanuc.exe >nul 2>&1

echo    🔪 Останавливаем Edge Gateway API...
taskkill /f /im node.exe >nul 2>&1

echo    🔪 Освобождаем порты...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1  
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3555 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo    ✅ Очистка процессов завершена
timeout /t 3 >nul

echo.
echo 🔧 ЗАПУСКАЕМ FANUC АДАПТЕРЫ В СКРЫТОМ РЕЖИМЕ...
call start-fanuc-adapters-hidden.bat

echo.
echo    ⏱️  Ждем инициализации адаптеров (10 секунд)...
timeout /t 10 >nul

echo.
echo 🚀 ЗАПУСКАЕМ EDGE GATEWAY API...
echo    📡 API будет доступен на порту 3555  
echo    🔄 Запускаем в независимом процессе...
start /min "MTConnect API" cmd /c "npx ts-node src/main.ts"

echo    ⏱️  Ждем инициализации API (15 секунд)...
timeout /t 15 >nul

echo.
echo 🔍 ПРОВЕРКА СИСТЕМЫ...
echo    📊 Проверка FANUC адаптеров:

REM Проверяем порты адаптеров  
set /a active_adapters=0
for %%p in (7701 7702 7703 7704 7705 7706 7707 7708) do (
    netstat -an | findstr ":%%p " | findstr "LISTENING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo       ✅ Порт %%p: Активен
        set /a active_adapters+=1
    ) else (
        echo       ❌ Порт %%p: Не отвечает
    )
)

echo    📊 Проверка Edge Gateway API:
timeout /t 2 >nul
curl -s "http://localhost:3555/api/machines" >nul 2>&1
if %errorlevel% equ 0 (
    echo       ✅ API: Активен
    set api_status=OK
) else (
    echo       ❌ API: Не отвечает
    set api_status=ERROR
)

echo.
echo ============================================================
echo 📊 ИТОГОВЫЙ ОТЧЕТ ЗАПУСКА:
echo    🔧 FANUC Адаптеры: %active_adapters%/8 активны
echo    📡 Edge Gateway API: http://localhost:3555/api/machines
echo    🌐 Дашборд: http://localhost:3555/dashboard-new.html

if "%active_adapters%"=="8" (
    if "%api_status%"=="OK" (
        echo.
        echo ✅ ВСЯ СИСТЕМА ЗАПУЩЕНА УСПЕШНО!
        echo 🌐 Открываем дашборд в браузере...
        start "" "http://localhost:3555/dashboard-new.html"
    ) else (
        echo.
        echo ⚠️  СИСТЕМА ЗАПУЩЕНА С ПРЕДУПРЕЖДЕНИЯМИ
        echo    API не отвечает. Проверьте логи Edge Gateway.
    )
) else (
    echo.
    echo ⚠️  СИСТЕМА ЗАПУЩЕНА С ПРЕДУПРЕЖДЕНИЯМИ  
    echo    Не все адаптеры отвечают. Проверьте подключения станков.
)

echo.
echo ============================================================
echo 🎯 СИСТЕМА ГОТОВА К РАБОТЕ!
echo.
echo 💡 Полезные команды:
echo    - Проверить данные: node test-shdr-direct.js
echo    - Проверить процессы: tasklist /fi "imagename eq fanuc*" /fi "imagename eq node.exe"
echo    - Открыть дашборд: start http://localhost:3555/dashboard-new.html
echo    - Остановить систему: stop-mtconnect-system.bat
echo.
echo ⚠️  ВНИМАНИЕ: Можно безопасно закрыть это окно!
echo    Все процессы работают независимо в фоне.
echo.

pause 