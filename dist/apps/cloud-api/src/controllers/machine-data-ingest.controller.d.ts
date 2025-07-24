import { Model } from 'mongoose';
import { MachineDataDocument } from '../schemas/machine-data.schema';
export declare class MachineDataIngestDto {
    timestamp: string;
    machineId: string;
    source: 'adam' | 'mtconnect';
    dataType: 'event' | 'snapshot';
    triggerReason: 'partCount_changed' | 'program_changed' | 'scheduled_snapshot';
    data: {
        partCount?: number | string;
        program?: string;
        cycleTime?: number;
        cycleConfidence?: number;
        execution?: string;
        availability?: string;
        adamData?: any;
    };
}
export declare class MachineDataIngestController {
    private readonly machineDataModel;
    private readonly logger;
    constructor(machineDataModel: Model<MachineDataDocument>);
    ingestMachineData(payload: MachineDataIngestDto): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        documentId?: undefined;
        timestamp?: undefined;
        details?: undefined;
    } | {
        success: boolean;
        message: string;
        documentId: unknown;
        timestamp: string;
        error?: undefined;
        details?: undefined;
    } | {
        success: boolean;
        error: string;
        details: any;
        timestamp: string;
        message?: undefined;
        documentId?: undefined;
    }>;
    ingestBatchMachineData(payloads: MachineDataIngestDto[]): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
        savedCount?: undefined;
        timestamp?: undefined;
        details?: undefined;
    } | {
        success: boolean;
        message: string;
        savedCount: number;
        timestamp: string;
        error?: undefined;
        details?: undefined;
    } | {
        success: boolean;
        error: string;
        details: any;
        timestamp: string;
        message?: undefined;
        savedCount?: undefined;
    }>;
}
