import { Controller, Post, Body, Logger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';
import { MachineStatesCacheService } from '../services/machine-states-cache.service';

interface MachineDataPayload {
  timestamp: string;
  metadata: {
    edgeGatewayId: string;
    machineId: string;
    machineName: string;
    machineType: string;
  };
  data: {
    partCount?: number;
    program?: string;
    cycleTime?: number;
    cycleTimeConfidence?: string;
    executionStatus?: string;
    [key: string]: any;
  };
}

@Controller('api/ext')
export class ExternalApiController {
  private readonly logger = new Logger('ExternalAPI');
  
  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>,
    private machineStatesCacheService: MachineStatesCacheService
  ) {}

  @Post('/data')
  async receiveData(@Body() payload: MachineDataPayload | MachineDataPayload[]) {
    try {
      const dataArray = Array.isArray(payload) ? payload : [payload];
      
      this.logger.log(`📡 Получены данные от Edge Gateway: ${dataArray.length} записей`);
      
      // Логируем каждую запись для отладки
      dataArray.forEach((item) => {
        this.logger.log(`🔧 ${item.metadata.machineId}: partCount=${item.data.partCount}, program=${item.data.program}, status=${item.data.executionStatus}, idleTimeMinutes=${item.data.idleTimeMinutes}`);
        this.logger.log(`📊 ${item.metadata.machineId} FULL DATA:`, JSON.stringify(item.data));
      });

      // 💾 Обновляем кэш состояний машин напрямую
      await Promise.all(dataArray.map(async (item) => {
        const machineId = item.metadata.machineId;
        const currentPartCount = item.data.partCount || 0;
        const isActive = item.data.executionStatus === 'ACTIVE';
        
        // Обновляем состояние машины в MongoDB
        await this.machineStatesCacheService.saveOrUpdateMachineState(machineId, {
          idleTimeMinutes: item.data.idleTimeMinutes || 0,
          lastActiveTime: isActive ? item.timestamp : undefined,
          lastPartCount: currentPartCount
        });
      }));

      // Сохраняем в MongoDB
      const savedRecords = await this.machineDataModel.insertMany(dataArray);
      this.logger.log(`💾 Сохранено в MongoDB: ${savedRecords.length} записей`);
      
      return {
        success: true,
        message: `Processed ${dataArray.length} machine data records`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`❌ Ошибка обработки данных: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 