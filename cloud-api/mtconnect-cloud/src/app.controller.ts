import { Controller, Get, Post, Body } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { AppService } from './app.service';
import { MachineData, MachineDataDocument } from './schemas/machine-data.schema';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MachineData.name) private readonly machineDataModel: Model<MachineDataDocument>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const dbStatus = this.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        name: this.connection.db?.databaseName || 'unknown'
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }

  @Post('test-timeseries')
  async testTimeSeries() {
    const testData = new this.machineDataModel({
      timestamp: new Date(),
      metadata: {
        edgeGatewayId: 'test-gateway-01',
        machineId: 'XD-20',
        machineName: 'FANUC XD-20'
      },
      data: {
        partCount: 42,
        cycleTime: 125.5,
        executionStatus: 'ACTIVE',
        availability: 'AVAILABLE',
        program: 'O1234',
        block: 'N100',
        line: '15',
        adamData: {
          digitalInputs: [1, 0, 1, 1, 0, 0, 0, 0],
          digitalOutputs: [0, 1, 0, 0, 1, 1, 0, 0]
        }
      }
    });

    const saved = await testData.save();
    
    return {
      message: 'TimeSeries test data inserted successfully',
      id: saved._id,
      timestamp: saved.timestamp,
      collection: 'machine_data'
    };
  }

  @Get('test-query')
  async testQuery() {
    const count = await this.machineDataModel.countDocuments();
    const latest = await this.machineDataModel.findOne().sort({ timestamp: -1 });
    
    return {
      totalRecords: count,
      latestRecord: latest,
      collection: 'machine_data'
    };
  }
}
