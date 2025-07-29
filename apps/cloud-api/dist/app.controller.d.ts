import { Model } from 'mongoose';
import { AppService } from './app.service';
import { MachineDataDocument } from './schemas/machine-data.schema';
export declare class AppController {
    private readonly appService;
    private machineDataModel;
    constructor(appService: AppService, machineDataModel: Model<MachineDataDocument>);
    getHello(): string;
    getHealth(): {
        status: string;
        timestamp: string;
        service: string;
    };
    getMachines(): Promise<{
        success: boolean;
        timestamp: string;
        summary: {
            total: number;
            mtconnect: {
                online: number;
                total: number;
            };
            adam: {
                online: number;
                total: number;
            };
        };
        machines: {
            mtconnect: any[];
            adam: any[];
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        timestamp: string;
        summary: {
            total: number;
            mtconnect: {
                online: number;
                total: number;
            };
            adam: {
                online: number;
                total: number;
            };
        };
        machines: {
            mtconnect: any[];
            adam: any[];
        };
    }>;
}
