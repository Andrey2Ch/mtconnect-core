import { Model } from 'mongoose';
import { MachineDataDocument } from '../schemas/machine-data.schema';
import { EdgeGatewayDataDto } from '../dto/edge-gateway-data.dto';
import { SanitizationService } from '../services/sanitization.service';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { MetricsService } from '../services/metrics.service';
export declare class ExternalApiController {
    private machineDataModel;
    private readonly logger;
    private readonly sanitizationService;
    private readonly metricsService;
    constructor(machineDataModel: Model<MachineDataDocument>, logger: WinstonLoggerService, sanitizationService: SanitizationService, metricsService: MetricsService);
    setup(body: {
        edgeGatewayId: string;
        machines: string[];
    }): Promise<{
        status: string;
        message: string;
        gatewayId: string;
        machineCount: number;
    }>;
    ingestData(data: EdgeGatewayDataDto): Promise<{
        success: boolean;
        message: string;
        processedCount: number;
        processingTime: number;
    }>;
    handleEvent(eventData: any): Promise<{
        status: string;
        message: string;
        eventType: string;
    }>;
    getCycleTime(machineId: string, from?: string, to?: string): Promise<{
        machineId: string;
        period: {
            from: Date;
            to: Date;
        };
        averageCycleTime: number;
        dataPoints: number;
        data: {
            timestamp: Date;
            cycleTime: number;
        }[];
    }>;
    healthCheck(): Promise<{
        status: string;
        timestamp: Date;
        database: string;
        version: string;
    }>;
}
