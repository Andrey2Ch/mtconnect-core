import { MetricsService } from '../services/metrics.service';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { Connection } from 'mongoose';
export declare class MonitoringController {
    private readonly metricsService;
    private readonly logger;
    private readonly mongoConnection;
    constructor(metricsService: MetricsService, logger: WinstonLoggerService, mongoConnection: Connection);
    getHealthCheck(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        environment: string;
        version: string;
        system: {
            memory: {
                total: number;
                free: number;
                used: number;
                usage_percent: number;
            };
            cpu: {
                load_average: number[];
                cpu_count: number;
            };
            platform: NodeJS.Platform;
            arch: string;
        };
        application: {
            node_version: string;
            pid: number;
            memory_usage: NodeJS.MemoryUsage;
        };
        database: {
            status: any;
            ready_state: import("mongoose").ConnectionStates;
            name: string;
            host: string;
            port: number;
            collections: any;
            data_size: any;
            storage_size: any;
            index_size: any;
            error?: undefined;
        } | {
            status: string;
            error: any;
            ready_state?: undefined;
            name?: undefined;
            host?: undefined;
            port?: undefined;
            collections?: undefined;
            data_size?: undefined;
            storage_size?: undefined;
            index_size?: undefined;
        };
        services: {
            api: string;
            logging: string;
            metrics: string;
            authentication: string;
        };
        response_time_ms: number;
    }>;
    getDetailedHealthCheck(): Promise<{
        database_detailed: {
            server: {
                version: any;
                uptime: any;
                connections: any;
                memory: any;
                network: any;
            };
            database: {
                collections: any;
                documents: any;
                data_size: any;
                storage_size: any;
                indexes: any;
                index_size: any;
                average_object_size: any;
            };
            error?: undefined;
            basic_stats?: undefined;
        } | {
            error: any;
            basic_stats: {
                status: any;
                ready_state: import("mongoose").ConnectionStates;
                name: string;
                host: string;
                port: number;
                collections: any;
                data_size: any;
                storage_size: any;
                index_size: any;
                error?: undefined;
            } | {
                status: string;
                error: any;
                ready_state?: undefined;
                name?: undefined;
                host?: undefined;
                port?: undefined;
                collections?: undefined;
                data_size?: undefined;
                storage_size?: undefined;
                index_size?: undefined;
            };
            server?: undefined;
            database?: undefined;
        };
        environment_info: {
            node_env: string;
            port: string;
            mongodb_connected: boolean;
            has_mongodb_uri: boolean;
        };
        metrics_summary: {
            timestamp: string;
            metrics: {
                http_requests_total: string;
                active_connections: string;
                data_ingestion_rate: string;
                error_rate: string;
            };
        };
        errors: any;
        status: string;
        timestamp: string;
        uptime: number;
        environment: string;
        version: string;
        system: {
            memory: {
                total: number;
                free: number;
                used: number;
                usage_percent: number;
            };
            cpu: {
                load_average: number[];
                cpu_count: number;
            };
            platform: NodeJS.Platform;
            arch: string;
        };
        application: {
            node_version: string;
            pid: number;
            memory_usage: NodeJS.MemoryUsage;
        };
        database: {
            status: any;
            ready_state: import("mongoose").ConnectionStates;
            name: string;
            host: string;
            port: number;
            collections: any;
            data_size: any;
            storage_size: any;
            index_size: any;
            error?: undefined;
        } | {
            status: string;
            error: any;
            ready_state?: undefined;
            name?: undefined;
            host?: undefined;
            port?: undefined;
            collections?: undefined;
            data_size?: undefined;
            storage_size?: undefined;
            index_size?: undefined;
        };
        services: {
            api: string;
            logging: string;
            metrics: string;
            authentication: string;
        };
        response_time_ms: number;
    }>;
    getSimpleStatus(): Promise<{
        status: string;
        database: string;
        memory_usage_percent: number;
        uptime_seconds: number;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: any;
        timestamp: string;
        database?: undefined;
        memory_usage_percent?: undefined;
        uptime_seconds?: undefined;
    }>;
    private getDatabaseHealth;
    private getDetailedDatabaseHealth;
    private getRecentErrors;
    getMetricsSummary(): Promise<{
        system_info: {
            memory_usage: NodeJS.MemoryUsage;
            cpu_usage: NodeJS.CpuUsage;
            uptime: number;
        };
        note: string;
        timestamp: string;
        metrics: {
            http_requests_total: string;
            active_connections: string;
            data_ingestion_rate: string;
            error_rate: string;
        };
    }>;
}
