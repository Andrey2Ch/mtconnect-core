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
exports.TestDatabaseController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_configuration_schema_1 = require("../schemas/machine-configuration.schema");
const machine_state_schema_1 = require("../schemas/machine-state.schema");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
const aggregated_data_schema_1 = require("../schemas/aggregated-data.schema");
let TestDatabaseController = class TestDatabaseController {
    constructor(machineConfigModel, machineStateModel, machineDataModel, aggregatedDataModel) {
        this.machineConfigModel = machineConfigModel;
        this.machineStateModel = machineStateModel;
        this.machineDataModel = machineDataModel;
        this.aggregatedDataModel = aggregatedDataModel;
    }
    async createMachineConfig(configData) {
        try {
            const config = new this.machineConfigModel(configData);
            await config.save();
            return {
                success: true,
                message: 'Machine Configuration создана успешно',
                data: config,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка создания Machine Configuration',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getMachineConfig(machineId) {
        try {
            const config = await this.machineConfigModel.findOne({ machineId });
            if (!config) {
                throw new common_1.HttpException('Machine Configuration не найдена', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: config,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка получения Machine Configuration',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async createMachineState(stateData) {
        try {
            const state = new this.machineStateModel(stateData);
            await state.save();
            return {
                success: true,
                message: 'Machine State создан успешно',
                data: state,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка создания Machine State',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getMachineState(machineId) {
        try {
            const state = await this.machineStateModel.findOne({ machineId });
            if (!state) {
                throw new common_1.HttpException('Machine State не найдено', common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: state,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка получения Machine State',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async createMachineData(machineDataBody) {
        try {
            const data = new this.machineDataModel(machineDataBody);
            await data.save();
            return {
                success: true,
                message: 'Machine Data (TimeSeries) создан успешно',
                data: data,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка создания Machine Data',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getMachineData(machineId) {
        try {
            const data = await this.machineDataModel
                .find({ 'metadata.machineId': machineId })
                .sort({ timestamp: -1 })
                .limit(10);
            return {
                success: true,
                data: data,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка получения Machine Data',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async createAggregatedData(aggregatedDataBody) {
        try {
            const data = new this.aggregatedDataModel(aggregatedDataBody);
            await data.save();
            return {
                success: true,
                message: 'Aggregated Data создан успешно',
                data: data,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка создания Aggregated Data',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getAggregatedData(machineId) {
        try {
            const data = await this.aggregatedDataModel
                .find({ 'metadata.machineId': machineId })
                .sort({ timestamp: -1 })
                .limit(10);
            return {
                success: true,
                data: data,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка получения Aggregated Data',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getDatabaseStatus() {
        try {
            const [configCount, stateCount, dataCount, aggregatedCount] = await Promise.all([
                this.machineConfigModel.countDocuments(),
                this.machineStateModel.countDocuments(),
                this.machineDataModel.countDocuments(),
                this.aggregatedDataModel.countDocuments(),
            ]);
            return {
                success: true,
                message: 'Database Status',
                data: {
                    machine_configurations: configCount,
                    machine_states: stateCount,
                    machine_data: dataCount,
                    aggregated_data: aggregatedCount,
                    total_documents: configCount + stateCount + dataCount + aggregatedCount,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                message: 'Ошибка получения статуса базы данных',
                error: error.message,
            }, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.TestDatabaseController = TestDatabaseController;
__decorate([
    (0, common_1.Post)('machine-config'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "createMachineConfig", null);
__decorate([
    (0, common_1.Get)('machine-config/:machineId'),
    __param(0, (0, common_1.Param)('machineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "getMachineConfig", null);
__decorate([
    (0, common_1.Post)('machine-state'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "createMachineState", null);
__decorate([
    (0, common_1.Get)('machine-state/:machineId'),
    __param(0, (0, common_1.Param)('machineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "getMachineState", null);
__decorate([
    (0, common_1.Post)('machine-data'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "createMachineData", null);
__decorate([
    (0, common_1.Get)('machine-data/:machineId'),
    __param(0, (0, common_1.Param)('machineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "getMachineData", null);
__decorate([
    (0, common_1.Post)('aggregated-data'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "createAggregatedData", null);
__decorate([
    (0, common_1.Get)('aggregated-data/:machineId'),
    __param(0, (0, common_1.Param)('machineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "getAggregatedData", null);
__decorate([
    (0, common_1.Get)('database-status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestDatabaseController.prototype, "getDatabaseStatus", null);
exports.TestDatabaseController = TestDatabaseController = __decorate([
    (0, common_1.Controller)('api/test'),
    __param(0, (0, mongoose_1.InjectModel)(machine_configuration_schema_1.MachineConfiguration.name)),
    __param(1, (0, mongoose_1.InjectModel)(machine_state_schema_1.MachineState.name)),
    __param(2, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __param(3, (0, mongoose_1.InjectModel)(aggregated_data_schema_1.AggregatedData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], TestDatabaseController);
//# sourceMappingURL=test-database.controller.js.map