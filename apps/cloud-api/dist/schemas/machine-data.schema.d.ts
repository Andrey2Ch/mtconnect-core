import { Document } from 'mongoose';
export type MachineDataDocument = MachineData & Document;
export declare class MachineData {
    timestamp: Date;
    metadata: {
        edgeGatewayId: string;
        machineId: string;
        machineName: string;
        dataType: 'production' | 'alarm' | 'maintenance' | 'performance' | 'adam';
        source: 'mtconnect' | 'adam' | 'manual' | 'calculated';
    };
    data: {
        partCount?: number;
        cycleTime?: number;
        executionStatus?: string;
        availability?: string;
        program?: string;
        block?: string;
        line?: string;
        adamData?: {
            digitalInputs?: boolean[];
            digitalOutputs?: boolean[];
            analogData?: Record<string, number>;
            connectionStatus?: string;
        };
        alarmCode?: string;
        alarmMessage?: string;
        alarmSeverity?: string;
        oeePercent?: number;
        utilizationPercent?: number;
        efficiencyPercent?: number;
        maintenanceType?: string;
        maintenanceDescription?: string;
        downtime?: number;
        powerConsumption?: number;
        temperature?: number;
        vibration?: number;
        toolWearPercent?: number;
        qualityGrade?: string;
        defectType?: string;
        reworkRequired?: boolean;
        customData?: any;
    };
    createdAt: Date;
}
export declare const MachineDataSchema: import("mongoose").Schema<MachineData, import("mongoose").Model<MachineData, any, any, any, Document<unknown, any, MachineData, any> & MachineData & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MachineData, Document<unknown, {}, import("mongoose").FlatRecord<MachineData>, {}> & import("mongoose").FlatRecord<MachineData> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
