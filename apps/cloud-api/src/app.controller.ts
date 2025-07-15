import { Controller, Get, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>
  ) {}

  @Get('/dev/clear-db')
  async clearDatabase() {
    this.logger.warn('🚨 ВНИМАНИЕ: Получен запрос на полную очистку коллекции machine_data!');
    try {
      await this.machineDataModel.collection.drop();
      const message = `✅ Коллекция machine_data успешно удалена.`;
      this.logger.log(message);
      return { success: true, message };
    } catch (error) {
      if (error.code === 26) { // NamespaceNotFound error code
        const message = 'ℹ️ Коллекция machine_data не найдена, удалять нечего.';
        this.logger.log(message);
        return { success: true, message };
      }
      const errorMessage = `❌ Ошибка при удалении коллекции machine_data: ${error.message}`;
      this.logger.error(errorMessage, error.stack);
      return { success: false, message: errorMessage };
    }
  }

  @Get('/hello')
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
      
      // Сначала проверим, есть ли данные в базе вообще
      const totalCount = await this.machineDataModel.countDocuments();
      console.log(`📈 Всего записей в базе: ${totalCount}`);
      
      if (totalCount === 0) {
        console.log('⚠️  База данных пуста - нет записей для обработки');
        return {
          timestamp: new Date().toISOString(),
          summary: {
            total: 0,
            mtconnect: { total: 0, online: 0, offline: 0 },
            adam: { total: 0, online: 0, offline: 0 }
          },
          machines: {
            mtconnectMachines: [],
            adamMachines: []
          }
        };
      }
      
      // Получаем несколько последних записей для отладки
      const sampleRecords = await this.machineDataModel
        .find()
        .sort({ timestamp: -1 })
        .limit(3)
        .exec();
        
      console.log('🔍 Примеры записей из базы:');
      sampleRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. machineId: ${record.metadata?.machineId}, timestamp: ${record.timestamp}, source: ${record.metadata?.source}`);
      });
      
      // Получаем уникальные машины
      const uniqueMachines = await this.machineDataModel.distinct('metadata.machineId');
      console.log(`🏭 Уникальные машины в базе: ${uniqueMachines.length} - ${uniqueMachines.join(', ')}`);
      
      // Исправленный агрегирующий запрос
      const latestRecords = await this.machineDataModel.aggregate([
        // Сортируем по времени (последние записи первыми)
        { $sort: { timestamp: -1 } },
        // Группируем по machineId и берем первую (последнюю по времени) запись
        {
          $group: {
            _id: '$metadata.machineId',
            latestRecord: { $first: '$$ROOT' }
          }
        },
        // Заменяем корневой объект на последнюю запись
        { $replaceRoot: { newRoot: '$latestRecord' } }
      ]);

      console.log(`📋 Получено ${latestRecords.length} записей после агрегации`);
      
      // Если агрегация не дала результатов, попробуем другой подход
      if (latestRecords.length === 0) {
        console.log('🔄 Агрегация не дала результатов, пробуем альтернативный подход...');
        
        // Альтернативный подход: получить последние записи для каждой уникальной машины
        const machineLatestRecords = [];
        for (const machineId of uniqueMachines) {
          const lastRecord = await this.machineDataModel
            .findOne({ 'metadata.machineId': machineId })
            .sort({ timestamp: -1 })
            .exec();
            
          if (lastRecord) {
            machineLatestRecords.push(lastRecord);
          }
        }
        
        console.log(`🔄 Альтернативный подход дал ${machineLatestRecords.length} записей`);
        latestRecords.push(...machineLatestRecords);
      }

      const now = new Date();
      const onlineThreshold = 30000; // 30 секунд
      const mtconnectMachines = [];
      const adamMachines = [];

      // Загружаем статические данные для MTConnect машин
      const configPath = path.join(__dirname, 'config.json');
      let machineConfigs = {};
      
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        machineConfigs = config.machines || {};
      } catch (configError) {
        console.warn('⚠️  Не удалось загрузить config.json:', configError.message);
      }

      for (const record of latestRecords) {
        // --- SAFETY CHECK ---
        if (!record.metadata || !record.metadata.machineId) {
          console.warn('⚠️  Пропускаем запись с отсутствующими метаданными:', record);
          continue;
        }
        // --- END SAFETY CHECK ---
        
        const machineId = record.metadata.machineId;
        const lastUpdate = new Date(record.timestamp);
        const timeDiff = now.getTime() - lastUpdate.getTime();
        const isOnline = timeDiff < onlineThreshold;

        console.log(`🔍 ${machineId}: последнее обновление ${lastUpdate.toISOString()}, разница ${timeDiff}мс, статус: ${isOnline ? 'online' : 'offline'}`);

        if (record.metadata.source === 'adam') {
          // ADAM машины
          const adamConfig = machineConfigs[machineId];
          adamMachines.push({
            id: machineId,
            name: adamConfig?.name || machineId,
            channel: adamConfig?.channel || 0,
            ip: adamConfig?.ip || '192.168.1.100',
            port: adamConfig?.port || 502,
            type: 'ADAM-6050',
            status: isOnline ? 'online' : 'offline',
            count: record.data?.adamData?.analogData?.['DI0'] || 0,
            lastUpdate: lastUpdate.toISOString(),
            confidence: 'high'
          });
        } else {
          // MTConnect машины
          const machineConfig = machineConfigs[machineId];
          mtconnectMachines.push({
            id: machineId,
            name: machineConfig?.name || machineId,
            ip: machineConfig?.ip || '192.168.1.100',
            port: machineConfig?.port || 5000,
            type: 'MTConnect',
            status: isOnline ? 'online' : 'offline',
            uuid: machineConfig?.uuid || 'unknown-uuid',
            spindles: machineConfig?.spindles || ['S1'],
            axes: machineConfig?.axes || ['X', 'Y', 'Z'],
            agentUrl: machineConfig?.agentUrl || `http://localhost:5000`,
            source: record.metadata.source,
            lastUpdate: lastUpdate.toISOString(),
            data: record.data
          });
        }
      }

      // Сортируем для стабильного отображения
      mtconnectMachines.sort((a, b) => a.id.localeCompare(b.id));
      adamMachines.sort((a, b) => a.id.localeCompare(b.id));

      const response = {
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
          mtconnectMachines: mtconnectMachines,
          adamMachines: adamMachines
        }
      };

      console.log(`✅ Возвращаю данные: ${response.summary.total} машин (${response.summary.mtconnect.online + response.summary.adam.online} online)`);
      console.log(`📊 MTConnect: ${response.summary.mtconnect.total} (${response.summary.mtconnect.online} online)`);
      console.log(`📊 ADAM: ${response.summary.adam.total} (${response.summary.adam.online} online)`);
      
      return response;

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
          mtconnectMachines: [],
          adamMachines: []
        }
      };
    }
  }
}
