import { Controller, Post, Body, Get, Param, Query, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';
import { EdgeGatewayDataDto } from '../dto/edge-gateway-data.dto';

@Controller('api/ext')
export class ExternalApiController {
  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>
  ) {}

  @Post('setup')
  async setup(@Body() body: { edgeGatewayId: string; machines: string[] }) {
    // Idempotency: проверяем существование
    const existing = await this.machineDataModel.findOne({
      'metadata.edgeGatewayId': body.edgeGatewayId
    });

    if (existing) {
      return { 
        status: 'exists', 
        edgeGatewayId: body.edgeGatewayId,
        machineCount: body.machines.length 
      };
    }

    // Создаём начальную запись
    const setupData = new this.machineDataModel({
      timestamp: new Date(),
      metadata: {
        edgeGatewayId: body.edgeGatewayId,
        machineId: 'setup',
        machineName: 'Gateway Setup'
      },
      data: {
        setup: true,
        machines: body.machines
      }
    });

    await setupData.save();

    return { 
      status: 'created', 
      edgeGatewayId: body.edgeGatewayId,
      machineCount: body.machines.length 
    };
  }

  @Post('data')
  async receiveData(@Body() edgeData: EdgeGatewayDataDto) {
    try {
      const documents = edgeData.data.map(item => ({
        timestamp: new Date(item.timestamp),
        metadata: {
          edgeGatewayId: edgeData.edgeGatewayId,
          machineId: item.machineId,
          machineName: item.machineName
        },
        data: item.data
      }));

      const result = await this.machineDataModel.insertMany(documents);
      
      return {
        status: 'success',
        received: edgeData.data.length,
        saved: result.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('event')
  async receiveEvent(@Body() event: { 
    machineId: string; 
    eventType: string; 
    timestamp: string; 
    data: any 
  }) {
    const eventData = new this.machineDataModel({
      timestamp: new Date(event.timestamp),
      metadata: {
        edgeGatewayId: 'external-event',
        machineId: event.machineId,
        machineName: event.machineId
      },
      data: {
        eventType: event.eventType,
        eventData: event.data
      }
    });

    await eventData.save();

    return { 
      status: 'received', 
      eventId: eventData._id,
      timestamp: new Date().toISOString()
    };
  }

  @Get('machines/:id/cycle-time')
  async getCycleTime(
    @Param('id') machineId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const query: any = { 'metadata.machineId': machineId };
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const data = await this.machineDataModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(100)
      .exec();

    const cycleTimeData = data
      .filter(item => item.data.cycleTime !== undefined)
      .map(item => ({
        timestamp: item.timestamp,
        cycleTime: item.data.cycleTime!,
        partCount: item.data.partCount
      }));

    return {
      machineId,
      totalRecords: cycleTimeData.length,
      averageCycleTime: cycleTimeData.length > 0 
        ? cycleTimeData.reduce((sum, item) => sum + item.cycleTime, 0) / cycleTimeData.length
        : null,
      data: cycleTimeData
    };
  }

  @Get('health')
  async healthCheck() {
    try {
      const dbStatus = await this.machineDataModel.db.db?.admin().ping();
      const recentData = await this.machineDataModel.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 60000) } // последняя минута
      });

      return {
        status: 'ok',
        database: dbStatus ? 'connected' : 'disconnected',
        recentData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
} 