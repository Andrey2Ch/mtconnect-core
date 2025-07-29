@echo off
chcp 65001 >nul 2>&1
cls

echo 🚀 Создание EXE файла MTConnect System Launcher
echo ================================================

echo.
echo 📦 Проверяем наличие PS2EXE модуля...
powershell -Command "if (!(Get-Module -ListAvailable -Name ps2exe)) { Write-Host '⚠️  PS2EXE не найден. Устанавливаем...' -ForegroundColor Yellow; Install-Module -Name ps2exe -Force -Scope CurrentUser } else { Write-Host '✅ PS2EXE уже установлен' -ForegroundColor Green }"

echo.
echo 🔨 Создаем EXE файл...
powershell -Command "Invoke-ps2exe -inputFile 'MTConnect-System-Launcher.ps1' -outputFile 'MTConnect-System-Launcher.exe' -title 'MTConnect System Launcher' -description 'MTConnect Data Collection System for Railway Cloud' -company 'MTConnect Systems' -version '1.0.0.0' -noConsole $false"

if exist "MTConnect-System-Launcher.exe" (
    echo.
    echo ✅ EXE файл создан успешно!
    echo 📁 Файл: MTConnect-System-Launcher.exe
    echo 📊 Размер: 
    for %%I in ("MTConnect-System-Launcher.exe") do echo    %%~zI байт
    echo.
    echo 🎯 Готово к использованию!
    echo    - Скопируйте EXE в любую папку с проектом MTConnect
    echo    - Запустите для автоматического старта системы
    echo    - Данные будут отправляться в Railway облако
    echo.
    echo 💡 Хотите протестировать EXE файл? (y/n^)
    set /p test_choice=
    if /i "%test_choice%"=="y" (
        echo.
        echo 🚀 Запускаем тестирование...
        MTConnect-System-Launcher.exe
    )
) else (
    echo.
    echo ❌ Ошибка создания EXE файла!
    echo    Проверьте что MTConnect-System-Launcher.ps1 существует
)

echo.
pause 