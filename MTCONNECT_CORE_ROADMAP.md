# MTConnect Core – Roadmap реализации (30-дневный цикл)

> Версия: 2025-07-06 • команда: MTConnect / NestJS

---
## 0. Предпосылки
* Архитектура зафиксирована в `ARCHITECTURE.md`.
* Внешний потребитель – FastAPI-бот (см. `FASTAPI_MTCONNECT_INTEGRATION.md`).
* Используем Taskmaster-AI (MCP) для трекинга задач и синхронизации команд.

---
## 1. Эпики и подпроекты (Edge Gateway архитектура)
| ID | Эпик | Описание |
|----|------|----------|
| **E1** | Edge Gateway | Текущий код + HTTP клиент → отправка в Railway, локальный dashboard |
| **E2** | Cloud API (Railway) | NestJS + MongoDB + эндпоинты `/api/ext/*` |
| **E3** | External API (`/api/ext/*`) | API-Key, idempotency, `setup`, `event`, `cycle-time` |
| **E4** | Edge → Cloud Sync | Буферизация, retry, health check |
| **E5** | Observability | Мониторинг Edge + Cloud, алерты, dashboard |

---
## 2. 4-спринтовый план (по 7 дней)
| Sprint | Цели | Deliverable |
|--------|------|-------------|
| **S1** | E1-Edge Gateway готов, Railway NestJS скелет  | Edge отправляет данные в Railway `/api/ext/data` |
| **S2** | E2-Cloud API полный, MongoDB, idempotency     | `/api/ext/setup` 200/409, хранение в MongoDB |
| **S3** | E3-External API для FastAPI, retry edge→cloud | FastAPI клиент работает с `/api/ext/cycle-time` |
| **S4** | E4 + E5, Sync & Observability                | Health check, dashboard, monitoring |

---
## 3. Синх-чекпоинты с FastAPI
1. **S1-END** – Railway API живёт, эндпоинт `/api/ext/setup` v0.1 доступен → FastAPI начинает интеграцию.
2. **S2-MID** – MongoDB idempotency включён, FastAPI переключается на Railway URL.
3. **S3-END** – pull `cycle-time` стабилен, FastAPI синхронизация зелёная.
4. **S4-END** – мониторинг включён; обе стороны проводят end-to-end.

---
## 4. Taskmaster-AI процесс
* Тэг `edge` – задачи Edge Gateway, `cloud` – Railway API, `integration` – пересечения с FastAPI.
* Команды:
  * `next_task` каждое утро стендапа.
  * `expand_task` для задач с complexity ≥8.
  * `update_subtask` для логов исследований.
* Раз в спринт: `get_tasks --status=pending --with-subtasks` + экспорт в README (sync-readme).

---
## 5. Основа CI
* Lint, Unit, Contract (openapi-tck, Pact) – <5 мин.
* Docker build `api`, `worker` – GHCR.
* Helm chart `mtc-core`, dev namespace `mtc-staging`.

---
## 6. Риски
| Риск | Митигирование |
|------|---------------|
| Mongo TS производительность | Индексы `(machine_id, ts)` + TTL + bucketSize 1 час |
| Kafka недоступен | Outbox статус `err`, повторная доставка воркером |
| Конфликт схемы с FastAPI | Contract-tests и еженедельное sync-meeting |

---
## 7. Контакты и календари
* **Еженедельный Sync-call:** Пн 11:00 MSK, 30 мин.  
* **Слак-канал:** `#mtc-sync` – вопросы по интеграции.

---
_Файл создан для внутренней команды ядра MTConnect. Обновлять по окончании каждого спринта._ 