interface RailwayConfig {
    baseUrl: string;
    apiKey: string;
    edgeGatewayId: string;
    retryAttempts: number;
    retryDelay: number;
    enabled: boolean;
}
interface EdgeGatewayData {
    machineId: string;
    machineName: string;
    timestamp: string;
    data: {
        partCount?: number;
        cycleTime?: number;
        executionStatus?: string;
        availability?: string;
        program?: string;
        block?: string;
        line?: string;
        adamData?: any;
    };
}
export declare class RailwayClient {
    private config;
    private httpClient;
    private dataBuffer;
    private isOnline;
    private retryTimer;
    constructor(config: RailwayConfig);
    sendData(data: EdgeGatewayData): Promise<boolean>;
    sendDataBatch(batchData: any): Promise<boolean>;
    flushBuffer(): Promise<boolean>;
    healthCheck(): Promise<boolean>;
    private startPeriodicSync;
    getStatus(): {
        isOnline: boolean;
        bufferSize: number;
        retryCount: number;
        lastSent: Date;
    };
}
export declare function loadRailwayConfig(configPath: string): RailwayConfig;
export {};
