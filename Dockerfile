FROM node:18-alpine

WORKDIR /app

# Переходим в папку с cloud API
WORKDIR /app/cloud-api/mtconnect-cloud

# Копируем package.json и package-lock.json
COPY cloud-api/mtconnect-cloud/package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для build)
RUN npm install

# Копируем исходный код cloud API
COPY cloud-api/mtconnect-cloud/ ./

# Собираем проект
RUN npm run build

# Удаляем dev зависимости после build
RUN npm prune --production

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "run", "start:prod"] 