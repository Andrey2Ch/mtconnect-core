import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';
import { CycleAnalysisService } from './cycle-analysis.service';

export enum MachineStatus {
  Working = 'Работа',
  Idle = 'Простой',
  Error = 'Ошибка',
  Offline = 'Не в сети',
}

export interface MachineState {
  machineId: string;
  status: MachineStatus;
  oee: number; // Overall Equipment Effectiveness in %
  availability: number; // %
  performance: number; // %
  quality: number; // %
  details: any;
}

const IDEAL_CYCLE_TIME_SECONDS = 25 * 60; // Пример: 25 минут
const PLANNED_WORKING_TIME_SECONDS = 8 * 60 * 60; // 8 часов

@Injectable()
export class MachineStateService {
  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>,
    private cycleAnalysisService: CycleAnalysisService,
  ) {}

  async getMachineState(machineId: string, from: Date, to: Date): Promise<MachineState> {
    const cycles = await this.cycleAnalysisService.analyzeCycles(machineId, from, to);
    
    const totalProductionTime = cycles.reduce((sum, cycle) => sum + cycle.duration, 0);
    const partCount = cycles.length;

    const availability = (totalProductionTime / PLANNED_WORKING_TIME_SECONDS) * 100;
    const performance = ((partCount * IDEAL_CYCLE_TIME_SECONDS) / totalProductionTime) * 100;
    const quality = 100; // Предполагаем 100% качество
    const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

    const lastRecord = await this.machineDataModel.findOne({ 'metadata.machineId': machineId }).sort({ timestamp: -1 });
    let currentStatus = MachineStatus.Offline;

    if (lastRecord) {
        const timeDiff = new Date().getTime() - lastRecord.timestamp.getTime();
        if (timeDiff > 5 * 60 * 1000) { // 5 минут
            currentStatus = MachineStatus.Offline;
        } else {
            switch(lastRecord.data.executionStatus) {
                case 'ACTIVE':
                    currentStatus = MachineStatus.Working;
                    break;
                case 'READY':
                case 'STOPPED':
                case 'FEED_HOLD':
                    currentStatus = MachineStatus.Idle;
                    break;
                case 'UNAVAILABLE':
                case 'INTERRUPTED':
                    currentStatus = MachineStatus.Error;
                    break;
                default:
                    currentStatus = MachineStatus.Offline;
            }
        }
    }

    return {
      machineId,
      status: currentStatus,
      oee: isNaN(oee) ? 0 : oee,
      availability: isNaN(availability) ? 0 : availability,
      performance: isNaN(performance) ? 0 : performance,
      quality,
      details: {
        totalProductionTime,
        partCount,
        cyclesFound: cycles.length,
      },
    };
  }
}
