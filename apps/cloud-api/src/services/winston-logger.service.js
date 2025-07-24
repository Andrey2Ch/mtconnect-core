"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinstonLoggerService = void 0;
const common_1 = require("@nestjs/common");
const winston = __importStar(require("winston"));
require("winston-daily-rotate-file");
let WinstonLoggerService = class WinstonLoggerService {
    logger;
    constructor() {
        const isDevelopment = process.env.NODE_ENV === 'development';
        this.logger = winston.createLogger({
            level: isDevelopment ? 'debug' : 'info',
            format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston.format.errors({ stack: true }), winston.format.json(), winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                const logObject = {
                    timestamp,
                    level,
                    message,
                    ...(stack && { stack }),
                    ...meta
                };
                return JSON.stringify(logObject);
            })),
            defaultMeta: {
                service: 'mtconnect-cloud-api',
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0'
            },
            transports: this.createTransports(isDevelopment),
            exitOnError: false
        });
        this.logger.exceptions.handle(new winston.transports.File({
            filename: 'logs/exceptions.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        }));
        this.logger.rejections.handle(new winston.transports.File({
            filename: 'logs/rejections.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        }));
    }
    createTransports(isDevelopment) {
        const transports = [];
        if (isDevelopment) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(winston.format.colorize(), winston.format.simple(), winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                    const contextStr = context ? `[${context}] ` : '';
                    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
                }))
            }));
        }
        transports.push(new winston.transports.DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        }), new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        }), new winston.transports.DailyRotateFile({
            filename: 'logs/api-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '50m',
            maxFiles: '7d',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json(), winston.format((info) => {
                if (info.type === 'api-request' || info.type === 'api-response' || info.type === 'api-error') {
                    return info;
                }
                return false;
            })())
        }));
        return transports;
    }
    log(message, context) {
        this.logger.info(message, { context });
    }
    error(message, stack, context) {
        this.logger.error(message, { stack, context });
    }
    warn(message, context) {
        this.logger.warn(message, { context });
    }
    debug(message, context) {
        this.logger.debug(message, { context });
    }
    verbose(message, context) {
        this.logger.verbose(message, { context });
    }
    logApiRequest(data) {
        this.logger.info('API Request', {
            type: 'api-request',
            ...data
        });
    }
    logApiResponse(data) {
        this.logger.info('API Response', {
            type: 'api-response',
            ...data
        });
    }
    logApiError(data) {
        this.logger.error('API Error', {
            type: 'api-error',
            ...data
        });
    }
    logDataIngestion(data) {
        this.logger.info('Data Ingestion', {
            type: 'data-ingestion',
            ...data
        });
    }
    logSecurity(data) {
        const level = data.severity === 'critical' || data.severity === 'high' ? 'error' :
            data.severity === 'medium' ? 'warn' : 'info';
        this.logger.log(level, 'Security Event', {
            type: 'security',
            ...data
        });
    }
    logPerformance(data) {
        this.logger.info('Performance', {
            type: 'performance',
            ...data
        });
    }
    getWinstonLogger() {
        return this.logger;
    }
};
exports.WinstonLoggerService = WinstonLoggerService;
exports.WinstonLoggerService = WinstonLoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WinstonLoggerService);
//# sourceMappingURL=winston-logger.service.js.map