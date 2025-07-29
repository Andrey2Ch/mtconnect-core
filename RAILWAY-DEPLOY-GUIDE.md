# 🚀 Деплой MTConnect на Railway

## 📋 Архитектура

```
🏭 Локально (Edge Gateway)     ☁️ Railway (Cloud API)
├── src/main.ts (порт 3555)    ├── apps/cloud-api/ (порт авто)
├── Читает FANUC (SHDR)        ├── Принимает HTTP POST
├── Читает ADAM (Modbus)       ├── Сохраняет в MongoDB  
└── HTTP POST → Railway        └── Дашборд на /dashboard-new.html
```

## 🛠️ Шаг 1: Подготовка Cloud API для Railway

### 1.1 Переменные окружения в Railway Dashboard:

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mtconnect
PORT=$PORT
API_KEY=your-secure-api-key
LOG_LEVEL=info
```

### 1.2 Настройка Build & Deploy в Railway:

```toml
# railway.toml уже настроен
[build]
builder = "nixpacks"
buildCommand = "cd apps/cloud-api && pnpm install && pnpm run build"

[deploy]
startCommand = "cd apps/cloud-api && pnpm run start:prod"
```

### 1.3 Деплой на Railway:

```bash
# В корне проекта
railway login
railway link  # Выбираем существующий проект
railway up    # Деплоим Cloud API
```

## 🔧 Шаг 2: Настройка Edge Gateway (локальный)

### 2.1 Обновляем `.env` для продакшена:

```bash
# Получаем URL после деплоя на Railway
CLOUD_API_URL=https://mtconnect-cloud-production.up.railway.app
EDGE_GATEWAY_ID=edge-gateway-production

# Локальные настройки остаются
PORT=3555
ADAM_IP=192.168.1.120
ADAM_PORT=502
```

### 2.2 Запуск Edge Gateway:

```powershell
# Локально на производстве
npx ts-node src/main.ts
```

## 📊 Шаг 3: Проверка работы

### 3.1 Cloud API на Railway:
- ✅ Health: `https://your-app.railway.app/health`
- ✅ Dashboard: `https://your-app.railway.app/dashboard-new.html`

### 3.2 Edge Gateway (локально):
- ✅ API: `http://localhost:3555/api/machines`
- ✅ Dashboard: `http://localhost:3555/dashboard-new.html`

### 3.3 Поток данных:
```
Edge Gateway → POST /api/ext/data → Cloud API → MongoDB
```

## 🔄 Шаг 4: Быстрое переключение сред

### Локальная разработка:
```bash
# .env
CLOUD_API_URL=http://localhost:3001
EDGE_GATEWAY_ID=edge-gateway-local
```

### Продакшен:
```bash
# .env  
CLOUD_API_URL=https://your-app.railway.app
EDGE_GATEWAY_ID=edge-gateway-production
```

## 🚨 Troubleshooting

### Cloud API не отвечает:
```bash
railway logs  # Смотрим логи Railway
railway status  # Проверяем состояние
```

### Edge Gateway не может подключиться:
```bash
# Проверяем URL
curl -X POST https://your-app.railway.app/api/ext/data \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### MongoDB проблемы:
- Проверить строку подключения в Railway env
- Убедиться что IP address whitelisted в MongoDB Atlas

## ✅ Готово!

После настройки у вас будет:
- 🏭 **Локальный Edge Gateway** - собирает данные с машин
- ☁️ **Cloud API на Railway** - принимает, сохраняет, показывает дашборд  
- 🔄 **Автоматическая синхронизация** - каждые 10 секунд
- 📊 **Масштабируемость** - легко добавить больше Edge Gateway в разных локациях 