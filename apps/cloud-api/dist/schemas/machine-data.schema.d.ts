import { Document } from 'mongoose';
export type MachineDataDocument = MachineData & Document;
export declare class MachineData {
    timestamp: string;
    metadata: {
        edgeGatewayId: string;
        machineId: string;
        machineName: string;
        machineType: string;
    };
    data: {
        partCount?: number;
        program?: string;
        cycleTime?: number;
        cycleTimeConfidence?: string;
        executionStatus?: string;
        idleTimeMinutes?: number;
        [key: string]: any;
    };
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
