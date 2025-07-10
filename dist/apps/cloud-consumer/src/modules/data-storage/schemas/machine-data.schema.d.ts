import { Document } from 'mongoose';
export type MachineDataDocument = MachineData & Document;
export declare class MachineData {
    machineId: string;
    machineName: string;
    timestamp: Date;
    status: string;
    program?: string;
    mode?: string;
    spindle?: {
        speed: number;
        load: number;
        override: number;
    };
    feeds?: {
        feedrate: number;
        override: number;
    };
    axes?: {
        x: number;
        y: number;
        z: number;
    };
    toolData?: {
        toolNumber: number;
        toolLength: number;
        toolDiameter: number;
    };
    additionalData?: Record<string, any>;
    source: string;
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
