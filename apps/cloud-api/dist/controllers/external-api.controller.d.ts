interface MachineDataPayload {
    timestamp: string;
    metadata: {
        edgeGatewayId: string;
        machineId: string;
        machineName: string;
        machineType: string;
    };
    data: {
        partCount?: number;
        program?: string;
        cycleTime?: number;
        cycleTimeConfidence?: string;
        executionStatus?: string;
        [key: string]: any;
    };
}
export declare class ExternalApiController {
    private readonly logger;
    receiveData(payload: MachineDataPayload | MachineDataPayload[]): Promise<{
        success: boolean;
        message: string;
        timestamp: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        timestamp: string;
        message?: undefined;
    }>;
}
export {};
