FROM node:18-alpine

# Force rebuild - 2025-01-07
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "dist/main.js"] 