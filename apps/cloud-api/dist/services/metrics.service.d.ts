import { Counter, Histogram, Gauge } from 'prom-client';
export declare class MetricsService {
    httpRequestsTotal: Counter<string>;
    httpRequestDuration: Histogram<string>;
    activeConnections: Gauge<string>;
    dataIngestionTotal: Counter<string>;
    dataIngestionVolume: Counter<string>;
    activeMachines: Gauge<string>;
    apiErrorsTotal: Counter<string>;
    databaseOperationsTotal: Counter<string>;
    databaseOperationDuration: Histogram<string>;
    constructor(httpRequestsTotal: Counter<string>, httpRequestDuration: Histogram<string>, activeConnections: Gauge<string>, dataIngestionTotal: Counter<string>, dataIngestionVolume: Counter<string>, activeMachines: Gauge<string>, apiErrorsTotal: Counter<string>, databaseOperationsTotal: Counter<string>, databaseOperationDuration: Histogram<string>);
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
            http_requests_total: string;
            active_connections: string;
            data_ingestion_rate: string;
            error_rate: string;
        };
    }>;
}
export declare const metricsProviders: import("@nestjs/common").Provider[];
