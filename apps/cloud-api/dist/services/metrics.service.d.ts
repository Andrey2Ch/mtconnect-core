export declare class MetricsService {
    private metrics;
    recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void;
    recordApiError(endpoint: string, errorType: string, statusCode: number): void;
    recordDataIngestion(machineId: string, dataSize: number, successful: boolean): void;
    updateActiveMachines(count: number): void;
    recordActiveMachine(machineId: string, isActive: boolean): void;
    recordDatabaseOperation(operation: string, collection: string, duration: number, successful: boolean): void;
    incrementActiveConnections(): void;
    decrementActiveConnections(): void;
    setActiveConnections(count: number): void;
    recordMachineEvent(machineId: string, eventType: string): void;
    recordAdamDeviceStatus(deviceId: string, isOnline: boolean): void;
    createTimer(): {
        end: () => number;
    };
    getMetricsSnapshot(): Promise<{
        timestamp: string;
        metrics: {
            httpRequests: number;
            dataIngestionCount: number;
            activeConnections: number;
            activeMachines: number;
            apiErrors: number;
            databaseOperations: number;
        };
    }>;
}
