import { OnModuleInit } from '@nestjs/common';
import { MachineStatesCacheService } from './services/machine-states-cache.service';
export declare class AppService implements OnModuleInit {
    private machineStatesCacheService;
    private readonly logger;
    private machineStatesCache;
    constructor(machineStatesCacheService: MachineStatesCacheService);
    onModuleInit(): Promise<void>;
    private loadMachineStatesCache;
    private saveMachineStatesCache;
    getHello(): string;
    getMachineState(machineId: string): any;
    updateMachineState(machineId: string, updates: any): void;
    getProductionPartCount(machineId: string, currentPartCount: number): number;
}
