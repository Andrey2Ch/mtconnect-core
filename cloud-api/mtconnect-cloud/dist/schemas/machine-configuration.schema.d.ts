import { Document } from 'mongoose';
export type MachineConfigurationDocument = MachineConfiguration & Document;
export declare class MachineConfiguration {
    machineId: string;
    machineName: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    networkConfig: {
        ip: string;
        port: number;
        mtconnectAgentUrl: string;
        adamIp?: string;
        adamPort?: number;
    };
    settings: {
        dataRetentionDays?: number;
        pollingIntervalMs?: number;
        enabledDataItems?: string[];
        customAttributes?: Record<string, any>;
    };
    location?: {
        latitude?: number;
        longitude?: number;
        building?: string;
        floor?: string;
        line?: string;
        cell?: string;
    };
    isActive: boolean;
    lastConfigUpdate: Date;
}
export declare const MachineConfigurationSchema: import("mongoose").Schema<MachineConfiguration, import("mongoose").Model<MachineConfiguration, any, any, any, Document<unknown, any, MachineConfiguration, any> & MachineConfiguration & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MachineConfiguration, Document<unknown, {}, import("mongoose").FlatRecord<MachineConfiguration>, {}> & import("mongoose").FlatRecord<MachineConfiguration> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
