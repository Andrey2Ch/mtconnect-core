import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExternalApiController } from './controllers/external-api.controller';

@Module({
  imports: [],
  controllers: [AppController, ExternalApiController],
  providers: [AppService],
})
export class AppModule {}
