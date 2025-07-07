FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "dist/main.js"] 