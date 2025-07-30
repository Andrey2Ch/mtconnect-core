import { Controller, Post, Delete, Body, Logger, Injectable, Param } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';

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
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>
  ) {}

  @Post('/data')
  async receiveData(@Body() payload: MachineDataPayload | MachineDataPayload[]) {
    try {
      const dataArray = Array.isArray(payload) ? payload : [payload];
      
      this.logger.log(`📡 Получены данные от Edge Gateway: ${dataArray.length} записей`);
      
      // Логируем каждую запись для отладки
      dataArray.forEach((item) => {
        this.logger.log(`🔧 ${item.metadata.machineId}: partCount=${item.data.partCount}, program=${item.data.program}, status=${item.data.executionStatus}`);
      });

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

  @Delete('/test-machines')
  async deleteTestMachines() {
    try {
      this.logger.warn('🗑️ Удаляем тестовые машины из MongoDB...');
      
      // Удаляем тестовые машины
      const testMachineIds = ['TEST-MACHINE', 'ISOLATION-TEST'];
      const result = await this.machineDataModel.deleteMany({
        'metadata.machineId': { $in: testMachineIds }
      });
      
      this.logger.log(`✅ Удалено ${result.deletedCount} записей тестовых машин`);
      
      return {
        success: true,
        message: `Deleted ${result.deletedCount} test machine records`,
        deletedMachineIds: testMachineIds,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error(`❌ Ошибка удаления тестовых машин: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 