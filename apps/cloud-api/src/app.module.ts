import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EdgeDataController } from './edge-data/edge-data.controller';
import { ExternalApiController } from './controllers/external-api.controller';
import { MachineData, MachineDataSchema } from './schemas/machine-data.schema';
import { SanitizationService } from './services/sanitization.service';
import { WinstonLoggerService } from './services/winston-logger.service';
import { MetricsService } from './services/metrics.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect'),
    MongooseModule.forFeature([{ name: MachineData.name, schema: MachineDataSchema }]),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [AppController, EdgeDataController, ExternalApiController],
  providers: [AppService, SanitizationService, WinstonLoggerService, MetricsService],
})
export class AppModule {}
