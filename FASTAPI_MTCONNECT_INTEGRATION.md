# План интеграции FastAPI → MTConnect

> Версия: 2025-07-06 • адресат: команда FastAPI-бота  
> Контекст: MTConnect ядро (NestJS + Mongo) уже проектируется по файлу `ARCHITECTURE.md`.

---
## 1. Цель
Обеспечить надёжную синхронизацию доменных событий (setup*, cycle-time) между существующей системой учёта (Telegram-бот → FastAPI → PostgreSQL) и сервисом MTConnect без потери данных и с минимальной задержкой.

---
## 2. Обзор интеграционных точек
| Направление | Endpoint (MTConnect) | Метод | Idempotency | SLA |
|-------------|----------------------|-------|-------------|-----|
| FastAPI → MTConnect | `/api/ext/setup` | `POST` | `X-Idempotency-Key` | 200 ms p95 |
| FastAPI → MTConnect | `/api/ext/event` | `POST` | `X-Idempotency-Key` | 200 ms p95 |
| FastAPI ← MTConnect | `/api/ext/machines/{id}/cycle-time` | `GET`  | – | 200 ms p95 |
| (v1) Web-hook | `/api/hooks/cycle-time` | `POST` | `X-Idempotency-Key` | 300 ms p95 |

---
## 3. Технологии
* **Python 3.12**, FastAPI ≥ 0.111, httpx / aiohttp для исходящих запросов.
* **Redis 7** — хранилище idempotency-ключей (TTL 7 дней).
* **Celery** (RabbitMQ или Redis-broker) — для фоновых retry/cron-job.
* **Pydantic v2** — строгая валидация входящих web-hookов.
* **openapi-tck** — contract-тест на базовый OpenAPI MTConnect (pull из mono-repo).

---
## 4. Пакет `mtc_client`
Создаём локальный пакет-обёртку для вызовов MTConnect.
```python
# mtc_client/__init__.py
async def post_setup(event: SetupEvent, idempotency_key: str): ...
async def post_event(event: GenericEvent, idempotency_key: str): ...
async def get_cycle_time(machine_id: int) -> CycleTimeResponse: ...
```
* Автоматически генерируется из OpenAPI (`@mtc/sdk`) — но fallback-реализация руками, чтобы не ждать SDK.
* retry = `[1 s, 4 s, 10 s]`, максимум 5 попыток.

---
## 5. Cron-job `sync_cycle_time`
```python
@celery_app.task
async def sync_cycle_time():
    machines = db.fetch_active_machines()
    for m in machines:
        resp = await mtc_client.get_cycle_time(m.id)
        db.update_cycle_time(m.id, resp.last_cycle_time)
```
* Период — 15 минут (ENV `CYCLE_SYNC_PERIOD=900`).
* Логика «не обновлять, если цикл не изменился» для экономии Write-IO.

---
## 6. Web-hook (v1)
1. FastAPI регистрирует URL в MTConnect (`POST /api/v1/webhooks`).
2. Обработчик:
```python
@router.post("/api/hooks/cycle-time")
async def cycle_time_hook(payload: CycleTimeChanged, x_idempotency_key: str = Header(...)):
    if redis.setnx(f"idem:{x_idempotency_key}", 1, ex=604800):
        db.update_cycle_time(payload.machine_id, payload.cycle_time)
```
3. Roll-out фича-флагом `USE_WEBHOOK=true`.

---
## 7. CI / CD
* **GitHub Actions**
  * `pytest && mypy`
  * Pact / `openapi-tck` — сравнение с последним `ARCHITECTURE.md` OpenAPI.
  * Docker build `fastapi-bot` → GHCR.
* **Deploy**
  * Helm chart `fastapi-bot` (namespace `production-tracking`).

---
## 8. Сверка с MTConnect-командой
| Sprint | Checkpoint |
|--------|------------|
| 1 (T+7d) | `/api/ext/setup` принимает 200 OK / 409 |
| 2 (T+14d) | `sync_cycle_time` pull-циклы и обновляет PG |
| 3 (T+21d) | Web-hook end-to-end demo под флагом |
| 4 (T+28d) | openapi-tck green, интеграция «без рук» |

---
## 9. Риски
* MTConnect задержка > 200 мс ⇒ увеличить таймаут httpx до 3 с.
* Redis недоступен ⇒ временно пропускаем idempotency, логируем WARN.

---
_Документ авто-сгенерирован для коллег. Все детали контрактов актуальны на commit от 2025-07-06._ 