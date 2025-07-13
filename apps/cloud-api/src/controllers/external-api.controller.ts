import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  HttpStatus, 
  HttpException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Throttle } from '@nestjs/throttler';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';
import { EdgeGatewayDataDto } from '../dto/edge-gateway-data.dto';
import { SanitizationService } from '../services/sanitization.service';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { MetricsService } from '../services/metrics.service';

@Controller('api/ext')
export class ExternalApiController {
  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>,
    private readonly logger: WinstonLoggerService,
    private readonly sanitizationService: SanitizationService,
    private readonly metricsService: MetricsService,
  ) {}

  @Post('setup')
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 requests per minute for setup
  async setup(@Body() body: { edgeGatewayId: string; machines: string[] }) {
    try {
      this.logger.log(`Setup request for gateway: ${body.edgeGatewayId}`, 'ExternalApiController');
      
      // Sanitize input data
      const sanitizedGatewayId = this.sanitizationService.sanitizeText(body.edgeGatewayId, 100);
      const sanitizedMachines = body.machines?.map(machine => 
        this.sanitizationService.sanitizeText(machine, 100)
      ).filter(machine => machine.length > 0) || [];

      if (!sanitizedGatewayId) {
        throw new BadRequestException('Invalid gateway ID provided');
      }

      if (sanitizedMachines.length === 0) {
        throw new BadRequestException('At least one valid machine must be provided');
      }

      // Log setup configuration
      this.logger.log(`Setting up gateway ${sanitizedGatewayId} with ${sanitizedMachines.length} machines`, 'ExternalApiController');
      
      return { 
        status: 'success', 
        message: 'Edge Gateway configured successfully',
        gatewayId: sanitizedGatewayId,
        machineCount: sanitizedMachines.length
      };
    } catch (error) {
      this.logger.error(`Setup failed: ${error.message}`, error.stack, 'ExternalApiController');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to configure edge gateway');
    }
  }

  @Post('data')
  @Throttle({ short: { limit: 200, ttl: 60000 } }) // 200 requests per minute for critical data
  async ingestData(@Body() data: EdgeGatewayDataDto) {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🔍 Data ingestion from gateway: ${data.edgeGatewayId}`, 'ExternalApiController');
      
      // Логируем только первые 800 символов для избежания переполнения
      const payloadPreview = JSON.stringify(data, null, 2);
      this.logger.log(`🔍 Payload preview: ${payloadPreview.substring(0, 800)}...`, 'ExternalApiController');

      // Проверяем дублированные machine ID
      const machineIds = data.data.map(item => item.machineId);
      const uniqueMachineIds = [...new Set(machineIds)];
      
      if (machineIds.length !== uniqueMachineIds.length) {
        this.logger.error(`❌ Duplicate machine IDs detected in payload:`, 'ExternalApiController');
        this.logger.error(`All IDs: ${machineIds.join(', ')}`, 'ExternalApiController');
        this.logger.error(`Unique IDs: ${uniqueMachineIds.join(', ')}`, 'ExternalApiController');
        throw new BadRequestException('Duplicate machine IDs detected');
      }

      // Детальное логирование для Adam данных
      for (const machine of data.data) {
        this.logger.log(`🔍 Processing machine: ${machine.machineId}`, 'ExternalApiController');
        
        if (machine.data.adamData) {
          this.logger.log(`📊 Adam data found for ${machine.machineId}:`, 'ExternalApiController');
          this.logger.log(`📊 Adam analogData: ${JSON.stringify(machine.data.adamData.analogData)}`, 'ExternalApiController');
          
          // Валидация analogData
          if (machine.data.adamData.analogData) {
            for (const [key, value] of Object.entries(machine.data.adamData.analogData)) {
              if (typeof value !== 'number') {
                this.logger.error(`❌ Invalid analogData value for ${machine.machineId}.${key}: ${value} (type: ${typeof value})`, 'ExternalApiController');
                throw new BadRequestException(`Invalid analogData value for ${machine.machineId}.${key}: expected number, got ${typeof value}`);
              }
            }
          }
        }
      }

      // Validate timestamp is not in the future
      const now = new Date();
      const dataTime = new Date(data.timestamp);
      if (dataTime > now) {
        this.logger.error(`❌ Timestamp validation failed: ${data.timestamp} is in the future`, 'ExternalApiController');
        throw new BadRequestException('Timestamp cannot be in the future');
      }
      
      this.logger.log(`✅ Basic validation passed for ${data.data.length} machines`, 'ExternalApiController');
      
      // Attempt to process the data
      this.logger.log(`🔄 Starting data processing...`, 'ExternalApiController');
      
      // Sanitize and prepare data for storage
      const sanitizedMachines = data.data.map(machine => {
        // Логируем ИСХОДНЫЕ данные
        if (machine.data.adamData) {
          this.logger.log(`🔍 BEFORE sanitization for ${machine.machineId}:`, 'ExternalApiController');
          this.logger.log(`📊 Original adamData: ${JSON.stringify(machine.data.adamData)}`, 'ExternalApiController');
        }
        
        // Sanitize machine metadata
        const sanitizedMachineId = this.sanitizationService.sanitizeText(machine.machineId, 100);
        const sanitizedMachineName = this.sanitizationService.sanitizeText(machine.machineName, 255);
        
        if (!sanitizedMachineId || !sanitizedMachineName) {
          throw new BadRequestException(`Invalid machine data for machine: ${machine.machineId}`);
        }

        // Sanitize machine data payload
        const sanitizedData = this.sanitizationService.sanitizeMachineData(machine.data);
        
        // Логируем САНИТИЗИРОВАННЫЕ данные  
        if (sanitizedData.adamData) {
          this.logger.log(`🔍 AFTER sanitization for ${machine.machineId}:`, 'ExternalApiController');
          this.logger.log(`📊 Sanitized adamData: ${JSON.stringify(sanitizedData.adamData)}`, 'ExternalApiController');
          
          // Проверяем типы данных ПОСЛЕ санитизации
          if (sanitizedData.adamData.analogData) {
            this.logger.log(`🔍 Checking data types AFTER sanitization:`, 'ExternalApiController');
            for (const [key, value] of Object.entries(sanitizedData.adamData.analogData)) {
              this.logger.log(`📊 ${key}: ${value} (type: ${typeof value})`, 'ExternalApiController');
              if (typeof value !== 'number') {
                this.logger.error(`❌ TYPE ERROR after sanitization: ${machine.machineId}.${key} = ${value} (${typeof value})`, 'ExternalApiController');
              }
            }
          }
        }

        return {
          timestamp: dataTime,
          metadata: {
            edgeGatewayId: this.sanitizationService.sanitizeText(data.edgeGatewayId, 100),
            machineId: sanitizedMachineId,
            machineName: sanitizedMachineName,
            dataType: 'production',
            source: 'mtconnect'
          },
          data: sanitizedData,
          createdAt: now
        };
      });

      // Bulk insert all machine data
      this.logger.log(`💾 Attempting to save ${sanitizedMachines.length} records to database...`, 'ExternalApiController');
      const result = await this.machineDataModel.insertMany(sanitizedMachines);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Data processing completed in ${processingTime}ms`, 'ExternalApiController');
      
      return {
        success: true,
        message: 'Data ingested successfully',
        processedCount: result.length,
        processingTime: processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Data ingestion failed after ${processingTime}ms:`, error.stack, 'ExternalApiController');
      
      // Логируем детали ошибки
      if (error.message) {
        this.logger.error(`💬 Error message: ${error.message}`, 'ExternalApiController');
      }
      
      if (error.name) {
        this.logger.error(`🏷️ Error name: ${error.name}`, 'ExternalApiController');
      }
      
      throw error;
    }
  }

  @Post('event')
  @Throttle({ short: { limit: 50, ttl: 60000 } }) // 50 requests per minute for events
  async handleEvent(@Body() eventData: any) {
    try {
      this.logger.log(`Event received: ${JSON.stringify(eventData)}`, 'ExternalApiController');
      
      // Sanitize event data
      const sanitizedEvent = {
        type: this.sanitizationService.sanitizeText(eventData.type, 50),
        message: this.sanitizationService.sanitizeText(eventData.message, 1000),
        source: this.sanitizationService.sanitizeText(eventData.source, 100),
        timestamp: new Date(eventData.timestamp || Date.now()),
        data: this.sanitizationService.sanitizeAdamData(eventData.data)
      };

      // Here you would typically store or process the sanitized event
      // For now, just log and acknowledge
      
      return { 
        status: 'success', 
        message: 'Event processed successfully',
        eventType: sanitizedEvent.type
      };
    } catch (error) {
      this.logger.error(`Event processing failed: ${error.message}`, error.stack, 'ExternalApiController');
      throw new InternalServerErrorException('Failed to process event');
    }
  }

  @Get('machines/:id/cycle-time')
  @Throttle({ short: { limit: 100, ttl: 60000 } }) // 100 requests per minute for analytics
  async getCycleTime(
    @Param('id') machineId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    try {
      // Sanitize input parameters
      const sanitizedMachineId = this.sanitizationService.sanitizeText(machineId, 100);
      if (!sanitizedMachineId) {
        throw new BadRequestException('Invalid machine ID');
      }

      const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to) : new Date();

      if (fromDate >= toDate) {
        throw new BadRequestException('From date must be before to date');
      }

      this.logger.log(`Fetching cycle time for machine ${sanitizedMachineId} from ${fromDate} to ${toDate}`, 'ExternalApiController');

      const data = await this.machineDataModel.find({
        'metadata.machineId': sanitizedMachineId,
        timestamp: { $gte: fromDate, $lte: toDate },
        'data.cycleTime': { $exists: true, $ne: null }
      })
      .select('timestamp data.cycleTime')
      .sort({ timestamp: 1 })
      .limit(1000)
      .exec();

      if (data.length === 0) {
        throw new NotFoundException(`No cycle time data found for machine ${sanitizedMachineId}`);
      }

      const cycleTimes = data.map(d => ({
        timestamp: d.timestamp,
        cycleTime: d.data.cycleTime
      }));

      const avgCycleTime = cycleTimes.reduce((sum, item) => sum + item.cycleTime, 0) / cycleTimes.length;

      return {
        machineId: sanitizedMachineId,
        period: { from: fromDate, to: toDate },
        averageCycleTime: Math.round(avgCycleTime * 100) / 100,
        dataPoints: cycleTimes.length,
        data: cycleTimes
      };
    } catch (error) {
      this.logger.error(`Cycle time query failed: ${error.message}`, error.stack, 'ExternalApiController');
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve cycle time data');
    }
  }

  @Get('health')
  @Throttle({ short: { limit: 60, ttl: 60000 } }) // 60 requests per minute for health checks
  async healthCheck() {
    try {
      // Simple health check with database ping
      const dbStats = await this.machineDataModel.db.db.admin().ping();
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        database: 'connected',
        version: '1.0.0'
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack, 'ExternalApiController');
      throw new InternalServerErrorException('Service health check failed');
    }
  }
} 