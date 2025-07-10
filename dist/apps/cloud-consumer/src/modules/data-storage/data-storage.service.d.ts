import { Model } from 'mongoose';
import { MachineDataDocument } from './schemas/machine-data.schema';
import { AdamDataDocument } from './schemas/adam-data.schema';
import { EdgeGatewayDataDto } from '@mtconnect/common-dto';
import { AdamDataDto } from '@mtconnect/common-dto';
export declare class DataStorageService {
    private machineDataModel;
    private adamDataModel;
    private readonly logger;
    constructor(machineDataModel: Model<MachineDataDocument>, adamDataModel: Model<AdamDataDocument>);
    saveMachineData(data: EdgeGatewayDataDto): Promise<void>;
    saveAdamData(data: AdamDataDto): Promise<void>;
    getRecentData(machineId?: string, limit?: number): Promise<{
        machineData: (import("mongoose").FlattenMaps<MachineDataDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        adamData: (import("mongoose").FlattenMaps<AdamDataDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        totalRecords: number;
    }>;
    getMachines(): Promise<{
        machines: string[];
        adamDevices: string[];
    }>;
    getStats(): Promise<{
        totalMachineRecords: number;
        totalAdamRecords: number;
        lastMachineDataTimestamp: Date;
        lastAdamDataTimestamp: Date;
    }>;
}
