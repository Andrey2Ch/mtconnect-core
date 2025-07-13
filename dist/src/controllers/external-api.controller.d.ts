import { Model } from 'mongoose';
import { MachineDataDocument } from '../schemas/machine-data.schema';
import { EdgeGatewayDataDto } from '../dto/edge-gateway-data.dto';
export declare class ExternalApiController {
    private machineDataModel;
    constructor(machineDataModel: Model<MachineDataDocument>);
    setup(body: {
        edgeGatewayId: string;
        machines: string[];
    }): Promise<{
        status: string;
        edgeGatewayId: string;
        machineCount: number;
    }>;
    receiveData(edgeData: EdgeGatewayDataDto): Promise<{
        status: string;
        received: number;
        saved: number;
        timestamp: string;
    }>;
    receiveEvent(event: {
        machineId: string;
        eventType: string;
        timestamp: string;
        data: any;
    }): Promise<{
        status: string;
        eventId: unknown;
        timestamp: string;
    }>;
    getCycleTime(machineId: string, from?: string, to?: string): Promise<{
        machineId: string;
        totalRecords: number;
        averageCycleTime: number;
        data: {
            timestamp: Date;
            cycleTime: number;
            partCount: number;
        }[];
    }>;
    healthCheck(): Promise<{
        status: string;
        database: string;
        recentData: number;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        database: string;
        error: string;
        timestamp: string;
        recentData?: undefined;
    }>;
}
