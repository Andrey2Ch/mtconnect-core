import { Document } from 'mongoose';
export type MachineStateDocument = MachineState & Document;
export declare class MachineState {
    machineId: string;
    machineName: string;
    edgeGatewayId: string;
    executionStatus: string;
    availability: string;
    partCount: number;
    lastCycleTime?: number;
    averageCycleTime?: number;
    totalCycleCount: number;
    currentProgram?: string;
    currentBlock?: string;
    currentLine?: string;
    adamData?: {
        digitalInputs?: boolean[];
        digitalOutputs?: boolean[];
        connectionStatus?: string;
        lastAdamUpdate?: Date;
    };
    activeAlarms: Array<{
        code: string;
        message: string;
        severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        timestamp: Date;
        acknowledged: boolean;
    }>;
    performance?: {
        utilizationPercent?: number;
        efficiencyPercent?: number;
        oeePercent?: number;
        plannedProductionTime?: number;
        actualProductionTime?: number;
        downtimeMinutes?: number;
    };
    lastDataUpdate: Date;
    lastStatusChange: Date;
    connectionLostAt?: Date;
    isOnline: boolean;
}
export declare const MachineStateSchema: import("mongoose").Schema<MachineState, import("mongoose").Model<MachineState, any, any, any, Document<unknown, any, MachineState, any> & MachineState & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MachineState, Document<unknown, {}, import("mongoose").FlatRecord<MachineState>, {}> & import("mongoose").FlatRecord<MachineState> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
