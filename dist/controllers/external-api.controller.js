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
const machine_data_schema_1 = require("../schemas/machine-data.schema");
const edge_gateway_data_dto_1 = require("../dto/edge-gateway-data.dto");
let ExternalApiController = class ExternalApiController {
    constructor(machineDataModel) {
        this.machineDataModel = machineDataModel;
    }
    async setup(body) {
        // Idempotency: проверяем существование
        const existing = await this.machineDataModel.findOne({
            'metadata.edgeGatewayId': body.edgeGatewayId
        });
        if (existing) {
            return {
                status: 'exists',
                edgeGatewayId: body.edgeGatewayId,
                machineCount: body.machines.length
            };
        }
        // Создаём начальную запись
        const setupData = new this.machineDataModel({
            timestamp: new Date(),
            metadata: {
                edgeGatewayId: body.edgeGatewayId,
                machineId: 'setup',
                machineName: 'Gateway Setup'
            },
            data: {
                setup: true,
                machines: body.machines
            }
        });
        await setupData.save();
        return {
            status: 'created',
            edgeGatewayId: body.edgeGatewayId,
            machineCount: body.machines.length
        };
    }
    async receiveData(edgeData) {
        try {
            const documents = edgeData.data.map(item => ({
                timestamp: new Date(item.timestamp),
                metadata: {
                    edgeGatewayId: edgeData.edgeGatewayId,
                    machineId: item.machineId,
                    machineName: item.machineName
                },
                data: item.data
            }));
            const result = await this.machineDataModel.insertMany(documents);
            return {
                status: 'success',
                received: edgeData.data.length,
                saved: result.length,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async receiveEvent(event) {
        const eventData = new this.machineDataModel({
            timestamp: new Date(event.timestamp),
            metadata: {
                edgeGatewayId: 'external-event',
                machineId: event.machineId,
                machineName: event.machineId
            },
            data: {
                eventType: event.eventType,
                eventData: event.data
            }
        });
        await eventData.save();
        return {
            status: 'received',
            eventId: eventData._id,
            timestamp: new Date().toISOString()
        };
    }
    async getCycleTime(machineId, from, to) {
        const query = { 'metadata.machineId': machineId };
        if (from || to) {
            query.timestamp = {};
            if (from)
                query.timestamp.$gte = new Date(from);
            if (to)
                query.timestamp.$lte = new Date(to);
        }
        const data = await this.machineDataModel
            .find(query)
            .sort({ timestamp: -1 })
            .limit(100)
            .exec();
        const cycleTimeData = data
            .filter(item => item.data.cycleTime !== undefined)
            .map(item => ({
            timestamp: item.timestamp,
            cycleTime: item.data.cycleTime,
            partCount: item.data.partCount
        }));
        return {
            machineId,
            totalRecords: cycleTimeData.length,
            averageCycleTime: cycleTimeData.length > 0
                ? cycleTimeData.reduce((sum, item) => sum + item.cycleTime, 0) / cycleTimeData.length
                : null,
            data: cycleTimeData
        };
    }
    async healthCheck() {
        try {
            const dbStatus = await this.machineDataModel.db.db?.admin().ping();
            const recentData = await this.machineDataModel.countDocuments({
                timestamp: { $gte: new Date(Date.now() - 60000) } // последняя минута
            });
            return {
                status: 'ok',
                database: dbStatus ? 'connected' : 'disconnected',
                recentData,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'error',
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    }
};
exports.ExternalApiController = ExternalApiController;
__decorate([
    (0, common_1.Post)('setup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "setup", null);
__decorate([
    (0, common_1.Post)('data'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [edge_gateway_data_dto_1.EdgeGatewayDataDto]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "receiveData", null);
__decorate([
    (0, common_1.Post)('event'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "receiveEvent", null);
__decorate([
    (0, common_1.Get)('machines/:id/cycle-time'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "getCycleTime", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "healthCheck", null);
exports.ExternalApiController = ExternalApiController = __decorate([
    (0, common_1.Controller)('api/ext'),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ExternalApiController);
