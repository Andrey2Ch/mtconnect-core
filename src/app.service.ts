import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'MTConnect Cloud API v1.0.0 - Ready to receive data!';
  }
} 