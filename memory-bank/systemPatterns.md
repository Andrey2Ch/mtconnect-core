# Системные шаблоны MTConnect

## Архитектура системы
- **Edge Gateway → Cloud API**: REST API через HTTPS
- **Protobuf**: не используется (удалено)
- **MongoDB**: хранение данных в облаке
- **Railway**: хостинг для Cloud API
- **WebSocket**: пока не реализовано

## Типы данных
- **ADAM-6050**: аналоговые счетчики с десятичными значениями
- **MTConnect**: XML данные от MTConnect Agent
- **Общий формат данных**: JSON с полями machineId, status, timestamp

## Шаблоны кода
- **Контроллеры**: NestJS контроллеры с декораторами @Controller, @Post, @Get
- **Схемы MongoDB**: Mongoose схемы с @Schema() декоратором
- **DTO объекты**: Типизация входящих данных с валидацией

## Соглашения по именованию
- **Контроллеры**: *Controller.ts
- **Сервисы**: *Service.ts
- **Схемы**: *.schema.ts
- **DTO**: *.dto.ts
