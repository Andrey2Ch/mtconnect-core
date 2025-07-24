import { Model } from 'mongoose';
import { MachineDataDocument } from '../schemas/machine-data.schema';
import { CycleAnalysisService } from './cycle-analysis.service';
export declare enum MachineStatus {
    Working = "\u0420\u0430\u0431\u043E\u0442\u0430",
    Idle = "\u041F\u0440\u043E\u0441\u0442\u043E\u0439",
    Error = "\u041E\u0448\u0438\u0431\u043A\u0430",
    Offline = "\u041D\u0435 \u0432 \u0441\u0435\u0442\u0438"
}
export interface MachineState {
    machineId: string;
    status: MachineStatus;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    details: any;
}
export declare class MachineStateService {
    private machineDataModel;
    private cycleAnalysisService;
    constructor(machineDataModel: Model<MachineDataDocument>, cycleAnalysisService: CycleAnalysisService);
    getMachineState(machineId: string, from: Date, to: Date): Promise<MachineState>;
}
