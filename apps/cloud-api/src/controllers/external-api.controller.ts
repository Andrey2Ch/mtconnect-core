import { Controller, Post, Body, Logger } from '@nestjs/common';

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

  @Post('/data')
  async receiveData(@Body() payload: MachineDataPayload | MachineDataPayload[]) {
    try {
      const dataArray = Array.isArray(payload) ? payload : [payload];
      
      this.logger.log(`📡 Получены данные от Edge Gateway: ${dataArray.length} записей`);
      
      // Логируем каждую запись для отладки
      dataArray.forEach((item) => {
        this.logger.log(`🔧 ${item.metadata.machineId}: partCount=${item.data.partCount}, program=${item.data.program}, status=${item.data.executionStatus}`);
      });

      // TODO: Сохранить в MongoDB
      // Пока просто логируем для тестирования
      
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