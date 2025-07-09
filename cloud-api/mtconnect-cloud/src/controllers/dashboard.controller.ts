import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  Res,
  HttpStatus, 
  HttpException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';
import { SanitizationService } from '../services/sanitization.service';
import { WinstonLoggerService } from '../services/winston-logger.service';
import * as path from 'path';

@Controller()
export class DashboardController {
  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>,
    private readonly logger: WinstonLoggerService,
    private readonly sanitizationService: SanitizationService,
  ) {}

  // Главная страница дашборда
  @Get('/')
  async serveDashboard(@Res() res: Response) {
    try {
      const dashboardPath = path.join(__dirname, '../../public/dashboard-pro.html');
      return res.sendFile(dashboardPath);
    } catch (error) {
      this.logger.error(`Failed to serve dashboard: ${error.message}`, error.stack, 'DashboardController');
      throw new InternalServerErrorException('Dashboard unavailable');
    }
  }

  // API: Получить список всех станков
  @Get('api/dashboard/machines')
  @Throttle({ short: { limit: 100, ttl: 60000 } })
  async getMachines() {
    try {
      this.logger.log('Fetching machine list', 'DashboardController');

      // Получаем уникальные станки за последние сутки
      const machines = await this.machineDataModel.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            machineName: { $last: '$metadata.machineName' },
            lastSeen: { $max: '$timestamp' },
            totalRecords: { $sum: 1 },
            lastStatus: { $last: '$data.executionStatus' },
            lastPartCount: { $last: '$data.partCount' },
            lastCycleTime: { $last: '$data.cycleTime' },
            lastProgram: { $last: '$data.program' }
          }
        },
        {
          $project: {
            machineId: '$_id',
            machineName: 1,
            lastSeen: 1,
            totalRecords: 1,
            lastStatus: 1,
            lastPartCount: 1,
            lastCycleTime: 1,
            lastProgram: 1,
            _id: 0
          }
        },
        { $sort: { machineId: 1 } }
      ]);

      return {
        status: 'success',
        count: machines.length,
        machines: machines
      };
    } catch (error) {
      this.logger.error(`Failed to fetch machines: ${error.message}`, error.stack, 'DashboardController');
      throw new InternalServerErrorException('Failed to fetch machine list');
    }
  }

  // API: Получить данные конкретного станка
  @Get('api/dashboard/data/:machineId')
  @Throttle({ short: { limit: 200, ttl: 60000 } })
  async getMachineData(
    @Param('machineId') machineId: string,
    @Query('hours') hours?: string
  ) {
    try {
      const sanitizedMachineId = this.sanitizationService.sanitizeText(machineId, 100);
      if (!sanitizedMachineId) {
        throw new BadRequestException('Invalid machine ID');
      }

      const hoursNum = parseInt(hours || '24', 10);
      if (hoursNum < 1 || hoursNum > 168) { // максимум неделя
        throw new BadRequestException('Hours must be between 1 and 168');
      }

      const fromDate = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

      this.logger.log(`Fetching data for machine ${sanitizedMachineId} for ${hoursNum} hours`, 'DashboardController');

      const data = await this.machineDataModel.find({
        'metadata.machineId': sanitizedMachineId,
        timestamp: { $gte: fromDate }
      })
      .select('timestamp data metadata.machineName')
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

      if (data.length === 0) {
        throw new NotFoundException(`No data found for machine ${sanitizedMachineId}`);
      }

      // Подготавливаем данные для фронтенда
      const processedData = data.map(record => ({
        timestamp: record.timestamp,
        machineName: record.metadata.machineName,
        partCount: record.data?.partCount || 0,
        cycleTime: record.data?.cycleTime || 0,
        executionStatus: record.data?.executionStatus || 'UNAVAILABLE',
        availability: record.data?.availability || 'UNAVAILABLE',
        program: record.data?.program || '',
        block: record.data?.block || '',
        line: record.data?.line || '',
        adamData: record.data?.adamData || {}
      }));

      return {
        status: 'success',
        machineId: sanitizedMachineId,
        recordCount: processedData.length,
        hoursRequested: hoursNum,
        data: processedData
      };
    } catch (error) {
      this.logger.error(`Failed to fetch machine data: ${error.message}`, error.stack, 'DashboardController');
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch machine data');
    }
  }

  // API: Общий статус системы
  @Get('api/dashboard/status')
  @Throttle({ short: { limit: 50, ttl: 60000 } })
  async getSystemStatus() {
    try {
      this.logger.log('Fetching system status', 'DashboardController');

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Общая статистика
      const [recentRecords, dailyRecords, machineCount] = await Promise.all([
        this.machineDataModel.countDocuments({ timestamp: { $gte: oneHourAgo } }),
        this.machineDataModel.countDocuments({ timestamp: { $gte: oneDayAgo } }),
        this.machineDataModel.distinct('metadata.machineId', { timestamp: { $gte: oneDayAgo } })
      ]);

      // Активные станки (с данными за последний час)
      const activeMachines = await this.machineDataModel.distinct('metadata.machineId', {
        timestamp: { $gte: oneHourAgo }
      });

      // Последние записи по каждому станку
      const lastRecords = await this.machineDataModel.aggregate([
        {
          $match: { timestamp: { $gte: oneDayAgo } }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            lastRecord: { $first: '$$ROOT' }
          }
        }
      ]);

      const machineStatuses = lastRecords.map(item => ({
        machineId: item._id,
        machineName: item.lastRecord.metadata.machineName,
        lastSeen: item.lastRecord.timestamp,
        status: item.lastRecord.data?.executionStatus || 'UNAVAILABLE',
        isActive: activeMachines.includes(item._id)
      }));

      return {
        status: 'success',
        timestamp: now,
        summary: {
          totalMachines: machineCount.length,
          activeMachines: activeMachines.length,
          recentRecords: recentRecords,
          dailyRecords: dailyRecords
        },
        machines: machineStatuses
      };
    } catch (error) {
      this.logger.error(`Failed to fetch system status: ${error.message}`, error.stack, 'DashboardController');
      throw new InternalServerErrorException('Failed to fetch system status');
    }
  }

  // API: Простая проверка здоровья для дашборда
  @Get('api/dashboard/health')
  async dashboardHealth() {
    try {
      const dbCheck = await this.machineDataModel.findOne().limit(1);
      return {
        status: 'healthy',
        timestamp: new Date(),
        database: dbCheck ? 'connected' : 'empty'
      };
    } catch (error) {
      this.logger.error(`Dashboard health check failed: ${error.message}`, error.stack, 'DashboardController');
      throw new InternalServerErrorException('Health check failed');
    }
  }

  // ===== СОВМЕСТИМОСТЬ СО СТАРЫМ ДАШБОРДОМ =====

  // Эмуляция /current endpoint (MTConnect XML данные)
  @Get('current')
  @Throttle({ short: { limit: 100, ttl: 60000 } })
  async getCurrentMTConnectData(@Res() res: Response) {
    try {
      this.logger.log('Serving current MTConnect data', 'DashboardController');

      // Получаем последние данные всех станков
      const recentData = await this.machineDataModel.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // последние 5 минут
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            latestRecord: { $first: '$$ROOT' }
          }
        }
      ]);

      // Генерируем XML в формате MTConnect
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:2.0" 
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xsi:schemaLocation="urn:mtconnect.org:MTConnectStreams:2.0 http://schemas.mtconnect.org/schemas/MTConnectStreams_2.0.xsd">
  <Header creationTime="${new Date().toISOString()}" sender="MTConnect Cloud API" instanceId="1" version="2.0.0.0" bufferSize="131072"/>
  <Streams>`;

      for (const item of recentData) {
        const record = item.latestRecord;
        const machineId = record.metadata.machineId;
        const machineName = record.metadata.machineName || machineId;
        
        xml += `
    <DeviceStream name="${machineName}" uuid="${machineId}" id="${machineId}">
      <ComponentStream component="Path" name="path" componentId="pth" id="pth">
        <Events>
          <Execution dataItemId="execution" timestamp="${record.timestamp.toISOString()}">${record.data?.executionStatus || 'UNAVAILABLE'}</Execution>
          <Program dataItemId="program" timestamp="${record.timestamp.toISOString()}">${record.data?.program || ''}</Program>
          <Block dataItemId="block" timestamp="${record.timestamp.toISOString()}">${record.data?.block || ''}</Block>
          <Line dataItemId="line" timestamp="${record.timestamp.toISOString()}">${record.data?.line || ''}</Line>
        </Events>
        <Samples>
          <PartCount dataItemId="partcount" timestamp="${record.timestamp.toISOString()}">${record.data?.partCount || 0}</PartCount>
          <CycleTime dataItemId="cycletime" timestamp="${record.timestamp.toISOString()}">${record.data?.cycleTime || 0}</CycleTime>
        </Samples>
      </ComponentStream>
    </DeviceStream>`;
      }

      xml += `
  </Streams>
