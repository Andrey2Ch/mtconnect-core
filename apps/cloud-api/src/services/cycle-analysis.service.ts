import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MachineData, MachineDataDocument } from '../schemas/machine-data.schema';

export interface CycleInfo {
  startTime: Date;
  endTime: Date;
  duration: number; // в секундах
  machineId: string;
}

@Injectable()
export class CycleAnalysisService {
  constructor(
    @InjectModel(MachineData.name) private machineDataModel: Model<MachineDataDocument>,
  ) {}

  async analyzeCycles(machineId: string, from: Date, to: Date): Promise<CycleInfo[]> {
    console.log(`[CycleAnalysisService] Starting cycle analysis for machineId: ${machineId} from ${from.toISOString()} to ${to.toISOString()}`);

    try {
      const query = {
        'metadata.machineId': machineId,
        timestamp: { $gte: from, $lte: to },
      };
      const data = await this.machineDataModel.find(query).sort({ timestamp: 'asc' });

      console.log(`[CycleAnalysisService] Found ${data.length} records for ${machineId} in the given time range.`);

      const cycles: CycleInfo[] = [];
      let cycleStartTime: Date | null = null;
      let lastPartCount: number | null = null;

      for (const entry of data) {
        const { executionStatus, partCount } = entry.data;
        const timestamp = entry.timestamp;

        // Инициализация начального количества деталей
        if (lastPartCount === null && partCount !== undefined) {
          lastPartCount = partCount;
          console.log(`[CycleAnalysisService] Initial part count for ${machineId}: ${lastPartCount}`);
        }

        // Начало цикла: станок переходит в активное состояние
        if (executionStatus === 'ACTIVE' && !cycleStartTime) {
          cycleStartTime = timestamp;
          console.log(`[CycleAnalysisService] Cycle started for ${machineId} at ${timestamp.toISOString()}`);
        }
        
        // Конец цикла: количество деталей увеличилось, и цикл был начат
        if (partCount > lastPartCount && cycleStartTime) {
          const cycle: CycleInfo = {
            startTime: cycleStartTime,
            endTime: timestamp,
            duration: (timestamp.getTime() - cycleStartTime.getTime()) / 1000,
            machineId: machineId,
          };
          cycles.push(cycle);
          console.log(`[CycleAnalysisService] Cycle ended for ${machineId}. Duration: ${cycle.duration}s. Total cycles found: ${cycles.length}`);

          // Сброс для следующего цикла
          cycleStartTime = null; 
          lastPartCount = partCount;
        }
      }

      console.log(`[CycleAnalysisService] Finished analysis for ${machineId}. Total cycles found: ${cycles.length}`);
      return cycles;
    } catch (error) {
      console.error(`[CycleAnalysisService] Error analyzing cycles for ${machineId}:`, error);
      return [];
    }
  }
}
