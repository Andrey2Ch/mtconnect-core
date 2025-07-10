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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsProviders = exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const prom_client_1 = require("prom-client");
let MetricsService = class MetricsService {
    httpRequestsTotal;
    httpRequestDuration;
    activeConnections;
    dataIngestionTotal;
    dataIngestionVolume;
    activeMachines;
    apiErrorsTotal;
    databaseOperationsTotal;
    databaseOperationDuration;
    constructor(httpRequestsTotal, httpRequestDuration, activeConnections, dataIngestionTotal, dataIngestionVolume, activeMachines, apiErrorsTotal, databaseOperationsTotal, databaseOperationDuration) {
        this.httpRequestsTotal = httpRequestsTotal;
        this.httpRequestDuration = httpRequestDuration;
        this.activeConnections = activeConnections;
        this.dataIngestionTotal = dataIngestionTotal;
        this.dataIngestionVolume = dataIngestionVolume;
        this.activeMachines = activeMachines;
        this.apiErrorsTotal = apiErrorsTotal;
        this.databaseOperationsTotal = databaseOperationsTotal;
        this.databaseOperationDuration = databaseOperationDuration;
    }
    recordHttpRequest(method, endpoint, statusCode, duration) {
        const labels = { method, endpoint, status_code: statusCode.toString() };
        this.httpRequestsTotal.inc(labels);
        this.httpRequestDuration.observe(labels, duration / 1000);
    }
    recordApiError(endpoint, errorType, statusCode) {
        this.apiErrorsTotal.inc({
            endpoint,
            error_type: errorType,
            status_code: statusCode.toString()
        });
    }
    recordDataIngestion(machineId, dataSize, successful) {
        const labels = {
            machine_id: machineId,
            status: successful ? 'success' : 'failed'
        };
        this.dataIngestionTotal.inc(labels);
        if (successful && dataSize > 0) {
            this.dataIngestionVolume.inc({ machine_id: machineId }, dataSize);
        }
    }
    updateActiveMachines(count) {
        this.activeMachines.set(count);
    }
    recordActiveMachine(machineId, isActive) {
        this.activeMachines.set({ machine_id: machineId }, isActive ? 1 : 0);
    }
    recordDatabaseOperation(operation, collection, duration, successful) {
        const labels = {
            operation,
            collection,
            status: successful ? 'success' : 'failed'
        };
        this.databaseOperationsTotal.inc(labels);
        this.databaseOperationDuration.observe(labels, duration / 1000);
    }
    incrementActiveConnections() {
        this.activeConnections.inc();
    }
    decrementActiveConnections() {
        this.activeConnections.dec();
    }
    setActiveConnections(count) {
        this.activeConnections.set(count);
    }
    recordMachineEvent(machineId, eventType) {
        this.dataIngestionTotal.inc({
            machine_id: machineId,
            event_type: eventType,
            status: 'event'
        });
    }
    recordAdamDeviceStatus(deviceId, isOnline) {
        this.activeMachines.set({
            device_id: deviceId,
            type: 'adam',
            status: isOnline ? 'online' : 'offline'
        }, isOnline ? 1 : 0);
    }
    createTimer() {
        const start = Date.now();
        return {
            end: () => Date.now() - start
        };
    }
    async getMetricsSnapshot() {
        return {
            timestamp: new Date().toISOString(),
            metrics: {
                http_requests_total: 'See /metrics endpoint',
                active_connections: 'See /metrics endpoint',
                data_ingestion_rate: 'See /metrics endpoint',
                error_rate: 'See /metrics endpoint',
            }
        };
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, nestjs_prometheus_1.InjectMetric)('http_requests_total')),
    __param(1, (0, nestjs_prometheus_1.InjectMetric)('http_request_duration_seconds')),
    __param(2, (0, nestjs_prometheus_1.InjectMetric)('active_connections')),
    __param(3, (0, nestjs_prometheus_1.InjectMetric)('data_ingestion_total')),
    __param(4, (0, nestjs_prometheus_1.InjectMetric)('data_ingestion_volume_bytes')),
    __param(5, (0, nestjs_prometheus_1.InjectMetric)('active_machines')),
    __param(6, (0, nestjs_prometheus_1.InjectMetric)('api_errors_total')),
    __param(7, (0, nestjs_prometheus_1.InjectMetric)('database_operations_total')),
    __param(8, (0, nestjs_prometheus_1.InjectMetric)('database_operation_duration_seconds')),
    __metadata("design:paramtypes", [prom_client_1.Counter,
        prom_client_1.Histogram,
        prom_client_1.Gauge,
        prom_client_1.Counter,
        prom_client_1.Counter,
        prom_client_1.Gauge,
        prom_client_1.Counter,
        prom_client_1.Counter,
        prom_client_1.Histogram])
], MetricsService);
exports.metricsProviders = [
    (0, nestjs_prometheus_1.makeCounterProvider)({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'endpoint', 'status_code'],
    }),
    (0, nestjs_prometheus_1.makeHistogramProvider)({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'endpoint', 'status_code'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    }),
    (0, nestjs_prometheus_1.makeGaugeProvider)({
        name: 'active_connections',
        help: 'Number of active connections',
        labelNames: ['connection_type'],
    }),
    (0, nestjs_prometheus_1.makeCounterProvider)({
        name: 'data_ingestion_total',
        help: 'Total number of data ingestion events',
        labelNames: ['machine_id', 'status', 'event_type'],
    }),
    (0, nestjs_prometheus_1.makeCounterProvider)({
        name: 'data_ingestion_volume_bytes',
        help: 'Total volume of ingested data in bytes',
        labelNames: ['machine_id'],
    }),
    (0, nestjs_prometheus_1.makeGaugeProvider)({
        name: 'active_machines',
        help: 'Number of active machines',
        labelNames: ['machine_id', 'device_id', 'type', 'status'],
    }),
    (0, nestjs_prometheus_1.makeCounterProvider)({
        name: 'api_errors_total',
        help: 'Total number of API errors',
        labelNames: ['endpoint', 'error_type', 'status_code'],
    }),
    (0, nestjs_prometheus_1.makeCounterProvider)({
        name: 'database_operations_total',
        help: 'Total number of database operations',
        labelNames: ['operation', 'collection', 'status'],
    }),
    (0, nestjs_prometheus_1.makeHistogramProvider)({
        name: 'database_operation_duration_seconds',
        help: 'Database operation duration in seconds',
        labelNames: ['operation', 'collection', 'status'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
    }),
];
//# sourceMappingURL=metrics.service.js.map