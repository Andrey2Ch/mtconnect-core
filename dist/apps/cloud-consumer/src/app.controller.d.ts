import { DataStorageService } from './modules/data-storage/data-storage.service';
export declare class AppController {
    private readonly dataStorageService;
    constructor(dataStorageService: DataStorageService);
    health(): {
        status: string;
        service: string;
        timestamp: string;
    };
    getStatus(): Promise<{
        service: string;
        status: string;
        mqtt: {
            connected: boolean;
            subscriptions: string[];
        };
        database: {
            totalMachineRecords: number;
            totalAdamRecords: number;
            lastMachineDataTimestamp: Date;
            lastAdamDataTimestamp: Date;
        };
        timestamp: string;
    }>;
    getData(machineId?: string, limit?: string): Promise<{
        machineData: (import("mongoose").FlattenMaps<import("./modules/data-storage/schemas/machine-data.schema").MachineDataDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        adamData: (import("mongoose").FlattenMaps<import("./modules/data-storage/schemas/adam-data.schema").AdamDataDocument> & Required<{
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
}
