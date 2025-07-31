import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger('AppService');

  constructor() {
    this.logger.log('🚀 Cloud API инициализируется...');
  }

  getHello(): string {
    return 'MTConnect Cloud API is running!';
  }
}