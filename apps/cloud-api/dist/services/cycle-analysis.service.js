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
exports.CycleAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
let CycleAnalysisService = class CycleAnalysisService {
    constructor(machineDataModel) {
        this.machineDataModel = machineDataModel;
    }
    async analyzeCycles(machineId, from, to) {
        console.log(`[CycleAnalysisService] Starting cycle analysis for machineId: ${machineId} from ${from.toISOString()} to ${to.toISOString()}`);
        try {
            const query = {
                'metadata.machineId': machineId,
                timestamp: { $gte: from, $lte: to },
            };
            const data = await this.machineDataModel.find(query).sort({ timestamp: 'asc' });
            console.log(`[CycleAnalysisService] Found ${data.length} records for ${machineId} in the given time range.`);
            const cycles = [];
            let cycleStartTime = null;
            let lastPartCount = null;
            for (const entry of data) {
                const { executionStatus, partCount } = entry.data;
                const timestamp = entry.timestamp;
                if (lastPartCount === null && partCount !== undefined) {
                    lastPartCount = partCount;
                    console.log(`[CycleAnalysisService] Initial part count for ${machineId}: ${lastPartCount}`);
                }
                if (executionStatus === 'ACTIVE' && !cycleStartTime) {
                    cycleStartTime = timestamp;
                    console.log(`[CycleAnalysisService] Cycle started for ${machineId} at ${timestamp.toISOString()}`);
                }
                if (partCount > lastPartCount && cycleStartTime) {
                    const cycle = {
                        startTime: cycleStartTime,
                        endTime: timestamp,
                        duration: (timestamp.getTime() - cycleStartTime.getTime()) / 1000,
                        machineId: machineId,
                    };
                    cycles.push(cycle);
                    console.log(`[CycleAnalysisService] Cycle ended for ${machineId}. Duration: ${cycle.duration}s. Total cycles found: ${cycles.length}`);
                    cycleStartTime = null;
                    lastPartCount = partCount;
                }
            }
            console.log(`[CycleAnalysisService] Finished analysis for ${machineId}. Total cycles found: ${cycles.length}`);
            return cycles;
        }
        catch (error) {
            console.error(`[CycleAnalysisService] Error analyzing cycles for ${machineId}:`, error);
            return [];
        }
    }
};
exports.CycleAnalysisService = CycleAnalysisService;
exports.CycleAnalysisService = CycleAnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CycleAnalysisService);
//# sourceMappingURL=cycle-analysis.service.js.map