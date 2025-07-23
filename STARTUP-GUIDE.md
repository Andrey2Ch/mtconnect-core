# 🚀 Инструкция по запуску MTConnect системы

**Модернизированная система:** Прямые SHDR подключения + ADAM-6050 (БЕЗ MTConnect агентов)

## 📋 Предварительные проверки

### 1. 🔍 Проверка занятых портов

```powershell
# Проверить какие процессы используют порты системы
netstat -ano | findstr ":3000\|:7701\|:7702\|:7703\|:7704\|:7705\|:7706\|:7707\|:7708"
```

### 2. 🛑 Остановка конфликтующих процессов

```powershell
# Остановить все Node.js процессы (если запущены)
taskkill /F /IM node.exe

# Остановить любые старые MTConnect агенты (если запущены)
Get-Process | Where-Object {$_.ProcessName -like "*agent*" -or $_.ProcessName -like "*mtconnect*"} | Stop-Process -Force
```

## 🎯 Запуск системы

### Шаг 1: Запуск FANUC адаптеров

```powershell
# Перейти в корень проекта
cd C:\Projects\MTConnect

# Запустить все FANUC адаптеры (порты 7701-7708)
.\start-focas-adapters.ps1
```

**Результат:** Должны запуститься 8 адаптеров на портах 7701-7708

### Шаг 2: Запуск основной системы

```powershell
# Установить переменную порта
$env:PORT='3000'

# Запуск через ts-node (для разработки)
npx ts-node src/main.ts

# ИЛИ сборка и запуск (для продакшена)
npm run build
npm start
```

### Шаг 3: Проверка работоспособности

```powershell
# Проверить что система запущена
netstat -ano | findstr ":3000.*LISTENING"

# Проверить API
curl "http://localhost:3000/health" -UseBasicParsing

# Проверить данные машин
curl "http://localhost:3000/api/machines" -UseBasicParsing
```

## 🌐 Доступные адреса

- **🏠 Главная страница:** http://localhost:3000
- **📊 Дашборд:** http://localhost:3000/dashboard-new.html  
- **💚 Health Check:** http://localhost:3000/health
- **📡 API машин:** http://localhost:3000/api/machines
- **🔢 ADAM счетчики:** http://localhost:3000/api/adam/counters

## 🔧 Диагностика проблем

### Проблема: Порт 3000 занят
```powershell
# Найти процесс на порту 3000
netstat -ano | findstr ":3000"

# Остановить процесс (замените PID на фактический)
taskkill /F /PID <PID>
```

### Проблема: FANUC подключения не работают
```powershell
# Проверить работают ли адаптеры
netstat -ano | findstr ":770[1-8].*LISTENING"

# Перезапустить адаптеры
.\start-focas-adapters.ps1
```

### Проблема: ADAM-6050 не отвечает
```powershell
# Проверить сетевое подключение к ADAM
ping 192.168.1.120

# Проверить порт Modbus
telnet 192.168.1.120 502
```

## 📊 Архитектура системы

```
🏭 FANUC CNC (8 машин) 
   ↓ FOCAS
📡 FANUC Adapters (7701-7708) 
   ↓ SHDR (отфильтрованные данные)
🔥 Edge Gateway (порт 3000)
   ↓ REST API
📊 Dashboard & Cloud API
```

**🎯 Ключевые изменения:**
- ❌ **Убрано:** MTConnect агенты (порты 5001-5008)
- ❌ **Убрано:** Данные осей и шпинделей  
- ✅ **Добавлено:** Прямые SHDR подключения
- ✅ **Добавлено:** Фильтрация данных (только program, partCount, execution)

## 🚨 Устранение неполадок

### Система не запускается
1. Проверить что все зависимости установлены: `npm install`
2. Проверить конфигурацию: файл должен быть `src/config.json`
3. Проверить что порты свободны
4. Запустить с подробными логами: `DEBUG=* npx ts-node src/main.ts`

### SHDR данные не поступают
1. Убедиться что FANUC адаптеры запущены
2. Проверить что станки включены (XD-38, SR-23, DT-26 могут быть выключены)
3. Логи должны показывать: `✅ SHDR подключен к <имя машины>`

### Дашборд показывает пустые данные
1. Проверить API: `curl "http://localhost:3000/api/machines"`
2. Убедиться что ADAM-6050 отвечает
3. Проверить логи на ошибки подключения

---
**💡 Совет:** Используйте `Ctrl+C` для остановки системы, а не `taskkill` 