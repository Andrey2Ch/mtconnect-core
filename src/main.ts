import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Включаем валидацию
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Включаем CORS для внешних API
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: false,
  });

  // Railway использует переменную PORT
  const port = process.env.PORT || 3000;
  
  console.log(`🚀 MTConnect Cloud API запущен на порту ${port}`);
  console.log(`📊 Health Check: http://localhost:${port}/api/ext/health`);
  console.log(`📡 Data Endpoint: http://localhost:${port}/api/ext/data`);
  
  await app.listen(port);
}

bootstrap(); 