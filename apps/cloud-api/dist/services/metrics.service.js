"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
let MetricsService = class MetricsService {
    constructor() {
        this.metrics = {
            httpRequests: 0,
            dataIngestionCount: 0,
            activeConnections: 0,
            activeMachines: 0,
            apiErrors: 0,
            databaseOperations: 0,
        };
    }
    recordHttpRequest(method, endpoint, statusCode, duration) {
        this.metrics.httpRequests++;
        console.log('[METRICS] HTTP request recorded');
    }
    recordApiError(endpoint, errorType, statusCode) {
        this.metrics.apiErrors++;
        console.log('[METRICS] API error recorded');
    }
    recordDataIngestion(machineId, dataSize, successful) {
        this.metrics.dataIngestionCount++;
        console.log('[METRICS] Data ingestion recorded');
    }
    updateActiveMachines(count) {
        this.metrics.activeMachines = count;
        console.log('[METRICS] Active machines updated');
    }
    recordActiveMachine(machineId, isActive) {
        console.log('[METRICS] Machine activity recorded');
    }
    recordDatabaseOperation(operation, collection, duration, successful) {
        this.metrics.databaseOperations++;
        console.log('[METRICS] Database operation recorded');
    }
    incrementActiveConnections() {
        this.metrics.activeConnections++;
        console.log('[METRICS] Active connections incremented');
    }
    decrementActiveConnections() {
        this.metrics.activeConnections--;
        console.log('[METRICS] Active connections decremented');
    }
    setActiveConnections(count) {
        this.metrics.activeConnections = count;
        console.log('[METRICS] Active connections set');
    }
    recordMachineEvent(machineId, eventType) {
        console.log('[METRICS] Machine event recorded');
    }
    recordAdamDeviceStatus(deviceId, isOnline) {
        console.log('[METRICS] ADAM device status recorded');
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
            metrics: this.metrics
        };
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)()
], MetricsService);
//# sourceMappingURL=metrics.service.js.map