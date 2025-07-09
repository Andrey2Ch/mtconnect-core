import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { ExternalApiController } from './controllers/external-api.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { TestDatabaseController } from './controllers/test-database.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DataProcessingService } from './services/data-processing.service';
import { DataEventsGateway } from './gateways/data-events.gateway';
import { AlertingService } from './services/alerting.service';

// Импорт всех схем базы данных
import { MachineData, MachineDataSchema } from './schemas/machine-data.schema';
import { MachineConfiguration, MachineConfigurationSchema } from './schemas/machine-configuration.schema';
import { MachineState, MachineStateSchema } from './schemas/machine-state.schema';
import { AggregatedData, AggregatedDataSchema } from './schemas/aggregated-data.schema';

import { SanitizationService } from './services/sanitization.service';
import { WinstonLoggerService } from './services/winston-logger.service';
import { MetricsService, metricsProviders } from './services/metrics.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

@Module({
  imports: [
    // MongoDB Connection with optimized settings
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect', {
      // Настройки для production
      maxPoolSize: 50, // максимум подключений в пуле
      serverSelectionTimeoutMS: 5000, // таймаут выбора сервера
      socketTimeoutMS: 45000, // таймаут сокета
      bufferCommands: false, // отключаем буферизацию команд
      
      // Настройки для TimeSeries коллекций
      retryWrites: true,
      writeConcern: { w: 'majority' }, // подтверждение записи от большинства узлов
    }),
    
    // Регистрация всех MongoDB схем
    MongooseModule.forFeature([
      // TimeSeries коллекция для реального времени (90 дней TTL)
      { name: MachineData.name, schema: MachineDataSchema },
      
      // Конфигурации машин (постоянные данные)
      { name: MachineConfiguration.name, schema: MachineConfigurationSchema },
      
      // Текущие состояния машин (живой snapshot)
      { name: MachineState.name, schema: MachineStateSchema },
      
      // Агрегированные данные для аналитики (1 год TTL)
      { name: AggregatedData.name, schema: AggregatedDataSchema },
    ]),
    
    // Rate Limiting Configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium', 
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Prometheus Metrics Module
    PrometheusModule.register({
      path: '/api/monitoring/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'mtconnect_cloud_',
        },
      },
    }),
  ],
  controllers: [
    ExternalApiController,
    MonitoringController,
    TestDatabaseController,
    DashboardController,
  ],
  providers: [
    // Core Services
    Reflector,
    
    // Services
    SanitizationService,
    WinstonLoggerService,
    MetricsService,
    DataProcessingService,
    DataEventsGateway,
    AlertingService,
    
    // Metrics Providers
    ...metricsProviders,
    
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
