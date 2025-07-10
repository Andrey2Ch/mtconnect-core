import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from './schemas/machine-data.schema';
import * as fs from 'fs';
import * as path from 'path';

interface AdamMachine {
  id: string;
  name: string;
  channel: number;
  ip: string;
  port: number;
  type: string;
  status: string;
  count?: number;
  lastUpdate?: string;
  confidence?: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MTConnect Cloud API',
      version: '1.0.0'
    };
  }

  @Get('/dashboard')
  getDashboard() {
    return { 
      message: 'MTConnect Cloud Dashboard API',
      endpoints: {
        '/machines': 'Список всех станков',
        '/health': 'Статус API',
        '/dashboard/index.html': 'Веб-интерфейс'
      }
    };
  }

  @Get('/machines')
  async getMachines() {
    try {
      console.log('📊 Получаю данные машин из MongoDB...');
      
      // Получаем последние данные для каждой машины
      const latestData = await this.machineDataModel.aggregate([
        {
          $sort: { 'metadata.machineId': 1, timestamp: -1 }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            latestRecord: { $first: '$$ROOT' }
          }
        }
      ]);

      console.log(`📊 Найдено ${latestData.length} машин в базе данных`);

      // Читаем конфигурацию для получения полной информации о машинах
      const configPaths = [
        path.join(__dirname, 'config.json'),
        path.join(__dirname, '..', 'config.json'),
        path.join(process.cwd(), 'config.json'),
        path.join(process.cwd(), 'src', 'config.json')
      ];

      let configPath = '';
      for (const testPath of configPaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          break;
        }
      }

      if (!configPath) {
        throw new Error('Конфигурационный файл не найден');
      }

      console.log(`⚙️ Используем config.json из: ${configPath}`);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Создаем Map для быстрого поиска конфигурации
      const configMap = new Map();
      config.machines.forEach(machine => {
        configMap.set(machine.id, machine);
      });

      // Определяем временной порог для считания машины online (5 минут)
      const onlineThreshold = 5 * 60 * 1000; // 5 минут в миллисекундах
      const now = new Date();

      // Обрабатываем MTConnect машины
      const mtconnectMachines = [];
      const adamMachines = [];

      for (const item of latestData) {
        const record = item.latestRecord;
        const machineId = record.metadata.machineId;
        const machineName = record.metadata.machineName;
        const lastUpdate = new Date(record.timestamp);
        const timeDiff = now.getTime() - lastUpdate.getTime();
        const isOnline = timeDiff < onlineThreshold;

        console.log(`🔍 ${machineId}: последнее обновление ${lastUpdate.toISOString()}, разница ${timeDiff}мс, статус: ${isOnline ? 'online' : 'offline'}`);

        // Проверяем, это MTConnect или ADAM машина
        if (record.data.adamData) {
          // Это ADAM машина
          adamMachines.push({
            id: machineId,
            name: machineName,
            channel: record.data.adamData.channel || 0,
            ip: '192.168.1.120',
            port: 502,
            type: 'ADAM-6050 Counter',
            status: isOnline ? 'online' : 'offline',
            count: record.data.adamData.analogData?.['Counter (32-bit)'] || 0,
            lastUpdate: lastUpdate.toISOString(),
            confidence: record.data.adamData.confidence || 'unknown'
          });
        } else {
          // Это MTConnect машина
          const configMachine = configMap.get(machineId);
          if (configMachine) {
            mtconnectMachines.push({
              id: machineId,
              name: machineName,
              ip: configMachine.ip,
              port: configMachine.port,
              type: configMachine.type,
              status: isOnline ? 'online' : 'offline',
              agentUrl: configMachine.mtconnectAgentUrl,
              uuid: configMachine.uuid,
              spindles: configMachine.spindles,
              axes: configMachine.axes,
              source: 'Edge Gateway',
              lastUpdate: lastUpdate.toISOString(),
              partCount: record.data.partCount,
              executionStatus: record.data.executionStatus,
              cycleTime: record.data.cycleTime
            });
          }
        }
      }

      const result = {
        timestamp: new Date().toISOString(),
        summary: {
          total: mtconnectMachines.length + adamMachines.length,
          mtconnect: {
            total: mtconnectMachines.length,
            online: mtconnectMachines.filter(m => m.status === 'online').length,
            offline: mtconnectMachines.filter(m => m.status === 'offline').length
          },
          adam: {
            total: adamMachines.length,
            online: adamMachines.filter(m => m.status === 'online').length,
            offline: adamMachines.filter(m => m.status === 'offline').length
          }
        },
        machines: {
          mtconnect: mtconnectMachines,
          adam: adamMachines
        }
      };

      console.log(`✅ Возвращаю данные: ${result.summary.total} машин (${result.summary.mtconnect.online + result.summary.adam.online} online)`);
      return result;

    } catch (error) {
      console.error('❌ Ошибка получения данных машин:', error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        summary: {
          total: 0,
          mtconnect: { total: 0, online: 0, offline: 0 },
          adam: { total: 0, online: 0, offline: 0 }
        },
        machines: {
          mtconnect: [],
          adam: []
        }
      };
    }
  }
}
