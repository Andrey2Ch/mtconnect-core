import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EdgeDataController } from './edge-data/edge-data.controller';

@Module({
  imports: [],
  controllers: [AppController, EdgeDataController],
  providers: [AppService],
})
export class AppModule {}
