@echo off
chcp 65001 >nul 2>&1
cls

echo 🛑 ОСТАНОВКА СИСТЕМЫ MTConnect
echo ============================================================

echo.
echo 🔪 Останавливаем все процессы...

echo    ⏹️  FANUC адаптеры...
taskkill /f /im fanuc_0id.exe >nul 2>&1
taskkill /f /im fanuc_18i.exe >nul 2>&1
taskkill /f /im fanuc.exe >nul 2>&1

echo    ⏹️  Edge Gateway API...
taskkill /f /im node.exe >nul 2>&1

echo    ⏹️  Освобождение портов...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1  
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3555 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

timeout /t 2 >nul

echo.
echo 🔍 Проверка остановки:
set /a stopped_processes=0

tasklist /fi "imagename eq fanuc_0id.exe" 2>nul | findstr /c:"fanuc_0id.exe" >nul 2>&1
if errorlevel 1 (
    echo    ✅ fanuc_0id.exe: Остановлен
    set /a stopped_processes+=1
) else (
    echo    ❌ fanuc_0id.exe: Все еще работает
)

tasklist /fi "imagename eq fanuc_18i.exe" 2>nul | findstr /c:"fanuc_18i.exe" >nul 2>&1
if errorlevel 1 (
    echo    ✅ fanuc_18i.exe: Остановлен
    set /a stopped_processes+=1  
) else (
    echo    ❌ fanuc_18i.exe: Все еще работает
)

netstat -an | findstr ":3555 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo    ✅ Порт 3555: Освобожден
) else (
    echo    ❌ Порт 3555: Все еще занят
)

echo.
echo ============================================================
echo ✅ СИСТЕМА MTConnect ОСТАНОВЛЕНА!
echo.
echo 💡 Для запуска используйте: restart-mtconnect-system.bat
echo.

pause 