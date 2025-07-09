# Локальная разработка MTConnect Cloud Dashboard

## 🚀 Быстрый старт

### 1. Подготовка MongoDB

Если у тебя уже запущена MongoDB в Docker:
```bash
# Проверить что MongoDB работает
docker ps | grep mongo
```

Если нет, запусти MongoDB в Docker:
```bash
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### 2. Запуск API локально

```bash
# Перейти в директорию облачного API
cd cloud-api/mtconnect-cloud

# Установить зависимости (если еще не установлены)
npm install

# Запустить в режиме локальной разработки
npm run start:local
```

API будет доступно на: **http://localhost:3001**

### 3. Проверка работы

Открой в браузере:
- **Дашборд**: http://localhost:3001/
- **API Health**: http://localhost:3001/api/dashboard/health
- **System Status**: http://localhost:3001/status

---

## ⚙️ Конфигурация

### Переменные окружения (.env.local)
```env
NODE_ENV=development
PORT=3001                    # Другой порт, чтобы не конфликтовать с Edge Gateway (5000)
MONGODB_URI=mongodb://localhost:27017/mtconnect-local
FORCE_HTTPS=false
FRONTEND_URL=http://localhost:3001
DEBUG=true
LOG_LEVEL=debug
```

### Порты
- **Edge Gateway**: 5000 (как было)
- **Cloud API (локально)**: 3001
- **MongoDB**: 27017
- **Cloud API (Railway)**: 443/80

---

## 🔄 Workflow разработки

### 1. Разработка новых функций
```bash
# Убедись что на ветке local_dev
git checkout local_dev

# ТЕРМИНАЛ 1: Запусти Cloud API локально
cd cloud-api/mtconnect-cloud
npm run start:local

# ТЕРМИНАЛ 2: Запусти Edge Gateway с локальной конфигурацией (если нужны данные)
cd ../../
npm run start:local    # Отправляет данные в localhost:3001 вместо Railway
```

### Альтернативный вариант с продакшн данными:
```bash
# Если хочешь использовать данные из Railway (без локального Edge Gateway)
# Просто запусти только Cloud API - он получит данные из Railway MongoDB
cd cloud-api/mtconnect-cloud
npm run start:local
```

### 2. Тестирование изменений
- Открой http://localhost:3001/ - дашборд
- Проверь что данные от станков поступают
- Тестируй новые API endpoints

### 3. Деплой в production
```bash
# Коммит изменений в local_dev
git add .
git commit -m "feat: описание изменений"

# Переключиться на main и слить изменения
git checkout main
git merge local_dev

# Отправить в Railway
git push
```

---

## 🛠️ Полезные команды

### Работа с данными
```bash
# Очистить локальную БД
docker exec mongodb mongosh --eval "use mtconnect-local; db.dropDatabase()"

# Посмотреть данные в БД
docker exec mongodb mongosh --eval "use mtconnect-local; db.machinedatas.find().limit(5)"

# Подключиться к MongoDB
docker exec -it mongodb mongosh
```

### Логи и отладка
```bash
# Логи API
tail -f cloud-api/mtconnect-cloud/logs/application.log

# Перезапуск с полными логами
DEBUG=* npm run start:local
```

### Проблемы и решения

**Ошибка "port 3001 in use":**
```bash
# Найти процесс на порту 3001
netstat -ano | findstr :3001
# Убить процесс
taskkill /PID <PID> /F
```

**Ошибка подключения к MongoDB:**
```bash
# Проверить что контейнер запущен
docker ps | grep mongo
# Перезапустить MongoDB
docker restart mongodb
```

**Дашборд не показывает данные:**
1. Проверь что Edge Gateway запущен и отправляет данные в Railway
2. Проверь что в локальной БД есть данные: http://localhost:3001/api/dashboard/machines
3. Данные берутся из Railway API, а не локально

---

## 📁 Структура проекта

```
C:\Projects\MTConnect\
├── src/                    # Edge Gateway (localhost:5000)
├── cloud-api/
│   └── mtconnect-cloud/    # Cloud API (localhost:3001 или Railway)
│       ├── src/
│       │   └── controllers/
│       │       └── dashboard.controller.ts
│       ├── public/
│       │   └── dashboard-pro.html
│       ├── .env.local      # Локальная конфигурация
│       └── package.json
└── LOCAL_DEVELOPMENT.md    # Этот файл
```

---

## 🎯 Следующие шаги

1. **Тестируй локально** - проверь что все работает
2. **Добавляй новые функции** - метрики, анализ, уведомления
3. **Деплой в production** - через git push в main

**Happy coding! 🚀** 