</MTConnectStreams>`;

      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    } catch (error) {
      this.logger.error(`Failed to serve current data: ${error.message}`, error.stack, 'DashboardController');
      throw new InternalServerErrorException('Failed to serve current data');
    }
  }

  // Эмуляция /api/adam/counters endpoint
  @Get('api/adam/counters')
  @Throttle({ short: { limit: 100, ttl: 60000 } })
  async getAdamCounters() {
    try {
      this.logger.log('Serving Adam counters data', 'DashboardController');

      // Получаем последние Adam данные
      const adamData = await this.machineDataModel.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // последние 5 минут
            'data.adamData': { $exists: true, $ne: null }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            latestRecord: { $first: '$$ROOT' }
          }
        }
      ]);

      const counters = adamData.map(item => {
        const record = item.latestRecord;
        const adam = record.data.adamData || {};
        
        return {
          machineId: record.metadata.machineId,
          count: adam.partCount || record.data.partCount || 0,
          cycleTimeMs: (adam.cycleTime || record.data.cycleTime || 0) * 1000, // конвертируем в мс
          timestamp: record.timestamp
        };
      });

      return {
        status: 'success',
        counters: counters
      };
    } catch (error) {
      this.logger.error(`Failed to serve Adam counters: ${error.message}`, error.stack, 'DashboardController');
      return {
        error: error.message
      };
    }
  }

  // Эмуляция /status endpoint
  @Get('status')
  @Throttle({ short: { limit: 50, ttl: 60000 } })
  async getStatus() {
    try {
      this.logger.log('Serving status data', 'DashboardController');

      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      // Получаем статус всех станков
      const machines = await this.machineDataModel.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$metadata.machineId',
            latestRecord: { $first: '$$ROOT' }
          }
        }
      ]);

      const mtconnectAgents = machines.map(item => {
        const record = item.latestRecord;
        const isRecent = record.timestamp >= oneMinuteAgo;
        
        return {
          id: record.metadata.machineId,
          name: record.metadata.machineName || record.metadata.machineId,
          status: isRecent ? 'OK' : 'TIMEOUT',
          lastSeen: record.timestamp,
          error: isRecent ? null : 'No recent data'
        };
      });

      return {
        status: 'OK',
        timestamp: new Date(),
        mtconnectAgents: mtconnectAgents,
        totalAgents: mtconnectAgents.length,
        onlineAgents: mtconnectAgents.filter(a => a.status === 'OK').length
      };
    } catch (error) {
      this.logger.error(`Failed to serve status: ${error.message}`, error.stack, 'DashboardController');
      throw new InternalServerErrorException('Failed to serve status');
    }
  }
} 