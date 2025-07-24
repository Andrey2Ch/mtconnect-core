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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineStateService = exports.MachineStatus = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
const cycle_analysis_service_1 = require("./cycle-analysis.service");
var MachineStatus;
(function (MachineStatus) {
    MachineStatus["Working"] = "\u0420\u0430\u0431\u043E\u0442\u0430";
    MachineStatus["Idle"] = "\u041F\u0440\u043E\u0441\u0442\u043E\u0439";
    MachineStatus["Error"] = "\u041E\u0448\u0438\u0431\u043A\u0430";
    MachineStatus["Offline"] = "\u041D\u0435 \u0432 \u0441\u0435\u0442\u0438";
})(MachineStatus || (exports.MachineStatus = MachineStatus = {}));
const IDEAL_CYCLE_TIME_SECONDS = 25 * 60;
const PLANNED_WORKING_TIME_SECONDS = 8 * 60 * 60;
let MachineStateService = class MachineStateService {
    constructor(machineDataModel, cycleAnalysisService) {
        this.machineDataModel = machineDataModel;
        this.cycleAnalysisService = cycleAnalysisService;
    }
    async getMachineState(machineId, from, to) {
        const cycles = await this.cycleAnalysisService.analyzeCycles(machineId, from, to);
        const totalProductionTime = cycles.reduce((sum, cycle) => sum + cycle.duration, 0);
        const partCount = cycles.length;
        const availability = (totalProductionTime / PLANNED_WORKING_TIME_SECONDS) * 100;
        const performance = ((partCount * IDEAL_CYCLE_TIME_SECONDS) / totalProductionTime) * 100;
        const quality = 100;
        const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
        const lastRecord = await this.machineDataModel.findOne({ 'metadata.machineId': machineId }).sort({ timestamp: -1 });
        let currentStatus = MachineStatus.Offline;
        if (lastRecord) {
            const timeDiff = new Date().getTime() - lastRecord.timestamp.getTime();
            if (timeDiff > 5 * 60 * 1000) {
                currentStatus = MachineStatus.Offline;
            }
            else {
                switch (lastRecord.data.executionStatus) {
                    case 'ACTIVE':
                        currentStatus = MachineStatus.Working;
                        break;
                    case 'READY':
                    case 'STOPPED':
                    case 'FEED_HOLD':
                        currentStatus = MachineStatus.Idle;
                        break;
                    case 'UNAVAILABLE':
                    case 'INTERRUPTED':
                        currentStatus = MachineStatus.Error;
                        break;
                    default:
                        currentStatus = MachineStatus.Offline;
                }
            }
        }
        return {
            machineId,
            status: currentStatus,
            oee: isNaN(oee) ? 0 : oee,
            availability: isNaN(availability) ? 0 : availability,
            performance: isNaN(performance) ? 0 : performance,
            quality,
            details: {
                totalProductionTime,
                partCount,
                cyclesFound: cycles.length,
            },
        };
    }
};
exports.MachineStateService = MachineStateService;
exports.MachineStateService = MachineStateService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, cycle_analysis_service_1.CycleAnalysisService])
], MachineStateService);
//# sourceMappingURL=machine-state.service.js.map