import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppService } from './app.service';
import { MachineData, MachineDataDocument } from './schemas/machine-data.schema';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>
  ) {}

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

  @Get('api/machines')
  async getMachines(): Promise<any> {
    try {
      const machines = await this.appService.getMachines();
      return machines;
    } catch (error) {
      console.error('Error getting machines:', error);
      throw new HttpException('Failed to get machines', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('api/settings')
  async updateSettings(@Body() settings: { idleTimeThresholdMinutes: number }): Promise<any> {
    try {
      console.log('⚙️ Получены настройки от дашборда:', settings);
      
      // Здесь можно сохранить настройки в базу данных или передать в Edge Gateway
      // Пока просто логируем
      
      return { 
        success: true, 
        message: 'Settings updated',
        settings: settings 
      };
    } catch (error) {
      console.error('Error updating settings:', error);
      throw new HttpException('Failed to update settings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('api/settings')
  async getSettings(): Promise<any> {
    try {
      // Возвращаем текущие настройки (можно загружать из базы данных)
      return {
        idleTimeThresholdMinutes: 5 // По умолчанию
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      throw new HttpException('Failed to get settings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
