import { Controller, Post, Body, Logger } from '@nestjs/common';

// Глобальный store для данных машин от Edge Gateway
const edgeDataStore = new Map<string, any>();

@Controller('api/machine-data')
export class EdgeDataController {
  private readonly logger = new Logger(EdgeDataController.name);

  @Post('batch')
  async receiveBatchData(@Body() batchData: any) {
    this.logger.log('Получены данные от Cloud Consumer');
    
    const { updates, source, timestamp } = batchData;
    
    if (!updates || !Array.isArray(updates)) {
      return { error: 'Неверный формат данных' };
    }
    
    // Обновляем данные машин в глобальном store
    for (const update of updates) {
      const { machineId, status, timestamp: machineTimestamp, data, error } = update;
      
      if (!machineId) continue;
      
      // Сохраняем данные машины
      edgeDataStore.set(machineId, {
        id: machineId,
        name: machineId,
        type: machineId.startsWith('M_') ? 'MTConnect' : 'ADAM',
        status,
        lastUpdate: machineTimestamp || new Date().toISOString(),
        data: data || {},
        error: error || null,
        source: 'Edge Gateway'
      });
      
      this.logger.log(`Обновлена машина ${machineId}: ${status}`);
    }
    
    return { 
      success: true, 
      processed: updates.length,
      timestamp: new Date().toISOString()
    };
  }

  // Эндпоинт для получения данных от Edge Gateway
  @Post('edge-data')
  getEdgeData() {
    return {
      timestamp: new Date().toISOString(),
      machines: Array.from(edgeDataStore.values()),
      total: edgeDataStore.size
    };
  }
} 