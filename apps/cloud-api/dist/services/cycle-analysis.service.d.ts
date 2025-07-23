import { Model } from 'mongoose';
import { MachineDataDocument } from '../schemas/machine-data.schema';
export interface CycleInfo {
    startTime: Date;
    endTime: Date;
    duration: number;
    machineId: string;
}
export declare class CycleAnalysisService {
    private machineDataModel;
    constructor(machineDataModel: Model<MachineDataDocument>);
    analyzeCycles(machineId: string, from: Date, to: Date): Promise<CycleInfo[]>;
}
