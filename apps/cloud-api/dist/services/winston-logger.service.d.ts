import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
export declare class WinstonLoggerService implements LoggerService {
    private readonly logger;
    constructor();
    private createTransports;
    log(message: any, context?: string): void;
    error(message: any, stack?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug(message: any, context?: string): void;
    verbose(message: any, context?: string): void;
    logApiRequest(data: {
        method: string;
        url: string;
        ip: string;
        userAgent?: string;
        body?: any;
        query?: any;
        headers?: any;
        requestId?: string;
    }): void;
    logApiResponse(data: {
        method: string;
        url: string;
        statusCode: number;
        responseTime: number;
        contentLength?: number;
        requestId?: string;
    }): void;
    logApiError(data: {
        method: string;
        url: string;
        error: any;
        statusCode: number;
        responseTime: number;
        requestId?: string;
    }): void;
    logDataIngestion(data: {
        edgeGatewayId: string;
        machineCount: number;
        recordsProcessed: number;
        processingTimeMs: number;
        success: boolean;
        errors?: any[];
    }): void;
    logSecurity(data: {
        event: string;
        ip: string;
        userAgent?: string;
        details?: any;
        severity?: 'low' | 'medium' | 'high' | 'critical';
    }): void;
    logPerformance(data: {
        operation: string;
        duration: number;
        details?: any;
    }): void;
    getWinstonLogger(): winston.Logger;
}
