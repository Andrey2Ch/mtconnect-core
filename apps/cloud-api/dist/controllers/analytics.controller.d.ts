import { CycleAnalysisService, CycleInfo } from '../services/cycle-analysis.service';
import { MachineStateService, MachineState } from '../services/machine-state.service';
export declare class AnalyticsController {
    private readonly cycleAnalysisService;
    private readonly machineStateService;
    constructor(cycleAnalysisService: CycleAnalysisService, machineStateService: MachineStateService);
    getCycles(machineId: string, from: string, to: string): Promise<CycleInfo[]>;
    getMachineState(machineId: string, from: string, to: string): Promise<MachineState>;
}
