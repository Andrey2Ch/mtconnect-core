import { Model } from 'mongoose';
import { MachineData } from '../schemas/machine-data.schema';
export declare class DashboardV2ApiController {
    private machineDataModel;
    constructor(machineDataModel: Model<MachineData>);
    getMachinesV2(): Promise<{
        success: boolean;
        data: {
            id: any;
            name: string;
            status: string;
            type: string;
            primaryValue: any;
            secondaryValue: any;
            cycleTime: number;
            lastUpdate: any;
            isOnline: boolean;
            hourlyActivity: number[];
        }[];
        timestamp: string;
        totalMachines: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data: any[];
        timestamp?: undefined;
        totalMachines?: undefined;
    }>;
    getSummary(): Promise<{
        success: boolean;
        data: {
            oee: number;
            totalParts: any;
            activeMachines: number;
            totalMachines: number;
            onlineMachines: number;
            alerts: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getHourlyData(machineId: string): Promise<{
        success: boolean;
        data: {
            machineId: string;
            hourlyActivity: number[];
            period: string;
        };
    }>;
    private getDisplayName;
    private generateMockHourlyActivity;
}
