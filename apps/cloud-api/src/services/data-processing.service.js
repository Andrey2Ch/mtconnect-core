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
var DataProcessingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProcessingService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
const aggregated_data_schema_1 = require("../schemas/aggregated-data.schema");
const data_events_gateway_1 = require("../gateways/data-events.gateway");
const alerting_service_1 = require("./alerting.service");
let DataProcessingService = DataProcessingService_1 = class DataProcessingService {
    machineDataModel;
    aggregatedDataModel;
    dataEventsGateway;
    alertingService;
    logger = new common_1.Logger(DataProcessingService_1.name);
    constructor(machineDataModel, aggregatedDataModel, dataEventsGateway, alertingService) {
        this.machineDataModel = machineDataModel;
        this.aggregatedDataModel = aggregatedDataModel;
        this.dataEventsGateway = dataEventsGateway;
        this.alertingService = alertingService;
        this.logger.log('DataProcessingService initialized with WebSocket and Alerting integration');
    }
    async processIncomingData(data) {
        this.logger.log(`Processing incoming data for machine: ${data.machineId}`);
        this.alertingService.checkAlerts(data.machineId, data);
        this.dataEventsGateway.sendMachineData(data.machineId, data);
        await this.triggerAggregation(data.machineId);
        return data;
    }
    async aggregateHourlyData(machineId) {
        const now = new Date();
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        this.logger.log(`Aggregating hourly data for machine ${machineId} from ${hourStart} to ${hourEnd}`);
        const pipeline = [
            {
                $match: {
                    machineId,
                    timestamp: { $gte: hourStart, $lt: hourEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTemperature: { $avg: '$data.temperature' },
                    totalPartsProduced: { $sum: '$data.partsProduced' },
                    maxSpindleSpeed: { $max: '$data.spindleSpeed' },
                    minSpindleSpeed: { $min: '$data.spindleSpeed' },
                    dataCount: { $sum: 1 }
                }
            }
        ];
        const result = await this.machineDataModel.aggregate(pipeline);
        if (result.length > 0) {
            const aggregatedData = {
                machineId,
                timestamp: hourStart,
                aggregationType: 'hourly',
                data: {
                    avgTemperature: result[0].avgTemperature,
                    totalPartsProduced: result[0].totalPartsProduced,
                    maxSpindleSpeed: result[0].maxSpindleSpeed,
                    minSpindleSpeed: result[0].minSpindleSpeed,
                    dataPointsCount: result[0].dataCount
                }
            };
            await this.aggregatedDataModel.create(aggregatedData);
            this.dataEventsGateway.sendAggregatedData(machineId, aggregatedData);
            this.logger.log(`Hourly aggregation completed for machine ${machineId}`);
        }
    }
    async aggregateDailyData(machineId) {
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        this.logger.log(`Aggregating daily data for machine ${machineId} from ${dayStart} to ${dayEnd}`);
        const pipeline = [
            {
                $match: {
                    machineId,
                    timestamp: { $gte: dayStart, $lt: dayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTemperature: { $avg: '$data.temperature' },
                    totalPartsProduced: { $sum: '$data.partsProduced' },
                    maxSpindleSpeed: { $max: '$data.spindleSpeed' },
                    minSpindleSpeed: { $min: '$data.spindleSpeed' },
                    avgSpindleSpeed: { $avg: '$data.spindleSpeed' },
                    dataCount: { $sum: 1 }
                }
            }
        ];
        const result = await this.machineDataModel.aggregate(pipeline);
        if (result.length > 0) {
            const aggregatedData = {
                machineId,
                timestamp: dayStart,
                aggregationType: 'daily',
                data: {
                    avgTemperature: result[0].avgTemperature,
                    totalPartsProduced: result[0].totalPartsProduced,
                    maxSpindleSpeed: result[0].maxSpindleSpeed,
                    minSpindleSpeed: result[0].minSpindleSpeed,
                    avgSpindleSpeed: result[0].avgSpindleSpeed,
                    dataPointsCount: result[0].dataCount
                }
            };
            await this.aggregatedDataModel.create(aggregatedData);
            this.dataEventsGateway.sendAggregatedData(machineId, aggregatedData);
            this.logger.log(`Daily aggregation completed for machine ${machineId}`);
        }
    }
    async triggerAggregation(machineId) {
        setImmediate(async () => {
            try {
                await this.aggregateHourlyData(machineId);
                const now = new Date();
                if (now.getMinutes() === 0) {
                    await this.aggregateDailyData(machineId);
                }
            }
            catch (error) {
                this.logger.error(`Aggregation failed for machine ${machineId}:`, error);
                this.dataEventsGateway.sendAlert(machineId, {
                    type: 'aggregation-error',
                    severity: 'warning',
                    message: `Aggregation failed: ${error.message}`,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }
};
exports.DataProcessingService = DataProcessingService;
exports.DataProcessingService = DataProcessingService = DataProcessingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __param(1, (0, mongoose_1.InjectModel)(aggregated_data_schema_1.AggregatedData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        data_events_gateway_1.DataEventsGateway,
        alerting_service_1.AlertingService])
], DataProcessingService);
//# sourceMappingURL=data-processing.service.js.map