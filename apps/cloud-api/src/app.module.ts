import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExternalApiController } from './controllers/external-api.controller';
import { MachineData, MachineDataSchema } from './schemas/machine-data.schema';
import { MachineState, MachineStateSchema } from './schemas/machine-state.schema';
import { MachineStatesCacheService } from './services/machine-states-cache.service';

// Cloud API НЕ читает SHDR напрямую! 
// Только принимает REST данные от Edge Gateway

@Module({
  imports: [
    // MongoDB подключение
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect-local'),
    
    // MongoDB схемы
    MongooseModule.forFeature([
      { name: MachineData.name, schema: MachineDataSchema },
      { name: MachineState.name, schema: MachineStateSchema }
    ])
  ],
  controllers: [
    AppController,
    ExternalApiController
  ],
  providers: [
    AppService,
    MachineStatesCacheService
  ],
})
export class AppModule {}
