# 🚀 MTConnect: Руководство по локальной разработке

Это руководство поможет вам настроить и запустить проект локально.

## ⚠️ Важно: Первичная настройка Git

В проекте есть `.gitignore` для предотвращения попадания в репозиторий лишних файлов (таких как `node_modules`, `dist`, `.env`). Если вы видите в `git status` файлы, которые должны игнорироваться, выполните следующие команды, чтобы очистить кэш Git:

```powershell
git rm -r --cached .
git add .
git commit -m "chore: Clean up git index and apply .gitignore"
```

---

## 📋 Архитектура

Проект состоит из двух основных частей, работающих одновременно:

1.  **📡 Edge Gateway** (`src/main.ts`):
    *   **Порт:** `5000`
    *   **Назначение:** Сбор данных с физических станков (MTConnect, Adam-6050) и отправка их в облако Railway. Предоставляет "сырые" данные для локальной отладки.

2.  **☁️ Cloud API** (`apps/cloud-api`):
    *   **Порт:** `3000`
    *   **Назначение:** Продвинутый API на NestJS для дашбордов, аналитики и взаимодействия с MongoDB. Получает данные из облака.

---

## 🔧 Быстрый старт

### Вариант 1: Автоматический запуск (Рекомендуется для Windows)

Этот скрипт откроет два отдельных окна PowerShell для каждого сервера.

```powershell
.\start-local-dev.ps1
```

### Вариант 2: Ручной запуск в одном терминале

Используйте `concurrently` для параллельного запуска обоих серверов.

```powershell
# Запустит и Edge, и Cloud
npm run start:dev
```

### Вариант 3: Ручной запуск в разных терминалах

Для более гранулярного контроля.

```powershell
# Терминал 1: Запуск Edge Gateway
# Эта команда сначала соберет проект (tsc), а затем запустит его.
npm run start:edge

# Терминал 2: Запуск Cloud API
# Запускает NestJS в режиме отслеживания изменений (hot-reload)
npm run start:cloud
```

---

## 🌐 Доступные интерфейсы

### Edge Gateway (http://localhost:5000)
*   `/`: Главная страница со ссылками на все эндпоинты
*   `/current`: XML-данные MTConnect в реальном времени
*   `/probe`: Информация о конфигурации станков
*   `/health`: Статус работоспособности Edge Gateway
*   `/railway-status`: Статус подключения к облаку Railway
*   `/api/machines`: Список машин в формате JSON
*   `/api/adam/counters`: Данные со счетчиков Adam-6050

### Cloud API (http://localhost:3000)
*   `/`: Основной дашборд (`dashboard-new.html`)
*   `/api/dashboard/health`: Статус работоспособности Cloud API
*   `/api/dashboard/machines`: Список машин с аналитическими данными
*   `/api/dashboard/data/:machineId`: Детальные данные по конкретной машине
*   `/api/dashboard/status`: Общий статус системы, включая состояние БД

---

## 🔄 Поток данных

```mermaid
graph TD
    subgraph "Физические станки"
        M[MTConnect / Adam-6050]
    end

    subgraph "Локальная среда"
        EG[Edge Gateway (localhost:5000)]
    end
    
    subgraph "Облако"
        RC[Railway Cloud]
        DB[(MongoDB)]
    end

    subgraph "API и Дашборды"
        CA[Cloud API (localhost:3000)]
        D[Дашборды]
    end

    M --> EG
    EG --> RC
    RC --> CA
    CA --> D
    CA --- DB
```
---

## 🛠️ Процесс разработки

*   **Изменение Edge Gateway (`src/`):**
    1.  Отредактируйте файлы в корневой папке `src/`.
    2.  Для применения изменений требуется пересборка и перезапуск: `npm run start:edge`.

*   **Изменение Cloud API (`apps/cloud-api/src/`):**
    1.  Отредактируйте файлы в `apps/cloud-api/src/`.
    2.  Сервер перезапустится автоматически благодаря режиму `watch` в NestJS.

*   **Изменение Дашбордов (`apps/cloud-api/public/`):**
    1.  Отредактируйте HTML/JS/CSS файлы в `apps/cloud-api/public/`.
    2.  Просто обновите страницу в браузере, чтобы увидеть изменения.

---

## 🚀 Деплой на Railway

Изменения автоматически деплоятся на Railway при каждом `push` в ветку `main`.

```powershell
git add .
git commit -m "feat: Описание ваших изменений"
git push origin main
```
**URL Продакшена:** https://mtconnect-core-production.up.railway.app

---

## 🐛 Отладка

*   **Проверка локальных данных MTConnect:** `curl http://localhost:5000/current`
*   **Проверка статуса Cloud API:** `curl http://localhost:3000/api/dashboard/health`
*   **Логи Edge Gateway:** Смотрите в терминале, где запущен `start:edge`.
*   **Логи Cloud API:** Выводятся в терминале (NestJS) и пишутся в файлы в папке `logs/` (Winston).
*   **Убить все процессы Node.js (если что-то зависло):** `taskkill /f /im node.exe` 