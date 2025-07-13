# 🚀 Локальная разработка MTConnect

## 📋 Архитектура

У нас есть **два сервера**, которые работают с **одними и теми же данными**:

### 📡 Edge Gateway (порт 5000)
- **Файл:** `src/main.ts`
- **Функции:** Сбор данных с машин, отправка в Railway
- **URL:** http://localhost:5000

### ☁️ Cloud API (порт 3000)  
- **Файл:** `apps/cloud-api`
- **Функции:** Продвинутые дашборды, анализ, MongoDB
- **URL:** http://localhost:3000

## 🔧 Быстрый старт

### Вариант 1: Автоматический запуск (рекомендуется)
```powershell
.\start-local-dev.ps1
```

### Вариант 2: Ручной запуск
```powershell
# Терминал 1: Edge Gateway
npm run build
npm run start:edge

# Терминал 2: Cloud API
npm run start:cloud
```

### Вариант 3: Отдельные команды
```powershell
# Только Edge Gateway (сбор данных)
npm run start:edge

# Только Cloud API (дашборды)
npm run start:cloud
```

## 🌐 Доступные интерфейсы

### Edge Gateway (http://localhost:5000)
- `/` - главная страница с ссылками
- `/current` - MTConnect XML данные в реальном времени
- `/probe` - информация о машинах
- `/health` - статус системы
- `/railway-status` - подключение к Railway
- `/api/machines` - список машин (JSON)
- `/api/adam/counters` - данные Adam-6050

### Cloud API (http://localhost:3000)
- `/` - главный дашборд (dashboard-new.html)
- `/api/dashboard/health` - статус дашборда
- `/api/dashboard/machines` - список машин с аналитикой
- `/api/dashboard/data/:machineId` - данные конкретной машины
- `/api/dashboard/status` - общий статус системы

## 📊 Источники данных

**ВНИМАНИЕ:** Оба сервера используют одни и те же данные!

- **8 MTConnect машин:** XD-20, SR-26, XD-38, SR-10, DT-26, SR-21, SR-23, SR-25
- **Adam-6050 счетчики:** 10 каналов с вычислением времени цикла
- **Railway Cloud:** автоматическая отправка данных в продакшн

## 🔄 Поток данных

```
Машины → Edge Gateway → Railway Cloud ← Cloud API
                ↓
           Локальные API
```

## 🛠️ Разработка

### Изменение Edge Gateway
1. Редактируй `src/main.ts`
2. `npm run build`
3. Перезапусти Edge Gateway

### Изменение Cloud API  
1. Редактируй файлы в `apps/cloud-api/src/`
2. Hot reload работает автоматически (NestJS watch mode)

### Изменение дашбордов
1. Редактируй `apps/cloud-api/public/dashboard-new.html`
2. Обнови страницу в браузере

## 🚀 Деплой

Изменения автоматически деплоятся на Railway при push в main:

```powershell
git add -A
git commit -m "описание изменений"
git push origin main
```

**Railway URL:** https://mtconnect-core-production.up.railway.app

## 🐛 Отладка

### Проверка данных
```powershell
# Локальные данные MTConnect
curl http://localhost:5000/current

# Статус системы
curl http://localhost:5000/health

# Данные Adam
curl http://localhost:5000/api/adam/counters

# Cloud API статус
curl http://localhost:3000/api/dashboard/health
```

### Логи
- **Edge Gateway:** Логи в терминале где запущен
- **Cloud API:** NestJS логи + Winston (файлы в logs/)

### Типичные проблемы
1. **Порт занят:** Убей процессы `taskkill /f /im node.exe`
2. **Нет данных:** Проверь MTConnect агенты в PIM/
3. **Railway не работает:** Проверь `/railway-status`

## 📱 Полезные команды

```powershell
# Сборка всех пакетов
npm run build

# Только Edge Gateway  
npm run start:edge

# Только Cloud API
npm run start:cloud

# Остановка всех процессов Node.js
taskkill /f /im node.exe

# Проверка запущенных процессов
Get-Process | Where-Object {$_.ProcessName -eq "node"}
``` 