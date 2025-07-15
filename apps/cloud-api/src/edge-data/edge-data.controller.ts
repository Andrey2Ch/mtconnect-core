import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';

@Controller('api/machine-data')
export class EdgeDataController {
  private readonly logger = new Logger(EdgeDataController.name);

  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>,
  ) {}

  @Post('batch')
  async receiveBatchData(@Body() batchData: any) {
    this.logger.log('🔍 ПОЛУЧЕН BATCH ЗАПРОС:', {
      source: batchData.source,
      edgeGatewayId: batchData.edgeGatewayId,
      timestamp: batchData.timestamp,
      updatesCount: batchData.updates?.length || 0
    });

    if (!batchData.updates || !Array.isArray(batchData.updates)) {
      this.logger.error('❌ Неверный формат данных - отсутствует массив updates');
      return { success: false, message: 'Invalid data format' };
    }

    const { source: batchSource, edgeGatewayId, timestamp: batchTimestamp, updates } = batchData;

    this.logger.log(`📦 Обработка batch данных от источника: ${batchSource} (${updates.length} записей)`);

    const documentsToInsert = updates.map((update, index) => {
      const { machineId, status, timestamp: machineTimestamp, data, error } = update;
      
      this.logger.log(`📋 Запись ${index + 1}/${updates.length}: machineId=${machineId}, status=${status}, hasData=${!!data}`);
      
      if (!machineId) {
        this.logger.warn(`⚠️ Пропуск записи ${index + 1} - отсутствует machineId`);
        return null;
      }

      // --- Исправленная логика определения типа машины ---
      let machineType: 'mtconnect' | 'adam' | 'manual' | 'calculated';

      // Определяем тип по источнику batch данных
      if (batchSource === 'mtconnect-gateway') {
        machineType = 'mtconnect';
      } else if (batchSource === 'adam-gateway') {
        machineType = 'adam';
      } else {
        // Fallback на старую логику для совместимости
        if (status && ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'].includes(status.toUpperCase())) {
          machineType = 'mtconnect';
        } else {
          machineType = 'adam';
        }
      }

      this.logger.log(`  - Обработка ID: ${machineId}. Определен тип: '${machineType}' (статус: '${status}')`);
      
      const doc: Partial<MachineData> = {
        timestamp: machineTimestamp ? new Date(machineTimestamp) : new Date(batchTimestamp || Date.now()),
        metadata: {
          edgeGatewayId: batchSource || 'unknown-gateway',
          machineId: machineId,
          machineName: machineId,
          dataType: machineType === 'adam' ? 'adam' : 'production',
          source: machineType,
        },
        data: data || {},
      };

      if (machineType === 'mtconnect' && status) {
        doc.data.executionStatus = status;
      }

      if (machineType === 'adam' && status) {
        if (!doc.data.adamData) {
            doc.data.adamData = {};
        }
        doc.data.adamData.connectionStatus = status;
      }
      
      this.logger.log(`  - Создан документ для записи: ${JSON.stringify(doc, null, 2)}`);
      
      return doc;
    }).filter(doc => doc !== null);

    if (documentsToInsert.length === 0) {
        this.logger.log("❌ Нет данных для вставки после фильтрации.");
        return { success: true, message: "Нет данных для обработки после фильтрации." };
    }

    this.logger.log(`📥 Попытка вставить ${documentsToInsert.length} записей в MongoDB...`);

    try {
      const result = await this.machineDataModel.insertMany(documentsToInsert);
      this.logger.log(`✅ Успешно вставлено ${result.length} записей в MongoDB`);
      return { success: true, message: `Inserted ${result.length} records` };
    } catch (error) {
      this.logger.error(`❌ Ошибка при вставке данных в MongoDB:`, error);
      return { success: false, message: error.message };
    }
  }
} 