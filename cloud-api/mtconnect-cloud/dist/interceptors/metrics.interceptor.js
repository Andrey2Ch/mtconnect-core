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
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const metrics_service_1 = require("../services/metrics.service");
let MetricsInterceptor = class MetricsInterceptor {
    constructor(metricsService) {
        this.metricsService = metricsService;
    }
    intercept(context, next) {
        const startTime = Date.now();
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url, ip } = request;
        const endpoint = this.normalizeEndpoint(url);
        this.metricsService.incrementActiveConnections();
        return next.handle().pipe((0, operators_1.tap)((data) => {
            const duration = Date.now() - startTime;
            const statusCode = response.statusCode;
            this.metricsService.recordHttpRequest(method, endpoint, statusCode, duration);
            if (endpoint === '/api/ext/data' && method === 'POST' && statusCode < 400) {
                this.recordDataIngestionMetrics(request, data);
            }
            if (endpoint === '/api/ext/event' && method === 'POST' && statusCode < 400) {
                this.recordMachineEventMetrics(request);
            }
            this.metricsService.decrementActiveConnections();
        }), (0, operators_1.catchError)((error) => {
            const duration = Date.now() - startTime;
            const statusCode = error instanceof common_1.HttpException ? error.getStatus() : 500;
            const errorType = this.getErrorType(error);
            this.metricsService.recordHttpRequest(method, endpoint, statusCode, duration);
            this.metricsService.recordApiError(endpoint, errorType, statusCode);
            if (endpoint === '/api/ext/data' && method === 'POST') {
                this.recordFailedDataIngestion(request, errorType);
            }
            this.metricsService.decrementActiveConnections();
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
    normalizeEndpoint(url) {
        return url
            .replace(/\/\d+/g, '/:id')
            .replace(/\?.*$/, '')
            .split('/').slice(0, 5).join('/');
    }
    getErrorType(error) {
        if (error instanceof common_1.HttpException) {
            const status = error.getStatus();
            if (status >= 400 && status < 500) {
                return 'client_error';
            }
            else if (status >= 500) {
                return 'server_error';
            }
        }
        if (error.name === 'ValidationError') {
            return 'validation_error';
        }
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            return 'database_error';
        }
        if (error.name === 'TimeoutError') {
            return 'timeout_error';
        }
        return 'unknown_error';
    }
    recordDataIngestionMetrics(request, responseData) {
        try {
            const { machineId, machineName } = request.body || {};
            const dataSize = this.calculateDataSize(request.body);
            if (machineId) {
                this.metricsService.recordDataIngestion(machineId, dataSize, true);
                this.metricsService.recordActiveMachine(machineId, true);
            }
            if (request.body?.adamData) {
                this.metricsService.recordAdamDeviceStatus(machineId || 'unknown', true);
            }
        }
        catch (error) {
            console.warn('Failed to record data ingestion metrics:', error.message);
        }
    }
    recordMachineEventMetrics(request) {
        try {
            const { machineId, eventType } = request.body || {};
            if (machineId && eventType) {
                this.metricsService.recordMachineEvent(machineId, eventType);
            }
        }
        catch (error) {
            console.warn('Failed to record machine event metrics:', error.message);
        }
    }
    recordFailedDataIngestion(request, errorType) {
        try {
            const { machineId } = request.body || {};
            const dataSize = this.calculateDataSize(request.body);
            if (machineId) {
                this.metricsService.recordDataIngestion(machineId, dataSize, false);
            }
        }
        catch (error) {
            console.warn('Failed to record failed data ingestion metrics:', error.message);
        }
    }
    calculateDataSize(data) {
        try {
            return JSON.stringify(data).length;
        }
        catch {
            return 0;
        }
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptor.js.map