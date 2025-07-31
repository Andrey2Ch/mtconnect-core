import { Controller, Get, Post, Body } from '@nestjs/common';
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

  @Get('api/dashboard/machines')
  async getMachines() {
    try {
      // Получаем последние данные от каждой машины
      const latestData = await this.machineDataModel.aggregate([
        {
          $sort: { 'metadata.machineId': 1, timestamp: -1 }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            latest: { $first: '$$ROOT' }
          }
        }
      ]);

      const mtconnectMachines = [];
      const adamMachines = [];

      latestData.forEach(item => {
        const machineId = item.latest.metadata.machineId;
        const rawPartCount = item.latest.data?.partCount || 0;
        const idleTime = item.latest.data?.idleTimeMinutes || 0;
        const status = item.latest.data?.executionStatus || 'UNAVAILABLE';
        
        // 🔍 DEBUG: данные для дашборда
        console.log(`🎯 DASHBOARD ${machineId}: parts=${rawPartCount}, status=${status}, idle=${idleTime}мин`);
        
        const machine = {
          id: machineId,
          name: item.latest.metadata.machineName,
          type: item.latest.metadata.machineType,
          status: 'online',
          lastUpdate: item.latest.timestamp,
          data: item.latest.data ? {
            ...item.latest.data,
            idleTimeMinutes: idleTime  // 🕒 Время простоя
          } : {
            partCount: 0,
            program: 'N/A',
            executionStatus: 'UNAVAILABLE',
            cycleTime: 0,
            cycleTimeConfidence: 'LOW',
            idleTimeMinutes: 0
          }
        };

        if (item.latest.metadata.machineType === 'FANUC') {
          mtconnectMachines.push(machine);
        } else {
          adamMachines.push(machine);
        }
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total: mtconnectMachines.length + adamMachines.length,
          mtconnect: {
            online: mtconnectMachines.length,
            total: 8
          },
          adam: {
            online: adamMachines.length,
            total: 10
          }
        },
        machines: {
          mtconnect: mtconnectMachines,
          adam: adamMachines
        }
      };
    } catch (error) {
      console.error('Error fetching machines:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        summary: { total: 0, mtconnect: { online: 0, total: 8 }, adam: { online: 0, total: 10 } },
        machines: { mtconnect: [], adam: [] }
      };
    }
  }
}
