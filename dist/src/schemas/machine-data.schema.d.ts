import { Document } from 'mongoose';
export type MachineDataDocument = MachineData & Document;
export declare class MachineData {
    timestamp: Date;
    metadata: {
        edgeGatewayId: string;
        machineId: string;
        machineName: string;
    };
    data: {
        partCount?: number;
        cycleTime?: number;
        executionStatus?: string;
        availability?: string;
        program?: string;
        block?: string;
        line?: string;
        adamData?: any;
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
