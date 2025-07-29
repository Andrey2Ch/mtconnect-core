import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const logger = new Logger('CloudAPI');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.enableCors();
  
  // Обслуживание статических файлов дашборда из локальной папки cloud-api
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/dashboard/',
  });
  
  // Дополнительно обслуживаем файлы напрямую без префикса
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  logger.log(`🚀 Cloud API running on port ${port}`);
  logger.log(`📊 Dashboard: http://localhost:${port}/dashboard/index.html`);
  logger.log(`🆕 NEW Dashboard: http://localhost:${port}/dashboard-new.html`);
  logger.log(`📡 API Health: http://localhost:${port}/health`);
}

bootstrap();
