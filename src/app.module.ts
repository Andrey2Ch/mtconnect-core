import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExternalApiController } from './controllers/external-api.controller';
import { MachineData, MachineDataSchema } from './schemas/machine-data.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect'
    ),
    MongooseModule.forFeature([
      { name: MachineData.name, schema: MachineDataSchema }
    ])
  ],
  controllers: [AppController, ExternalApiController],
  providers: [AppService],
})
export class AppModule {} 