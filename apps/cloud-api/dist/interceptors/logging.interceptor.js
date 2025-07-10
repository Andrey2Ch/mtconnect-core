"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const winston_logger_service_1 = require("../services/winston-logger.service");
const uuid_1 = require("uuid");
let LoggingInterceptor = class LoggingInterceptor {
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        const startTime = Date.now();
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const requestId = (0, uuid_1.v4)();
        request.requestId = requestId;
        const requestData = {
            method: request.method,
            url: request.url,
            ip: this.getClientIp(request),
            userAgent: request.get('User-Agent'),
            body: this.sanitizeBody(request.body),
            query: request.query,
            headers: this.sanitizeHeaders(request.headers),
            requestId
        };
        this.logger.logApiRequest(requestData);
        return next.handle().pipe((0, operators_1.tap)((responseBody) => {
            const responseTime = Date.now() - startTime;
            this.logger.logApiResponse({
                method: request.method,
                url: request.url,
                statusCode: response.statusCode,
                responseTime,
                contentLength: response.get('Content-Length') ?
                    parseInt(response.get('Content-Length')) : undefined,
                requestId
            });
            if (responseTime > 1000) {
                this.logger.logPerformance({
                    operation: `${request.method} ${request.url}`,
                    duration: responseTime,
                    details: {
                        requestId,
                        statusCode: response.statusCode,
                        userAgent: request.get('User-Agent'),
                        ip: this.getClientIp(request)
                    }
                });
            }
            if (request.url.includes('/api/ext/data') && request.method === 'POST') {
                const body = responseBody || {};
                this.logger.logDataIngestion({
                    edgeGatewayId: request.body?.edgeGatewayId || 'unknown',
                    machineCount: request.body?.data?.length || 0,
                    recordsProcessed: body.recordsProcessed || 0,
                    processingTimeMs: responseTime,
                    success: response.statusCode < 400,
                    errors: response.statusCode >= 400 ? [body] : undefined
                });
            }
        }), (0, operators_1.catchError)((error) => {
            const responseTime = Date.now() - startTime;
            this.logger.logApiError({
                method: request.method,
                url: request.url,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    ...error
                },
                statusCode: error.status || 500,
                responseTime,
                requestId
            });
            if (error.status === 401 || error.status === 403) {
                this.logger.logSecurity({
                    event: 'unauthorized_access',
                    ip: this.getClientIp(request),
                    userAgent: request.get('User-Agent'),
                    details: {
                        url: request.url,
                        method: request.method,
                        error: error.message,
                        requestId
                    },
                    severity: 'medium'
                });
            }
            if (error.status === 429) {
                this.logger.logSecurity({
                    event: 'rate_limit_exceeded',
                    ip: this.getClientIp(request),
                    userAgent: request.get('User-Agent'),
                    details: {
                        url: request.url,
                        method: request.method,
                        requestId
                    },
                    severity: 'low'
                });
            }
            throw error;
        }));
    }
    getClientIp(request) {
        return (request.ip ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.connection?.socket?.remoteAddress ||
            request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            'unknown');
    }
    sanitizeBody(body) {
        if (!body)
            return undefined;
        const sanitized = JSON.parse(JSON.stringify(body));
        this.removeSensitiveFields(sanitized, [
            'password',
            'token',
            'secret',
            'key',
            'authorization',
            'api_key',
            'apiKey'
        ]);
        const bodyString = JSON.stringify(sanitized);
        if (bodyString.length > 5000) {
            return {
                _truncated: true,
                _originalSize: bodyString.length,
                _preview: bodyString.substring(0, 1000) + '...'
            };
        }
        return sanitized;
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token'
        ];
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    removeSensitiveFields(obj, sensitiveFields) {
        if (typeof obj !== 'object' || obj === null)
            return;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                    obj[key] = '[REDACTED]';
                }
                else if (typeof obj[key] === 'object') {
                    this.removeSensitiveFields(obj[key], sensitiveFields);
                }
            }
        }
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [winston_logger_service_1.WinstonLoggerService])
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map