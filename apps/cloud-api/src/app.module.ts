import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MachineData, MachineDataSchema } from './schemas/machine-data.schema';
import { EdgeDataController } from './edge-data/edge-data.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { SanitizationService } from './services/sanitization.service';
import { WinstonLoggerService } from './services/winston-logger.service';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env',
      load: [() => {
        // Конфиг лежит в корне проекта; поднимаемся на 3 уровня от apps/cloud-api/dist
        const configPath = path.resolve(__dirname, '../../../config.json');
        return require(configPath);
      }],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI_LOCAL')
          || process.env.MONGODB_URI
          || 'mongodb://localhost:27017/mtconnect',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: MachineData.name, schema: MachineDataSchema }]),
  ],
  controllers: [AppController, EdgeDataController, DashboardController],
  providers: [AppService, SanitizationService, WinstonLoggerService],
})
export class AppModule {}
