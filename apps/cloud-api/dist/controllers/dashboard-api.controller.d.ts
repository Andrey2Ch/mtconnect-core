import { Model } from 'mongoose';
import { MachineDataDocument } from '../schemas/machine-data.schema';
export declare class DashboardApiController {
    private readonly machineDataModel;
    private readonly logger;
    constructor(machineDataModel: Model<MachineDataDocument>);
    getMachines(): Promise<{
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
        timestamp: string;
    } | {
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
        timestamp: string;
        error: string;
    }>;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        database: {
            connected: boolean;
            totalRecords: number;
            error?: undefined;
        };
        message: string;
    } | {
        status: string;
        timestamp: string;
        database: {
            connected: boolean;
            error: any;
            totalRecords?: undefined;
        };
        message: string;
    }>;
}
