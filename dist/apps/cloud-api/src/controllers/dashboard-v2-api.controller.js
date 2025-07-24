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
exports.DashboardV2ApiController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DashboardV2ApiController = class DashboardV2ApiController {
    machineDataModel;
    constructor(machineDataModel) {
        this.machineDataModel = machineDataModel;
    }
    async getMachinesV2() {
        try {
            const machines = await this.machineDataModel.aggregate([
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latestData: { $first: '$$ROOT' }
                    }
                },
                {
                    $replaceRoot: { newRoot: '$latestData' }
                }
            ]);
            const unifiedMachines = machines
                .filter(machine => machine && machine.metadata && machine.metadata.machineId)
                .map(machine => {
                const timeSinceUpdate = Date.now() - new Date(machine.timestamp).getTime();
                const isOnline = timeSinceUpdate < 300000;
                const machineId = machine.metadata.machineId;
                const isFanuc = machineId && machineId.startsWith('M_');
                const isCounter = !isFanuc;
                let status = 'offline';
                if (isOnline) {
                    if (isFanuc) {
                        const execution = machine.data?.executionStatus || machine.data?.execution;
                        const partCount = machine.data?.partCount || 0;
                        const program = machine.data?.program;
                        if (execution === 'ACTIVE' && partCount > 0) {
                            status = 'active';
                        }
                        else if (execution === 'READY') {
                            status = 'setup';
                        }
                        else if (program) {
                            status = 'attention';
                        }
                        else {
                            status = 'idle';
                        }
                    }
                    else {
                        const partCount = machine.data?.partCount || machine.data?.count || 0;
                        status = partCount > 0 ? 'active' : 'idle';
                    }
                }
                return {
                    id: machineId,
                    name: this.getDisplayName(machineId),
                    status: status,
                    type: isFanuc ? 'cnc' : 'counter',
                    primaryValue: machine.data?.partCount || machine.data?.count || 0,
                    secondaryValue: isFanuc ? (machine.data?.program || null) : null,
                    cycleTime: machine.data?.cycleTime ? Math.round(machine.data.cycleTime * 10) / 10 : null,
                    lastUpdate: machine.timestamp,
                    isOnline: isOnline,
                    hourlyActivity: this.generateMockHourlyActivity()
                };
            })
                .sort((a, b) => a.id.localeCompare(b.id));
            return {
                success: true,
                data: unifiedMachines,
                timestamp: new Date().toISOString(),
                totalMachines: unifiedMachines.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }
    async getSummary() {
        try {
            const machines = await this.getMachinesV2();
            const data = machines.data || [];
            const activeMachines = data.filter(m => m.status === 'active').length;
            const totalParts = data.reduce((sum, m) => sum + (m.primaryValue || 0), 0);
            const onlineMachines = data.filter(m => m.isOnline).length;
            const alerts = data.filter(m => m.status === 'attention').length;
            const oee = data.length > 0 ? Math.round((activeMachines / data.length) * 100) : 0;
            return {
                success: true,
                data: {
                    oee: oee,
                    totalParts: totalParts,
                    activeMachines: activeMachines,
                    totalMachines: data.length,
                    onlineMachines: onlineMachines,
                    alerts: alerts
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async getHourlyData(machineId) {
        return {
            success: true,
            data: {
                machineId: machineId,
                hourlyActivity: this.generateMockHourlyActivity(),
                period: '24h'
            }
        };
    }
    getDisplayName(machineId) {
        if (machineId.startsWith('M_')) {
            return machineId.replace('M_', '').replace('_', '-');
        }
        return machineId;
    }
    generateMockHourlyActivity() {
        const activity = [];
        for (let i = 0; i < 24; i++) {
            activity.push(Math.floor(Math.random() * 100));
        }
        return activity;
    }
};
exports.DashboardV2ApiController = DashboardV2ApiController;
__decorate([
    (0, common_1.Get)('machines'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardV2ApiController.prototype, "getMachinesV2", null);
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardV2ApiController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('hourly/:machineId'),
    __param(0, (0, common_1.Param)('machineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardV2ApiController.prototype, "getHourlyData", null);
exports.DashboardV2ApiController = DashboardV2ApiController = __decorate([
    (0, common_1.Controller)('api/v2/dashboard'),
    __param(0, (0, mongoose_1.InjectModel)('machine_data')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DashboardV2ApiController);
//# sourceMappingURL=dashboard-v2-api.controller.js.map