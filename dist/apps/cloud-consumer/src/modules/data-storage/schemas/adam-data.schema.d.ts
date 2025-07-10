import { Document } from 'mongoose';
export type AdamDataDocument = AdamData & Document;
export declare class AdamData {
    deviceId: string;
    deviceName: string;
    timestamp: Date;
    deviceType: string;
    digitalInputs?: Record<string, boolean>;
    digitalOutputs?: Record<string, boolean>;
    analogInputs?: Record<string, number>;
    analogOutputs?: Record<string, number>;
    temperature?: number;
    humidity?: number;
    status?: string;
    additionalData?: Record<string, any>;
    source: string;
}
export declare const AdamDataSchema: import("mongoose").Schema<AdamData, import("mongoose").Model<AdamData, any, any, any, Document<unknown, any, AdamData, any> & AdamData & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AdamData, Document<unknown, {}, import("mongoose").FlatRecord<AdamData>, {}> & import("mongoose").FlatRecord<AdamData> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
