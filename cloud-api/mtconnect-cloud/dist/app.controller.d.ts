import { Connection, Model } from 'mongoose';
import { AppService } from './app.service';
import { MachineData, MachineDataDocument } from './schemas/machine-data.schema';
export declare class AppController {
    private readonly appService;
    private readonly connection;
    private readonly machineDataModel;
    constructor(appService: AppService, connection: Connection, machineDataModel: Model<MachineDataDocument>);
    getHello(): string;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        database: {
            status: string;
            name: string;
        };
        environment: string;
    }>;
    testTimeSeries(): Promise<{
        message: string;
        id: unknown;
        timestamp: Date;
        collection: string;
    }>;
    testQuery(): Promise<{
        totalRecords: number;
        latestRecord: import("mongoose").Document<unknown, {}, MachineDataDocument, {}> & MachineData & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        collection: string;
    }>;
}
