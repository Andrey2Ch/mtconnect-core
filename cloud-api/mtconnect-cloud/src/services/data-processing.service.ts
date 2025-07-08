import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData } from '../schemas/machine-data.schema';
import { AggregatedData } from '../schemas/aggregated-data.schema';
import { DataEventsGateway } from '../gateways/data-events.gateway';
import { AlertingService } from './alerting.service';

@Injectable()
export class DataProcessingService {
  private readonly logger = new Logger(DataProcessingService.name);

  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineData>,
    @InjectModel(AggregatedData.name) private aggregatedDataModel: Model<AggregatedData>,
    private dataEventsGateway: DataEventsGateway, // Инжектируем WebSocket шлюз
    private alertingService: AlertingService, // Инжектируем сервис алертов
  ) {
    this.logger.log('DataProcessingService initialized with WebSocket and Alerting integration');
  }

  // Обработка входящих данных
  async processIncomingData(data: any): Promise<any> {
    this.logger.log(`Processing incoming data for machine: ${data.machineId}`);
    
    // Проверяем алерты на входящих данных
    this.alertingService.checkAlerts(data.machineId, data);
    
    // Отправляем real-time данные через WebSocket
    this.dataEventsGateway.sendMachineData(data.machineId, data);
    
    // Здесь можно добавить валидацию, трансформацию данных
    // Триггер для агрегации
    await this.triggerAggregation(data.machineId);
    
    return data;
  }

  // Агрегация данных по часам
  async aggregateHourlyData(machineId: string): Promise<void> {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    this.logger.log(`Aggregating hourly data for machine ${machineId} from ${hourStart} to ${hourEnd}`);

    const pipeline = [
      {
        $match: {
          machineId,
          timestamp: { $gte: hourStart, $lt: hourEnd }
        }
      },
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: '$data.temperature' },
          totalPartsProduced: { $sum: '$data.partsProduced' },
          maxSpindleSpeed: { $max: '$data.spindleSpeed' },
          minSpindleSpeed: { $min: '$data.spindleSpeed' },
          dataCount: { $sum: 1 }
        }
      }
    ];

    const result = await this.machineDataModel.aggregate(pipeline);
    
    if (result.length > 0) {
      const aggregatedData = {
        machineId,
        timestamp: hourStart,
        aggregationType: 'hourly',
        data: {
          avgTemperature: result[0].avgTemperature,
          totalPartsProduced: result[0].totalPartsProduced,
          maxSpindleSpeed: result[0].maxSpindleSpeed,
          minSpindleSpeed: result[0].minSpindleSpeed,
          dataPointsCount: result[0].dataCount
        }
      };

      await this.aggregatedDataModel.create(aggregatedData);
      
      // Отправляем агрегированные данные через WebSocket
      this.dataEventsGateway.sendAggregatedData(machineId, aggregatedData);
      
      this.logger.log(`Hourly aggregation completed for machine ${machineId}`);
    }
  }

  // Агрегация данных по дням
  async aggregateDailyData(machineId: string): Promise<void> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    this.logger.log(`Aggregating daily data for machine ${machineId} from ${dayStart} to ${dayEnd}`);

    const pipeline = [
      {
        $match: {
          machineId,
          timestamp: { $gte: dayStart, $lt: dayEnd }
        }
      },
      {
        $group: {
          _id: null,
          avgTemperature: { $avg: '$data.temperature' },
          totalPartsProduced: { $sum: '$data.partsProduced' },
          maxSpindleSpeed: { $max: '$data.spindleSpeed' },
          minSpindleSpeed: { $min: '$data.spindleSpeed' },
          avgSpindleSpeed: { $avg: '$data.spindleSpeed' },
          dataCount: { $sum: 1 }
        }
      }
    ];

    const result = await this.machineDataModel.aggregate(pipeline);
    
    if (result.length > 0) {
      const aggregatedData = {
        machineId,
        timestamp: dayStart,
        aggregationType: 'daily',
        data: {
          avgTemperature: result[0].avgTemperature,
          totalPartsProduced: result[0].totalPartsProduced,
          maxSpindleSpeed: result[0].maxSpindleSpeed,
          minSpindleSpeed: result[0].minSpindleSpeed,
          avgSpindleSpeed: result[0].avgSpindleSpeed,
          dataPointsCount: result[0].dataCount
        }
      };

      await this.aggregatedDataModel.create(aggregatedData);
      
      // Отправляем агрегированные данные через WebSocket
      this.dataEventsGateway.sendAggregatedData(machineId, aggregatedData);
      
      this.logger.log(`Daily aggregation completed for machine ${machineId}`);
    }
  }

  // Триггер агрегации
  private async triggerAggregation(machineId: string): Promise<void> {
    // Запускаем агрегацию асинхронно
    setImmediate(async () => {
      try {
        await this.aggregateHourlyData(machineId);
        // Ежедневную агрегацию запускаем только раз в час
        const now = new Date();
        if (now.getMinutes() === 0) {
          await this.aggregateDailyData(machineId);
        }
      } catch (error) {
        this.logger.error(`Aggregation failed for machine ${machineId}:`, error);
        
        // Отправляем ошибку через WebSocket
        this.dataEventsGateway.sendAlert(machineId, {
          type: 'aggregation-error',
          severity: 'warning',
          message: `Aggregation failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
} 