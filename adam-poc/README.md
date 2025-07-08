# ADAM-6050 PoC

**Proof of Concept**: Замена Advantech.Adam.DLL на Node.js + jsmodbus

## 🎯 Цель
Проверить возможность замены проприетарной .NET DLL на открытое Node.js решение для работы с ADAM-6050 модулем ввода/вывода через Modbus TCP.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Разработка
npm run dev

# Сборка
npm run build

# Запуск
npm start

# Тесты
npm test
```

## 🏗 Архитектура
```
ADAM-6050 (192.168.1.100:502) → Node.js PoC → Cloud API (Railway)
```

## 📋 Задачи PoC
- [x] Проектная структура
- [ ] Modbus TCP клиент
- [ ] JSON маппер
- [ ] HTTP клиент с Outbox pattern
- [ ] Mock сервер для тестов
- [ ] Интеграционные тесты

## 🛠 Технологии
- Node.js 18 + TypeScript
- jsmodbus — Modbus TCP клиент  
- axios — HTTP клиент
- rxjs — Reactive streams
- jest — Тестирование
- Docker — Контейнеризация 