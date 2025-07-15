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
    this.logger.log(`📬 ПОЛУЧЕН ПОЛНЫЙ PAYLOAD: ${JSON.stringify(batchData, null, 2)}`);

    const { updates, source: batchSource, timestamp: batchTimestamp } = batchData;

    this.logger.log(`📥 Получен batch. Источник: ${batchSource}, Записей: ${updates?.length || 0}`);
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      this.logger.warn('Получен неверный формат данных или пустой массив обновлений.');
      return { error: 'Неверный формат данных или пустой массив обновлений' };
    }
    
    const documentsToInsert: Partial<MachineData>[] = updates.map(update => {
      const { machineId, status, timestamp: machineTimestamp, data, error } = update;
      
      if (!machineId) return null;

      // Теперь мы доверяем источнику, который приходит в пакете
      const machineType = batchSource === 'mtconnect-gateway' ? 'mtconnect' : 'adam';
      this.logger.log(`  - Обработка ID: ${machineId}. Определен тип: '${machineType}' (источник пакета: '${batchSource}')`);
      
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
      
      return doc;
    }).filter(doc => doc !== null);

    if (documentsToInsert.length === 0) {
        this.logger.log("Нет данных для вставки после фильтрации.");
        return { success: true, message: "Нет данных для обработки после фильтрации." };
    }

    try {
      await this.machineDataModel.insertMany(documentsToInsert);
      this.logger.log(`✅ Успешно вставлено ${documentsToInsert.length} записей в MongoDB.`);
      return { 
        success: true, 
        processed: documentsToInsert.length,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      this.logger.error('❌ Ошибка при вставке данных в MongoDB', e.stack);
      return { error: 'Ошибка сервера при сохранении данных' };
    }
  }
} 