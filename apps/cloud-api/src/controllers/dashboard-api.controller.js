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
var DashboardApiController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardApiController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
let DashboardApiController = DashboardApiController_1 = class DashboardApiController {
    machineDataModel;
    logger = new common_1.Logger(DashboardApiController_1.name);
    constructor(machineDataModel) {
        this.machineDataModel = machineDataModel;
    }
    async getMachines() {
        try {
            this.logger.log('📊 Запрос данных машин для дашборда');
            const latestData = await this.machineDataModel.aggregate([
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latestDoc: { $first: '$$ROOT' }
                    }
                },
                {
                    $replaceRoot: { newRoot: '$latestDoc' }
                },
                {
                    $sort: { 'metadata.machineId': 1 }
                }
            ]);
            const mtconnectMachines = [];
            const adamMachines = [];
            for (const doc of latestData) {
                if (doc.metadata.source === 'mtconnect') {
                    mtconnectMachines.push({
                        id: doc.metadata.machineId,
                        name: doc.metadata.machineName,
                        ip: 'localhost',
                        port: 7701,
                        type: 'FANUC',
                        status: 'online',
                        connectionStatus: 'ACTIVE',
                        category: 'mtconnect',
                        partCount: doc.data.partCount || 'N/A',
                        program: doc.data.program || 'N/A',
                        execution: doc.data.executionStatus || 'N/A',
                        cycleTime: doc.data.cycleTime ? doc.data.cycleTime.toFixed(2) : 'N/A',
                        cycleConfidence: doc.data.customData?.cycleConfidence || 'N/A',
                        idleTimeMinutes: doc.data.idleTimeMinutes || 0,
                        source: 'SHDR (Direct)',
                        lastUpdate: doc.timestamp
                    });
                }
                else if (doc.metadata.source === 'adam') {
                    adamMachines.push({
                        id: doc.metadata.machineId,
                        name: doc.metadata.machineId,
                        type: 'ADAM-6050',
                        count: doc.data.partCount || 'N/A',
                        cycleTime: doc.data.cycleTime ? doc.data.cycleTime.toFixed(2) : 'N/A',
                        confidence: doc.data.customData?.cycleConfidence || 'N/A',
                        idleTimeMinutes: doc.data.idleTimeMinutes || 0,
                        status: 'active',
                        category: 'adam',
                        lastUpdate: doc.timestamp
                    });
                }
            }
            const response = {
                summary: {
                    total: mtconnectMachines.length + adamMachines.length,
                    mtconnect: {
                        online: mtconnectMachines.filter(m => m.status === 'online').length,
                        total: mtconnectMachines.length
                    },
                    adam: {
                        online: adamMachines.length,
                        total: adamMachines.length
                    }
                },
                machines: {
                    mtconnect: mtconnectMachines,
                    adam: adamMachines
                },
                timestamp: new Date().toISOString()
            };
            this.logger.log(`✅ Отправлено данных: ${mtconnectMachines.length} FANUC + ${adamMachines.length} ADAM`);
            return response;
        }
        catch (error) {
            this.logger.error('❌ Ошибка получения данных машин:', error.message);
            return {
                summary: {
                    total: 0,
                    mtconnect: { online: 0, total: 0 },
                    adam: { online: 0, total: 0 }
                },
                machines: {
                    mtconnect: [],
                    adam: []
                },
                timestamp: new Date().toISOString(),
                error: 'Ошибка получения данных из базы'
            };
        }
    }
    async getHealth() {
        try {
            const count = await this.machineDataModel.countDocuments();
            return {
                status: 'OK',
                timestamp: new Date().toISOString(),
                database: {
                    connected: true,
                    totalRecords: count
                },
                message: 'Cloud API работает нормально'
            };
        }
        catch (error) {
            return {
                status: 'ERROR',
                timestamp: new Date().toISOString(),
                database: {
                    connected: false,
                    error: error.message
                },
                message: 'Ошибка подключения к базе данных'
            };
        }
    }
};
exports.DashboardApiController = DashboardApiController;
__decorate([
    (0, common_1.Get)('machines'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardApiController.prototype, "getMachines", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardApiController.prototype, "getHealth", null);
exports.DashboardApiController = DashboardApiController = DashboardApiController_1 = __decorate([
    (0, common_1.Controller)('api'),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DashboardApiController);
//# sourceMappingURL=dashboard-api.controller.js.map