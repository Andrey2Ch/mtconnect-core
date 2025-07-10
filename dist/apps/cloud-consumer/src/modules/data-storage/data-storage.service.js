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
var DataStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("./schemas/machine-data.schema");
const adam_data_schema_1 = require("./schemas/adam-data.schema");
let DataStorageService = DataStorageService_1 = class DataStorageService {
    machineDataModel;
    adamDataModel;
    logger = new common_1.Logger(DataStorageService_1.name);
    constructor(machineDataModel, adamDataModel) {
        this.machineDataModel = machineDataModel;
        this.adamDataModel = adamDataModel;
    }
    async saveMachineData(data) {
        try {
            const promises = data.data.map(async (machineItem) => {
                const machineData = new this.machineDataModel({
                    machineId: machineItem.machineId,
                    machineName: machineItem.machineName,
                    timestamp: new Date(machineItem.timestamp),
                    status: machineItem.data.executionStatus || 'UNKNOWN',
                    program: machineItem.data.program,
                    additionalData: {
                        partCount: machineItem.data.partCount,
                        cycleTime: machineItem.data.cycleTime,
                        availability: machineItem.data.availability,
                        block: machineItem.data.block,
                        line: machineItem.data.line,
                        adamData: machineItem.data.adamData,
                    },
                    source: 'mtconnect',
                });
                return machineData.save();
            });
            await Promise.all(promises);
            this.logger.debug(`Saved machine data for ${data.data.length} machines from gateway ${data.edgeGatewayId}`);
        }
        catch (error) {
            this.logger.error(`Failed to save machine data: ${error.message}`, error.stack);
            throw error;
        }
    }
    async saveAdamData(data) {
        try {
            const adamData = new this.adamDataModel({
                deviceId: data.machineId,
                deviceName: data.machineName,
                timestamp: new Date(),
                deviceType: 'adam-io',
                digitalInputs: data.discreteInputs ?
                    Object.fromEntries(data.discreteInputs.map((val, idx) => [`DI${idx}`, val])) : {},
                analogInputs: data.analogInputs ?
                    Object.fromEntries(data.analogInputs.map((val, idx) => [`AI${idx}`, val])) : {},
                additionalData: {
                    counter: data.counter,
                    cycleTime: data.cycleTime,
                    confidence: data.confidence,
                    metadata: data.metadata,
                },
                source: 'adam',
            });
            await adamData.save();
            this.logger.debug(`Saved ADAM data for ${data.machineId}`);
        }
        catch (error) {
            this.logger.error(`Failed to save ADAM data: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getRecentData(machineId, limit = 100) {
        const query = machineId ? { machineId } : {};
        const [machineData, adamData] = await Promise.all([
            this.machineDataModel
                .find(query)
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean()
                .exec(),
            this.adamDataModel
                .find({})
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean()
                .exec(),
        ]);
        return {
            machineData,
            adamData,
            totalRecords: machineData.length + adamData.length,
        };
    }
    async getMachines() {
        const [machines, adamDevices] = await Promise.all([
            this.machineDataModel.distinct('machineId').exec(),
            this.adamDataModel.distinct('deviceId').exec(),
        ]);
        return {
            machines,
            adamDevices,
        };
    }
    async getStats() {
        const [machineCount, adamCount, recentMachineData, recentAdamData] = await Promise.all([
            this.machineDataModel.countDocuments().exec(),
            this.adamDataModel.countDocuments().exec(),
            this.machineDataModel.findOne().sort({ timestamp: -1 }).exec(),
            this.adamDataModel.findOne().sort({ timestamp: -1 }).exec(),
        ]);
        return {
            totalMachineRecords: machineCount,
            totalAdamRecords: adamCount,
            lastMachineDataTimestamp: recentMachineData?.timestamp,
            lastAdamDataTimestamp: recentAdamData?.timestamp,
        };
    }
};
exports.DataStorageService = DataStorageService;
exports.DataStorageService = DataStorageService = DataStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __param(1, (0, mongoose_1.InjectModel)(adam_data_schema_1.AdamData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], DataStorageService);
//# sourceMappingURL=data-storage.service.js.map