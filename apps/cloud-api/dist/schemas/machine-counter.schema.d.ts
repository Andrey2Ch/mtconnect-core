import { Document } from 'mongoose';
export type MachineCounterDocument = MachineCounter & Document;
export declare class MachineCounter {
    machineId: string;
    timestamp: Date;
    partCount: number;
    cycleTimeSec?: number;
}
export declare const MachineCounterSchema: any;
