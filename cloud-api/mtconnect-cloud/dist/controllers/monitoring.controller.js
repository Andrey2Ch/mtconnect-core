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
exports.MonitoringController = void 0;
const common_1 = require("@nestjs/common");
const metrics_service_1 = require("../services/metrics.service");
const winston_logger_service_1 = require("../services/winston-logger.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const os = require("os");
let MonitoringController = class MonitoringController {
    constructor(metricsService, logger, mongoConnection) {
        this.metricsService = metricsService;
        this.logger = logger;
        this.mongoConnection = mongoConnection;
    }
    async getHealthCheck() {
        const startTime = Date.now();
        const timer = this.metricsService.createTimer();
        try {
            const healthData = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                system: {
                    memory: {
                        total: os.totalmem(),
                        free: os.freemem(),
                        used: os.totalmem() - os.freemem(),
                        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
                    },
                    cpu: {
                        load_average: os.loadavg(),
                        cpu_count: os.cpus().length,
                    },
                    platform: os.platform(),
                    arch: os.arch(),
                },
                application: {
                    node_version: process.version,
                    pid: process.pid,
                    memory_usage: process.memoryUsage(),
                },
                database: await this.getDatabaseHealth(),
                services: {
                    api: 'healthy',
                    logging: 'healthy',
                    metrics: 'healthy',
                    authentication: 'healthy',
                },
                response_time_ms: Date.now() - startTime,
            };
            this.logger.log(`Health check completed - Response time: ${healthData.response_time_ms}ms, Memory usage: ${healthData.system.memory.usage_percent}%, Database: ${healthData.database.status}`, 'MonitoringController');
            return healthData;
        }
        catch (error) {
            const duration = timer.end();
            this.logger.error(`Health check failed: ${error.message}`, error.stack, 'MonitoringController');
            throw new common_1.HttpException({
                status: 'error',
                message: 'Health check failed',
                error: error.message,
                timestamp: new Date().toISOString(),
            }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    async getDetailedHealthCheck() {
        const basicHealth = await this.getHealthCheck();
        const detailedHealth = {
            ...basicHealth,
            database_detailed: await this.getDetailedDatabaseHealth(),
            environment_info: {
                node_env: process.env.NODE_ENV,
                port: process.env.PORT,
                mongodb_connected: this.mongoConnection.readyState === 1,
                has_mongodb_uri: !!process.env.MONGODB_URI,
            },
            metrics_summary: await this.metricsService.getMetricsSnapshot(),
            errors: await this.getRecentErrors(),
        };
        return detailedHealth;
    }
    async getSimpleStatus() {
        try {
            const isDbConnected = this.mongoConnection.readyState === 1;
            const memoryUsage = process.memoryUsage();
            const memoryUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
            return {
                status: isDbConnected ? 'ok' : 'degraded',
                database: isDbConnected ? 'connected' : 'disconnected',
                memory_usage_percent: memoryUsagePercent,
                uptime_seconds: Math.floor(process.uptime()),
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
    async getDatabaseHealth() {
        try {
            const dbStatus = this.mongoConnection.readyState;
            const dbStates = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting',
            };
            const stats = await this.mongoConnection.db.stats();
            return {
                status: dbStates[dbStatus] || 'unknown',
                ready_state: dbStatus,
                name: this.mongoConnection.name,
                host: this.mongoConnection.host,
                port: this.mongoConnection.port,
                collections: stats.collections,
                data_size: stats.dataSize,
                storage_size: stats.storageSize,
                index_size: stats.indexSize,
            };
        }
        catch (error) {
            return {
                status: 'error',
                error: error.message,
            };
        }
    }
    async getDetailedDatabaseHealth() {
        try {
            const admin = this.mongoConnection.db.admin();
            const [serverStatus, dbStats] = await Promise.all([
                admin.serverStatus(),
                this.mongoConnection.db.stats(),
            ]);
            return {
                server: {
                    version: serverStatus.version,
                    uptime: serverStatus.uptime,
                    connections: serverStatus.connections,
                    memory: serverStatus.mem,
                    network: serverStatus.network,
                },
                database: {
                    collections: dbStats.collections,
                    documents: dbStats.objects,
                    data_size: dbStats.dataSize,
                    storage_size: dbStats.storageSize,
                    indexes: dbStats.indexes,
                    index_size: dbStats.indexSize,
                    average_object_size: dbStats.avgObjSize,
                },
            };
        }
        catch (error) {
            return {
                error: error.message,
                basic_stats: await this.getDatabaseHealth(),
            };
        }
    }
    async getRecentErrors() {
        return {
            last_24h: 0,
            last_hour: 0,
            most_recent: null,
            note: 'Error tracking would be implemented with log analysis',
        };
    }
    async getMetricsSummary() {
        try {
            const summary = await this.metricsService.getMetricsSnapshot();
            return {
                ...summary,
                system_info: {
                    memory_usage: process.memoryUsage(),
                    cpu_usage: process.cpuUsage(),
                    uptime: process.uptime(),
                },
                note: 'Full Prometheus metrics available at /api/monitoring/metrics',
            };
        }
        catch (error) {
            this.logger.error(`Failed to get metrics summary: ${error.message}`, error.stack, 'MonitoringController');
            throw new common_1.HttpException({
                status: 'error',
                message: 'Failed to retrieve metrics summary',
                error: error.message,
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.MonitoringController = MonitoringController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getHealthCheck", null);
__decorate([
    (0, common_1.Get)('health/detailed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getDetailedHealthCheck", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getSimpleStatus", null);
__decorate([
    (0, common_1.Get)('metrics/summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getMetricsSummary", null);
exports.MonitoringController = MonitoringController = __decorate([
    (0, common_1.Controller)('api/monitoring'),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService,
        winston_logger_service_1.WinstonLoggerService,
        mongoose_2.Connection])
], MonitoringController);
//# sourceMappingURL=monitoring.controller.js.map