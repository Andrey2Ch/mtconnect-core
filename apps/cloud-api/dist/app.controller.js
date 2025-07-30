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
    constructor(appService, machineDataModel) {
        this.appService = appService;
        this.machineDataModel = machineDataModel;
    }
    getHello() {
        return 'MTConnect Cloud API is running! 🚀';
    }
    getHealth() {
        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'MTConnect Cloud API'
        };
    }
    async getMachines() {
        try {
            const latestData = await this.machineDataModel.aggregate([
                {
                    $sort: { 'metadata.machineId': 1, timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latest: { $first: '$$ROOT' }
                    }
                }
            ]);
            const mtconnectMachines = [];
            const adamMachines = [];
            latestData.forEach(item => {
                const machine = {
                    id: item.latest.metadata.machineId,
                    name: item.latest.metadata.machineName,
                    type: item.latest.metadata.machineType,
                    status: 'online',
                    lastUpdate: item.latest.timestamp,
                    data: item.latest.data || {
                        partCount: 0,
                        program: 'N/A',
                        executionStatus: 'UNAVAILABLE',
                        cycleTime: 0,
                        cycleTimeConfidence: 'LOW'
                    }
                };
                if (item.latest.metadata.machineType === 'FANUC') {
                    mtconnectMachines.push(machine);
                }
                else {
                    adamMachines.push(machine);
                }
            });
            return {
                success: true,
                timestamp: new Date().toISOString(),
                summary: {
                    total: mtconnectMachines.length + adamMachines.length,
                    mtconnect: {
                        online: mtconnectMachines.length,
                        total: 8
                    },
                    adam: {
                        online: adamMachines.length,
                        total: 10
                    }
                },
                machines: {
                    mtconnect: mtconnectMachines,
                    adam: adamMachines
                }
            };
        }
        catch (error) {
            console.error('Error fetching machines:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                summary: { total: 0, mtconnect: { online: 0, total: 8 }, adam: { online: 0, total: 10 } },
                machines: { mtconnect: [], adam: [] }
            };
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('api/dashboard/machines'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getMachines", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [app_service_1.AppService,
        mongoose_2.Model])
], AppController);
//# sourceMappingURL=app.controller.js.map