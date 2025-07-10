import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Create winston logger instance
    this.logger = winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const logObject = {
            timestamp,
            level,
            message,
            ...(stack && { stack }),
            ...meta
          };
          return JSON.stringify(logObject);
        })
      ),
      defaultMeta: {
        service: 'mtconnect-cloud-api',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: this.createTransports(isDevelopment),
      exitOnError: false
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({
        filename: 'logs/exceptions.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({
        filename: 'logs/rejections.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  private createTransports(isDevelopment: boolean): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport for development
    if (isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const contextStr = context ? `[${context}] ` : '';
              const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
            })
          )
        })
      );
    }

    // File transports for all environments
    transports.push(
      // Combined logs
      new winston.transports.DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),

      // Error logs
      new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),

      // API activity logs
      new winston.transports.DailyRotateFile({
        filename: 'logs/api-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '7d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            // Only log API-related activities
            if (info.type === 'api-request' || info.type === 'api-response' || info.type === 'api-error') {
              return info;
            }
            return false;
          })()
        )
      })
    );

    return transports;
  }

  // NestJS LoggerService interface implementation
  log(message: any, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: any, stack?: string, context?: string): void {
    this.logger.error(message, { stack, context });
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context });
  }

  // Extended methods for structured logging
  logApiRequest(data: {
    method: string;
    url: string;
    ip: string;
    userAgent?: string;
    body?: any;
    query?: any;
    headers?: any;
    requestId?: string;
  }): void {
    this.logger.info('API Request', {
      type: 'api-request',
      ...data
    });
  }

  logApiResponse(data: {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    contentLength?: number;
    requestId?: string;
  }): void {
    this.logger.info('API Response', {
      type: 'api-response',
      ...data
    });
  }

  logApiError(data: {
    method: string;
    url: string;
    error: any;
    statusCode: number;
    responseTime: number;
    requestId?: string;
  }): void {
    this.logger.error('API Error', {
      type: 'api-error',
      ...data
    });
  }

  logDataIngestion(data: {
    edgeGatewayId: string;
    machineCount: number;
    recordsProcessed: number;
    processingTimeMs: number;
    success: boolean;
    errors?: any[];
  }): void {
    this.logger.info('Data Ingestion', {
      type: 'data-ingestion',
      ...data
    });
  }

  logSecurity(data: {
    event: string;
    ip: string;
    userAgent?: string;
    details?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const level = data.severity === 'critical' || data.severity === 'high' ? 'error' : 
                  data.severity === 'medium' ? 'warn' : 'info';
    
    this.logger.log(level, 'Security Event', {
      type: 'security',
      ...data
    });
  }

  logPerformance(data: {
    operation: string;
    duration: number;
    details?: any;
  }): void {
    this.logger.info('Performance', {
      type: 'performance',
      ...data
    });
  }

  // Raw winston logger for advanced usage
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
} 