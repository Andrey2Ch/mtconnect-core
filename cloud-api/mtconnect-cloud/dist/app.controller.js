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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const app_service_1 = require("./app.service");
const machine_data_schema_1 = require("./schemas/machine-data.schema");
let AppController = class AppController {
    constructor(appService, connection, machineDataModel) {
        this.appService = appService;
        this.connection = connection;
        this.machineDataModel = machineDataModel;
    }
    getHello() {
        return this.appService.getHello();
    }
    async getHealth() {
        const dbStatus = this.connection.readyState === 1 ? 'connected' : 'disconnected';
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                name: this.connection.db?.databaseName || 'unknown'
            },
            environment: process.env.NODE_ENV || 'development'
        };
    }
    async testTimeSeries() {
        const testData = new this.machineDataModel({
            timestamp: new Date(),
            metadata: {
                edgeGatewayId: 'test-gateway-01',
                machineId: 'XD-20',
                machineName: 'FANUC XD-20'
            },
            data: {
                partCount: 42,
                cycleTime: 125.5,
                executionStatus: 'ACTIVE',
                availability: 'AVAILABLE',
                program: 'O1234',
                block: 'N100',
                line: '15',
                adamData: {
                    digitalInputs: [1, 0, 1, 1, 0, 0, 0, 0],
                    digitalOutputs: [0, 1, 0, 0, 1, 1, 0, 0]
                }
            }
        });
        const saved = await testData.save();
        return {
            message: 'TimeSeries test data inserted successfully',
            id: saved._id,
            timestamp: saved.timestamp,
            collection: 'machine_data'
        };
    }
    async testQuery() {
        const count = await this.machineDataModel.countDocuments();
        const latest = await this.machineDataModel.findOne().sort({ timestamp: -1 });
        return {
            totalRecords: count,
            latestRecord: latest,
            collection: 'machine_data'
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Post)('test-timeseries'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "testTimeSeries", null);
__decorate([
    (0, common_1.Get)('test-query'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "testQuery", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __param(2, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [app_service_1.AppService,
        mongoose_2.Connection,
        mongoose_2.Model])
], AppController);
//# sourceMappingURL=app.controller.js.map