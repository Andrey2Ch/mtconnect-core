FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json из cloud-api
COPY apps/cloud-api/package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для build)
RUN npm install

# Копируем исходный код cloud API в корень
COPY apps/cloud-api/ ./

# Собираем проект
RUN npm run build

# Удаляем dev зависимости после build
RUN npm prune --production

# Открываем порт (Railway автоматически устанавливает PORT)
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/main.js"] 