import { Controller, Get, Post, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineConfiguration } from '../schemas/machine-configuration.schema';
import { MachineState } from '../schemas/machine-state.schema';
import { MachineData } from '../schemas/machine-data.schema';
import { AggregatedData } from '../schemas/aggregated-data.schema';

@Controller('api/test')
export class TestDatabaseController {
  constructor(
    @InjectModel(MachineConfiguration.name) private machineConfigModel: Model<MachineConfiguration>,
    @InjectModel(MachineState.name) private machineStateModel: Model<MachineState>,
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineData>,
    @InjectModel(AggregatedData.name) private aggregatedDataModel: Model<AggregatedData>,
  ) {}

  // Machine Configuration Tests
  @Post('machine-config')
  async createMachineConfig(@Body() configData: any) {
    try {
      const config = new this.machineConfigModel(configData);
      await config.save();
      return {
        success: true,
        message: 'Machine Configuration создана успешно',
        data: config,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка создания Machine Configuration',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('machine-config/:machineId')
  async getMachineConfig(@Param('machineId') machineId: string) {
    try {
      const config = await this.machineConfigModel.findOne({ machineId });
      if (!config) {
        throw new HttpException('Machine Configuration не найдена', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        data: config,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка получения Machine Configuration',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Machine State Tests
  @Post('machine-state')
  async createMachineState(@Body() stateData: any) {
    try {
      const state = new this.machineStateModel(stateData);
      await state.save();
      return {
        success: true,
        message: 'Machine State создан успешно',
        data: state,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка создания Machine State',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('machine-state/:machineId')
  async getMachineState(@Param('machineId') machineId: string) {
    try {
      const state = await this.machineStateModel.findOne({ machineId });
      if (!state) {
        throw new HttpException('Machine State не найдено', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        data: state,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка получения Machine State',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Machine Data Tests (TimeSeries)
  @Post('machine-data')
  async createMachineData(@Body() machineDataBody: any) {
    try {
      const data = new this.machineDataModel(machineDataBody);
      await data.save();
      return {
        success: true,
        message: 'Machine Data (TimeSeries) создан успешно',
        data: data,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка создания Machine Data',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('machine-data/:machineId')
  async getMachineData(@Param('machineId') machineId: string) {
    try {
      const data = await this.machineDataModel
        .find({ 'metadata.machineId': machineId })
        .sort({ timestamp: -1 })
        .limit(10);
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка получения Machine Data',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Aggregated Data Tests
  @Post('aggregated-data')
  async createAggregatedData(@Body() aggregatedDataBody: any) {
    try {
      const data = new this.aggregatedDataModel(aggregatedDataBody);
      await data.save();
      return {
        success: true,
        message: 'Aggregated Data создан успешно',
        data: data,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка создания Aggregated Data',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('aggregated-data/:machineId')
  async getAggregatedData(@Param('machineId') machineId: string) {
    try {
      const data = await this.aggregatedDataModel
        .find({ 'metadata.machineId': machineId })
        .sort({ timestamp: -1 })
        .limit(10);
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка получения Aggregated Data',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Общий статус всех схем
  @Get('database-status')
  async getDatabaseStatus() {
    try {
      const [configCount, stateCount, dataCount, aggregatedCount] = await Promise.all([
        this.machineConfigModel.countDocuments(),
        this.machineStateModel.countDocuments(),
        this.machineDataModel.countDocuments(),
        this.aggregatedDataModel.countDocuments(),
      ]);

      return {
        success: true,
        message: 'Database Status',
        data: {
          machine_configurations: configCount,
          machine_states: stateCount,
          machine_data: dataCount,
          aggregated_data: aggregatedCount,
          total_documents: configCount + stateCount + dataCount + aggregatedCount,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Ошибка получения статуса базы данных',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
} 