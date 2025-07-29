import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  getHello(): string {
    return 'MTConnect Cloud API is running! 🚀';
  }

  @Get('/health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'MTConnect Cloud API'
    };
  }

  @Get('api/dashboard/machines')
  getMachines() {
    // Временная заглушка для дашборда
    // TODO: Подключить к реальной MongoDB когда будут данные
    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        mtconnect: {
          online: 0,
          total: 8
        },
        adam: {
          online: 0,
          total: 10
        }
      },
      machines: {
        mtconnect: [],
        adam: []
      },
      message: 'No data yet - waiting for Edge Gateway connections'
    };
  }
}
