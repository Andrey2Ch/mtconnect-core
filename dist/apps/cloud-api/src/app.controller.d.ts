import { AppService } from './app.service';
import { Model } from 'mongoose';
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
        version: string;
    };
    getDashboard(): {
        message: string;
        endpoints: {
            '/machines': string;
            '/health': string;
            '/dashboard/index.html': string;
        };
    };
    getMachines(): Promise<{
        timestamp: string;
        summary: {
            total: number;
            mtconnect: {
                total: number;
                online: number;
                offline: number;
            };
            adam: {
                total: number;
                online: number;
                offline: number;
            };
        };
        machines: {
            mtconnect: any[];
            adam: any[];
        };
    } | {
        timestamp: string;
        error: any;
        summary: {
            total: number;
            mtconnect: {
                total: number;
                online: number;
                offline: number;
            };
            adam: {
                total: number;
                online: number;
                offline: number;
            };
        };
        machines: {
            mtconnect: any[];
            adam: any[];
        };
    }>;
}
