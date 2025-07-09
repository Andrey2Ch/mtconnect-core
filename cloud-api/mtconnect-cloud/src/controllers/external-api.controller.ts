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
      this.logger.log(`🔍 Data payload structure: ${JSON.stringify(data, null, 2).substring(0, 500)}...`, 'ExternalApiController');

      // Validate timestamp is not in the future
      const now = new Date();
      const dataTime = new Date(data.timestamp);
      if (dataTime > now) {
        this.logger.error(`❌ Timestamp validation failed: ${data.timestamp} is in the future`, 'ExternalApiController');
        throw new BadRequestException('Timestamp cannot be in the future');
      }

      // Check for duplicate machine IDs
      const machineIds = data.data.map(m => m.machineId);
      const uniqueIds = new Set(machineIds);
      if (machineIds.length !== uniqueIds.size) {
        this.logger.error(`❌ Duplicate machine IDs detected: ${JSON.stringify(machineIds)}`, 'ExternalApiController');
        throw new BadRequestException('Duplicate machine IDs detected');
      }

      this.logger.log(`✅ Basic validation passed for ${data.data.length} machines`, 'ExternalApiController');

      // Sanitize and prepare data for storage
      const sanitizedMachines = data.data.map(machine => {
        // Sanitize machine metadata
        const sanitizedMachineId = this.sanitizationService.sanitizeText(machine.machineId, 100);
        const sanitizedMachineName = this.sanitizationService.sanitizeText(machine.machineName, 255);
        
        if (!sanitizedMachineId || !sanitizedMachineName) {
          throw new BadRequestException(`Invalid machine data for machine: ${machine.machineId}`);
        }

        // Sanitize machine data payload
        const sanitizedData = this.sanitizationService.sanitizeMachineData(machine.data);

        return {
          timestamp: dataTime,
          metadata: {
            edgeGatewayId: this.sanitizationService.sanitizeText(data.edgeGatewayId, 100),
            machineId: sanitizedMachineId,
            machineName: sanitizedMachineName,
          },
          data: sanitizedData,
          createdAt: now
        };
      });

      // Bulk insert all machine data
      const result = await this.machineDataModel.insertMany(sanitizedMachines);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`Ingested ${result.length} machine records in ${processingTime}ms`, 'ExternalApiController');
      
      return { 
        status: 'success', 
        message: `Stored data for ${result.length} machines`,
        recordsProcessed: result.length,
        processingTimeMs: processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Data ingestion failed after ${processingTime}ms: ${error.message}`, error.stack, 'ExternalApiController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process machine data');
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