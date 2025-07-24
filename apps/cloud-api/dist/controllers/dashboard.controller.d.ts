import { Model } from 'mongoose';
import { Response } from 'express';
import { MachineDataDocument } from '../schemas/machine-data.schema';
import { SanitizationService } from '../services/sanitization.service';
import { WinstonLoggerService } from '../services/winston-logger.service';
export declare class DashboardController {
    private machineDataModel;
    private readonly logger;
    private readonly sanitizationService;
    constructor(machineDataModel: Model<MachineDataDocument>, logger: WinstonLoggerService, sanitizationService: SanitizationService);
    serveDashboard(res: Response): Promise<void>;
    getMachines(): Promise<{
        status: string;
        count: number;
        machines: any[];
    }>;
    getMachineData(machineId: string, hours?: string): Promise<{
        status: string;
        machineId: string;
        recordCount: number;
        hoursRequested: number;
        data: {
            timestamp: Date;
            machineName: string;
            partCount: number;
            cycleTime: number;
            executionStatus: string;
            availability: string;
            program: string;
            block: string;
            line: string;
            adamData: import("mongoose").FlattenMaps<{
                digitalInputs?: boolean[];
                digitalOutputs?: boolean[];
                analogData?: Record<string, number>;
                connectionStatus?: string;
            }>;
        }[];
    }>;
    getSystemStatus(): Promise<{
        status: string;
        timestamp: Date;
        summary: {
            totalMachines: number;
            activeMachines: number;
            recentRecords: number;
            dailyRecords: number;
        };
        machines: {
            machineId: any;
            machineName: any;
            lastSeen: any;
            status: any;
            isActive: boolean;
        }[];
    }>;
    dashboardHealth(): Promise<{
        status: string;
        timestamp: Date;
        database: string;
    }>;
    getCurrentMTConnectData(res: Response): Promise<Response<any, Record<string, any>>>;
    getAdamCounters(): Promise<{
        status: string;
        counters: {
            machineId: any;
            count: any;
            cycleTimeMs: number;
            timestamp: any;
        }[];
        error?: undefined;
    } | {
        error: any;
        status?: undefined;
        counters?: undefined;
    }>;
    getStatus(): Promise<{
        status: string;
        timestamp: Date;
        mtconnectAgents: {
            id: any;
            name: any;
            status: string;
            lastSeen: any;
            error: string;
        }[];
        totalAgents: number;
        onlineAgents: number;
    }>;
}
