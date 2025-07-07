# MTConnect Core – Roadmap реализации (30-дневный цикл)

> Версия: 2025-07-06 • команда: MTConnect / NestJS

---
## 0. Предпосылки
* Архитектура зафиксирована в `ARCHITECTURE.md`.
* Внешний потребитель – FastAPI-бот (см. `FASTAPI_MTCONNECT_INTEGRATION.md`).
* Используем Taskmaster-AI (MCP) для трекинга задач и синхронизации команд.

---
## 1. Эпики и подпроекты
| ID | Эпик | Описание |
|----|------|----------|
| **E1** | Core API MVP | Внутренние `/internal` и публичные `/api/v1`, CRUD машин, ingest данных |
| **E2** | Outbox & Kafka | Коллекция `outbox`, воркер, публикация в `kafka.raw_data` |
| **E3** | External API (`/api/ext/*`) | Гварды API-Key, idempotency, эндпоинты `setup`, `event`, `cycle-time` |
| **E4** | Web-hook Registry | Коллекция `webhooks`, dispatcher, retry, HMAC |
| **E5** | Observability | Prometheus metrics, structured logs, Grafana dashboard |

---
## 2. 4-спринтовый план (по 7 дней)
| Sprint | Цели | Deliverable |
|--------|------|-------------|
| **S1** | E1-Core API скелет, Mongo RS, Docker Compose  | Demo `POST /internal/machines/:id/data` сохраняет в TS bucket |
| **S2** | E2-Outbox, Kafka stack, Redis idempotency     | Event в outbox → Kafka; `/api/ext/setup` 200/409 |
| **S3** | E3-External API полный, Rate-Limit            | FastAPI клиент проходит openapi-tck; p95 ≤200 мс |
| **S4** | E4 + E5, Web-hooks & Observability            | Web-hook demo + Grafana board, alerts 5xx/lag |

---
## 3. Синх-чекпоинты с FastAPI
1. **S1-END** – контракт `/api/ext/setup` v0.1 залит в репо → FastAPI начинает интеграцию.
2. **S2-MID** – Redis idempotency включен, FastAPI переключается с Mongo-хранимой схемы на Redis.
3. **S3-END** – pull `cycle-time` стабилен, FastAPI синхронизация зелёная.
4. **S4-END** – web-hook включён в staging; обе стороны проводят end-to-end.

---
## 4. Taskmaster-AI процесс
* Тэг `core` – задачи ядра, `integration` – пересечения с FastAPI.
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