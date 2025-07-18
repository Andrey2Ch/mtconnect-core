# 🏭 MTConnect Monitoring System

Это проект для мониторинга станков, состоящий из двух основных частей:

1.  **Edge Gateway**: Сервис для сбора данных непосредственно с оборудования (MTConnect, Adam-6050).
2.  **Cloud API**: Сервис на NestJS для обработки данных, их хранения в MongoDB и предоставления API для дашбордов.

## 🚀 Быстрый старт

Вся подробная информация по установке, запуску, архитектуре и процессу разработки находится в файле [DEVELOPMENT.md](DEVELOPMENT.md).

### Основные команды

```powershell
# Автоматический запуск (рекомендуется для Windows)
.\start-local-dev.ps1

# Ручной запуск (в одном терминале)
npm run start:dev

# Ручной запуск (в разных терминалах)
# Терминал 1: Edge Gateway
npm run start:edge
# Терминал 2: Cloud API
npm run start:cloud
``` 