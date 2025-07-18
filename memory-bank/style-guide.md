# Стиль кода MTConnect

## Общие правила
- **Язык программирования:** TypeScript
- **Отступы:** 2 пробела
- **Точки с запятой:** обязательны
- **Кавычки:** двойные для строк
- **Длина строки:** максимум 100 символов
- **Именование переменных:** camelCase
- **Именование констант:** UPPER_SNAKE_CASE
- **Именование классов:** PascalCase
- **Именование интерфейсов:** IPascalCase

## NestJS конвенции
- **Контроллеры:** назваение.controller.ts
- **Сервисы:** название.service.ts
- **Модули:** название.module.ts
- **DTO:** название.dto.ts
- **Схемы:** название.schema.ts
- **Декораторы:** @Controller(), @Get(), @Post(), etc.

## Структура проекта
- **apps/cloud-api/src/controllers/** - HTTP контроллеры
- **apps/cloud-api/src/services/** - бизнес-логика
- **apps/cloud-api/src/schemas/** - MongoDB схемы
- **apps/cloud-api/src/dto/** - объекты для валидации данных
- **src/** - локальный Edge Gateway

## Форматирование кода
- ESLint для валидации
- Prettier для форматирования
