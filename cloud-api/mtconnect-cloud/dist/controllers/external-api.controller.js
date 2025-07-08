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
exports.ExternalApiController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const throttler_1 = require("@nestjs/throttler");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
const edge_gateway_data_dto_1 = require("../dto/edge-gateway-data.dto");
const sanitization_service_1 = require("../services/sanitization.service");
const winston_logger_service_1 = require("../services/winston-logger.service");
const metrics_service_1 = require("../services/metrics.service");
let ExternalApiController = class ExternalApiController {
    constructor(machineDataModel, logger, sanitizationService, metricsService) {
        this.machineDataModel = machineDataModel;
        this.logger = logger;
        this.sanitizationService = sanitizationService;
        this.metricsService = metricsService;
    }
    async setup(body) {
        try {
            this.logger.log(`Setup request for gateway: ${body.edgeGatewayId}`, 'ExternalApiController');
            const sanitizedGatewayId = this.sanitizationService.sanitizeText(body.edgeGatewayId, 100);
            const sanitizedMachines = body.machines?.map(machine => this.sanitizationService.sanitizeText(machine, 100)).filter(machine => machine.length > 0) || [];
            if (!sanitizedGatewayId) {
                throw new common_1.BadRequestException('Invalid gateway ID provided');
            }
            if (sanitizedMachines.length === 0) {
                throw new common_1.BadRequestException('At least one valid machine must be provided');
            }
            this.logger.log(`Setting up gateway ${sanitizedGatewayId} with ${sanitizedMachines.length} machines`, 'ExternalApiController');
            return {
                status: 'success',
                message: 'Edge Gateway configured successfully',
                gatewayId: sanitizedGatewayId,
                machineCount: sanitizedMachines.length
            };
        }
        catch (error) {
            this.logger.error(`Setup failed: ${error.message}`, error.stack, 'ExternalApiController');
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to configure edge gateway');
        }
    }
    async ingestData(data) {
        const startTime = Date.now();
        try {
            this.logger.log(`Data ingestion from gateway: ${data.edgeGatewayId}`, 'ExternalApiController');
            const now = new Date();
            const dataTime = new Date(data.timestamp);
            if (dataTime > now) {
                throw new common_1.BadRequestException('Timestamp cannot be in the future');
            }
            const machineIds = data.data.map(m => m.machineId);
            const uniqueIds = new Set(machineIds);
            if (machineIds.length !== uniqueIds.size) {
                throw new common_1.BadRequestException('Duplicate machine IDs detected');
            }
            const sanitizedMachines = data.data.map(machine => {
                const sanitizedMachineId = this.sanitizationService.sanitizeText(machine.machineId, 100);
                const sanitizedMachineName = this.sanitizationService.sanitizeText(machine.machineName, 255);
                if (!sanitizedMachineId || !sanitizedMachineName) {
                    throw new common_1.BadRequestException(`Invalid machine data for machine: ${machine.machineId}`);
                }
                const sanitizedData = this.sanitizationService.sanitizeMachineData(machine.data);
                return {
                    timestamp: dataTime,
                    metadata: {
                        edgeGatewayId: this.sanitizationService.sanitizeText(data.edgeGatewayId, 100),
                        machineId: sanitizedMachineId,
                        machineName: sanitizedMachineName,
                    },
                    data: sanitizedData,
                    createdAt: now
                };
            });
            const result = await this.machineDataModel.insertMany(sanitizedMachines);
            const processingTime = Date.now() - startTime;
            this.logger.log(`Ingested ${result.length} machine records in ${processingTime}ms`, 'ExternalApiController');
            return {
                status: 'success',
                message: `Stored data for ${result.length} machines`,
                recordsProcessed: result.length,
                processingTimeMs: processingTime
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`Data ingestion failed after ${processingTime}ms: ${error.message}`, error.stack, 'ExternalApiController');
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to process machine data');
        }
    }
    async handleEvent(eventData) {
        try {
            this.logger.log(`Event received: ${JSON.stringify(eventData)}`, 'ExternalApiController');
            const sanitizedEvent = {
                type: this.sanitizationService.sanitizeText(eventData.type, 50),
                message: this.sanitizationService.sanitizeText(eventData.message, 1000),
                source: this.sanitizationService.sanitizeText(eventData.source, 100),
                timestamp: new Date(eventData.timestamp || Date.now()),
                data: this.sanitizationService.sanitizeAdamData(eventData.data)
            };
            return {
                status: 'success',
                message: 'Event processed successfully',
                eventType: sanitizedEvent.type
            };
        }
        catch (error) {
            this.logger.error(`Event processing failed: ${error.message}`, error.stack, 'ExternalApiController');
            throw new common_1.InternalServerErrorException('Failed to process event');
        }
    }
    async getCycleTime(machineId, from, to) {
        try {
            const sanitizedMachineId = this.sanitizationService.sanitizeText(machineId, 100);
            if (!sanitizedMachineId) {
                throw new common_1.BadRequestException('Invalid machine ID');
            }
            const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
            const toDate = to ? new Date(to) : new Date();
            if (fromDate >= toDate) {
                throw new common_1.BadRequestException('From date must be before to date');
            }
            this.logger.log(`Fetching cycle time for machine ${sanitizedMachineId} from ${fromDate} to ${toDate}`, 'ExternalApiController');
            const data = await this.machineDataModel.find({
                'metadata.machineId': sanitizedMachineId,
                timestamp: { $gte: fromDate, $lte: toDate },
                'data.cycleTime': { $exists: true, $ne: null }
            })
                .select('timestamp data.cycleTime')
                .sort({ timestamp: 1 })
                .limit(1000)
                .exec();
            if (data.length === 0) {
                throw new common_1.NotFoundException(`No cycle time data found for machine ${sanitizedMachineId}`);
            }
            const cycleTimes = data.map(d => ({
                timestamp: d.timestamp,
                cycleTime: d.data.cycleTime
            }));
            const avgCycleTime = cycleTimes.reduce((sum, item) => sum + item.cycleTime, 0) / cycleTimes.length;
            return {
                machineId: sanitizedMachineId,
                period: { from: fromDate, to: toDate },
                averageCycleTime: Math.round(avgCycleTime * 100) / 100,
                dataPoints: cycleTimes.length,
                data: cycleTimes
            };
        }
        catch (error) {
            this.logger.error(`Cycle time query failed: ${error.message}`, error.stack, 'ExternalApiController');
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to retrieve cycle time data');
        }
    }
    async healthCheck() {
        try {
            const dbStats = await this.machineDataModel.db.db.admin().ping();
            return {
                status: 'healthy',
                timestamp: new Date(),
                database: 'connected',
                version: '1.0.0'
            };
        }
        catch (error) {
            this.logger.error(`Health check failed: ${error.message}`, error.stack, 'ExternalApiController');
            throw new common_1.InternalServerErrorException('Service health check failed');
        }
    }
};
exports.ExternalApiController = ExternalApiController;
__decorate([
    (0, common_1.Post)('setup'),
    (0, throttler_1.Throttle)({ short: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "setup", null);
__decorate([
    (0, common_1.Post)('data'),
    (0, throttler_1.Throttle)({ short: { limit: 200, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [edge_gateway_data_dto_1.EdgeGatewayDataDto]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "ingestData", null);
__decorate([
    (0, common_1.Post)('event'),
    (0, throttler_1.Throttle)({ short: { limit: 50, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "handleEvent", null);
__decorate([
    (0, common_1.Get)('machines/:id/cycle-time'),
    (0, throttler_1.Throttle)({ short: { limit: 100, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "getCycleTime", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, throttler_1.Throttle)({ short: { limit: 60, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "healthCheck", null);
exports.ExternalApiController = ExternalApiController = __decorate([
    (0, common_1.Controller)('api/ext'),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        winston_logger_service_1.WinstonLoggerService,
        sanitization_service_1.SanitizationService,
        metrics_service_1.MetricsService])
], ExternalApiController);
//# sourceMappingURL=external-api.controller.js.map