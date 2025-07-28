@echo off
chcp 65001 >nul
echo.
echo 🚀 Запуск FANUC адаптеров...
echo.

echo 🔄 Остановка старых процессов...
taskkill /f /im fanuc_0id.exe >nul 2>&1
taskkill /f /im fanuc_18i.exe >nul 2>&1
taskkill /f /im fanuc.exe >nul 2>&1

echo ⏳ Ожидание 3 секунды...
timeout /t 3 /nobreak >nul

echo.
echo 🔧 Запуск адаптеров с параметром 'run'...

REM M_1_XD-20
if exist "Fanuc\M_1_XD-20\Adapter\fanuc_0id.exe" (
    echo   ✅ M_1_XD-20
    start "FANUC-M_1_XD-20" /min cmd /k "cd /d Fanuc\M_1_XD-20\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_1_XD-20: fanuc_0id.exe не найден
)

REM M_2_SR_26  
if exist "Fanuc\M_2_SR_26\Adapter\fanuc_0id.exe" (
    echo   ✅ M_2_SR_26
    start "FANUC-M_2_SR_26" /min cmd /k "cd /d Fanuc\M_2_SR_26\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_2_SR_26: fanuc_0id.exe не найден
)

REM M_3_XD_38
if exist "Fanuc\M_3_XD_38\Adapter\fanuc_0id.exe" (
    echo   ✅ M_3_XD_38
    start "FANUC-M_3_XD_38" /min cmd /k "cd /d Fanuc\M_3_XD_38\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_3_XD_38: fanuc_0id.exe не найден
)

REM M_4_SR_10
if exist "Fanuc\M_4_SR_10\Adapter\fanuc_0id.exe" (
    echo   ✅ M_4_SR_10
    start "FANUC-M_4_SR_10" /min cmd /k "cd /d Fanuc\M_4_SR_10\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_4_SR_10: fanuc_0id.exe не найден
)

REM M_5_DT_26
if exist "Fanuc\M_5_DT_26\Adapter\fanuc_0id.exe" (
    echo   ✅ M_5_DT_26
    start "FANUC-M_5_DT_26" /min cmd /k "cd /d Fanuc\M_5_DT_26\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_5_DT_26: fanuc_0id.exe не найден
)

REM M_6_SR_21
if exist "Fanuc\M_6_SR_21\Adapter\fanuc_0id.exe" (
    echo   ✅ M_6_SR_21  
    start "FANUC-M_6_SR_21" /min cmd /k "cd /d Fanuc\M_6_SR_21\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_6_SR_21: fanuc_0id.exe не найден
)

REM M_7_SR_23 - пробуем разные варианты
if exist "Fanuc\M_7_SR_23\Adapter\fanuc_18i.exe" (
    echo   ✅ M_7_SR_23 ^(fanuc_18i.exe^)
    start "FANUC-M_7_SR_23" /min cmd /k "cd /d Fanuc\M_7_SR_23\Adapter & fanuc_18i.exe run"
    timeout /t 1 /nobreak >nul
) else if exist "Fanuc\M_7_SR_23\Adapter\fanuc_0id.exe" (
    echo   ✅ M_7_SR_23 ^(fanuc_0id.exe^)
    start "FANUC-M_7_SR_23" /min cmd /k "cd /d Fanuc\M_7_SR_23\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else if exist "Fanuc\M_7_SR_23\Adapter\fanuc.exe" (
    echo   ✅ M_7_SR_23 ^(fanuc.exe^)
    start "FANUC-M_7_SR_23" /min cmd /k "cd /d Fanuc\M_7_SR_23\Adapter & fanuc.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_7_SR_23: исполняемый файл не найден
)

REM M_8_SR_25 - пробуем разные варианты
if exist "Fanuc\M_8_SR_25\Adapter\fanuc_18i.exe" (
    echo   ✅ M_8_SR_25 ^(fanuc_18i.exe^)
    start "FANUC-M_8_SR_25" /min cmd /k "cd /d Fanuc\M_8_SR_25\Adapter & fanuc_18i.exe run"
    timeout /t 1 /nobreak >nul
) else if exist "Fanuc\M_8_SR_25\Adapter\fanuc_0id.exe" (
    echo   ✅ M_8_SR_25 ^(fanuc_0id.exe^)
    start "FANUC-M_8_SR_25" /min cmd /k "cd /d Fanuc\M_8_SR_25\Adapter & fanuc_0id.exe run"
    timeout /t 1 /nobreak >nul
) else if exist "Fanuc\M_8_SR_25\Adapter\fanuc.exe" (
    echo   ✅ M_8_SR_25 ^(fanuc.exe^)
    start "FANUC-M_8_SR_25" /min cmd /k "cd /d Fanuc\M_8_SR_25\Adapter & fanuc.exe run"
    timeout /t 1 /nobreak >nul
) else (
    echo   ❌ M_8_SR_25: исполняемый файл не найден
)

echo.
echo ⏳ Ожидание 15 секунд для инициализации...
timeout /t 15 /nobreak >nul

echo.
echo 🔍 Проверка портов...
netstat -an | findstr :7701 >nul && echo   ✅ Порт 7701: OK || echo   ❌ Порт 7701: не отвечает
netstat -an | findstr :7702 >nul && echo   ✅ Порт 7702: OK || echo   ❌ Порт 7702: не отвечает  
netstat -an | findstr :7703 >nul && echo   ✅ Порт 7703: OK || echo   ❌ Порт 7703: не отвечает
netstat -an | findstr :7704 >nul && echo   ✅ Порт 7704: OK || echo   ❌ Порт 7704: не отвечает
netstat -an | findstr :7705 >nul && echo   ✅ Порт 7705: OK || echo   ❌ Порт 7705: не отвечает
netstat -an | findstr :7706 >nul && echo   ✅ Порт 7706: OK || echo   ❌ Порт 7706: не отвечает
netstat -an | findstr :7707 >nul && echo   ✅ Порт 7707: OK || echo   ❌ Порт 7707: не отвечает
netstat -an | findstr :7708 >nul && echo   ✅ Порт 7708: OK || echo   ❌ Порт 7708: не отвечает

echo.
echo ✅ Запуск завершен!
echo.
echo 💡 For testing run:
echo    node test-fanuc-http.js
echo.
pause 