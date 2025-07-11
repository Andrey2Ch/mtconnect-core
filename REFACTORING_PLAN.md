# MTConnect Refactoring Plan - 2025-07-10

## Цель дня: Подготовить фундамент для архитектурного рефакторинга

### Блок 1: Аудит и чистка (1-2 часа)
- [ ] Остановить все процессы node.js
- [ ] Установить инструменты анализа (depcheck, ts-prune)
- [ ] Удалить ненужные файлы и папки
- [ ] Переместить бинарники в архив

### Блок 2: Создание monorepo структуры (2-3 часа)
- [ ] Создать структуру apps/, packages/, docker/
- [ ] Настроить workspace в package.json
- [ ] Создать packages/common-dto

### Блок 3: Миграция существующих проектов (2-3 часа)
- [ ] Переместить cloud-api в apps/cloud-api
- [ ] Создать apps/edge-gateway
- [ ] Вынести общие DTO

### Блок 4: Docker Compose для разработки (1-2 часа)
- [ ] Создать docker/compose.dev.yml
- [ ] Настроить mosquitto.conf
- [ ] Добавить скрипты npm run start:dev

### Блок 5: Тестирование (1 час)
- [ ] Проверить что монорепо работает
- [ ] Базовые проверки сервисов

### Блок 6: Фиксация прогресса (30 минут)
- [ ] Коммит изменений
- [ ] Обновить README.md

