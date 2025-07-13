export declare class EdgeDataController {
    private readonly logger;
    receiveBatchData(batchData: any): Promise<{
        error: string;
        success?: undefined;
        processed?: undefined;
        timestamp?: undefined;
    } | {
        success: boolean;
        processed: number;
        timestamp: string;
        error?: undefined;
    }>;
    getEdgeData(): {
        timestamp: string;
        machines: any[];
        total: number;
    };
}
