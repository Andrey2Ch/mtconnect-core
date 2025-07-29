# 🚀 Создание EXE файла MTConnect System Launcher

## Метод 1: Используя PS2EXE (Рекомендуется)

### Установка PS2EXE:
```powershell
Install-Module -Name ps2exe -Force
```

### Создание EXE файла:
```powershell
# В корне проекта MTConnect
Invoke-ps2exe -inputFile "MTConnect-System-Launcher.ps1" -outputFile "MTConnect-System-Launcher.exe" -title "MTConnect System Launcher" -description "MTConnect Data Collection System" -company "MTConnect" -version "1.0.0.0" -iconFile "icon.ico" -requireAdmin -noConsole $false
```

### Простая версия без дополнительных параметров:
```powershell
Invoke-ps2exe "MTConnect-System-Launcher.ps1" "MTConnect-System-Launcher.exe"
```

## Метод 2: Самозапускающийся PowerShell

### Создать BAT файл-обертку:
```batch
@echo off
PowerShell.exe -ExecutionPolicy Bypass -File "%~dp0MTConnect-System-Launcher.ps1" %*
```

## 🎯 Использование EXE файла

### Системные требования:
- ✅ Windows 10/11
- ✅ PowerShell 5.1+ (встроен в Windows)
- ✅ Node.js 16+ (установить отдельно)
- ✅ Структура проекта MTConnect в той же папке

### Структура папки для EXE:
```
📁 MTConnect-Production/
├── 📄 MTConnect-System-Launcher.exe  ← Основной файл
├── 📁 Fanuc/                         ← Все FANUC адаптеры
│   ├── 📁 M_1_XD-20/Adapter/fanuc_0id.exe
│   ├── 📁 M_2_SR_26/Adapter/fanuc_0id.exe
│   └── ... (остальные машины)
├── 📁 src/
│   ├── 📄 main.ts                    ← Edge Gateway
│   ├── 📄 config.json               ← Конфигурация машин
│   └── ... (остальные файлы)
├── 📄 package.json                   ← Зависимости Node.js
└── 📄 pnpm-lock.yaml / package-lock.json
```

### Запуск на другом компьютере:
1. **Скопировать всю папку** с EXE и файлами проекта
2. **Установить Node.js** на целевом компьютере
3. **Запустить EXE** (права администратора НЕ нужны)

### Запуск нескольких экземпляров:
✅ **Можно запускать на разных компьютерах одновременно**
- Каждый компьютер будет иметь свой `EdgeGatewayId` (имя компьютера)
- Данные от всех компьютеров будут поступать в общее облако Railway
- Никаких конфликтов не будет

### Автоматические настройки:
- 🌐 **Cloud API URL**: `https://mtconnect-core-production.up.railway.app` (встроено)
- 🏭 **Edge Gateway ID**: `COMPUTER-NAME-edge-gateway` (автоматически)
- 🔧 **Остановка процессов**: автоматически перед запуском
- 📊 **Проверка системы**: встроенная диагностика

## 🎯 Преимущества EXE версии:
- ✅ Один файл для запуска всей системы
- ✅ Автоматическая проверка зависимостей  
- ✅ Красивый интерфейс с цветами
- ✅ Автоматическое открытие дашборда
- ✅ Работает на любом Windows компьютере
- ✅ Никакой кириллицы в выводе
- ✅ Полная совместимость с оригинальным `restart-mtconnect-system.bat` 