# Разработка дашборда

## Простой workflow

### 1. Разработка локально
Редактируй дашборд:
```
cloud-api/mtconnect-cloud/public/dashboard-pro.html
```

### 2. Тестирование
Пересобери и запусти Edge Gateway:
```bash
npm run build
npm start
```

Проверь дашборд на: `http://localhost:5000/dashboard-pro.html`

### 3. Деплой в облако
Когда доволен результатом:
```bash
git add .
git commit -m "feat: обновления дашборда"
git push
```

Railway автоматически обновит облачный дашборд на: https://mtconnect-core-production.up.railway.app/

## Файлы дашборда

- **Единственный файл:** `cloud-api/mtconnect-cloud/public/dashboard-pro.html`
- **Локальный просмотр:** `http://localhost:5000/dashboard-pro.html`  
- **Облачный дашборд:** `https://mtconnect-core-production.up.railway.app/`

## Архитектура

```
FANUC machines → Edge Gateway (localhost:5000) → Railway API → MongoDB Atlas
                        ↓
                Local dashboard ← same file → Cloud dashboard
```

**Один файл - оба дашборда!** 