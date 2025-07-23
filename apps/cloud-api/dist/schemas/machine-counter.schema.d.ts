import { Document } from 'mongoose';
export type MachineCounterDocument = MachineCounter & Document;
export declare class MachineCounter {
    machineId: string;
    timestamp: Date;
    partCount: number;
    cycleTimeSec?: number;
}
export declare const MachineCounterSchema: import("mongoose").Schema<MachineCounter, import("mongoose").Model<MachineCounter, any, any, any, Document<unknown, any, MachineCounter, any> & MachineCounter & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MachineCounter, Document<unknown, {}, import("mongoose").FlatRecord<MachineCounter>, {}> & import("mongoose").FlatRecord<MachineCounter> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
