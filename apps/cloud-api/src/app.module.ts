import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExternalApiController } from './controllers/external-api.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { MachineData, MachineDataSchema } from './schemas/machine-data.schema';

// Cloud API НЕ читает SHDR напрямую! 
// Только принимает REST данные от Edge Gateway

@Module({
  imports: [
    // MongoDB подключение
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect-local'),
    
    // MongoDB схемы
    MongooseModule.forFeature([
      { name: MachineData.name, schema: MachineDataSchema }
    ])
  ],
  controllers: [
    AppController,
    ExternalApiController,
    DashboardController
  ],
  providers: [
    AppService
  ],
})
export class AppModule {}
