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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const cycle_analysis_service_1 = require("../services/cycle-analysis.service");
const machine_state_service_1 = require("../services/machine-state.service");
let AnalyticsController = class AnalyticsController {
    constructor(cycleAnalysisService, machineStateService) {
        this.cycleAnalysisService = cycleAnalysisService;
        this.machineStateService = machineStateService;
    }
    async getCycles(machineId, from, to) {
        console.log(`[AnalyticsController] Received request for cycles for machine: ${machineId}`);
        const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        console.log(`[AnalyticsController] Date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
        return this.cycleAnalysisService.analyzeCycles(machineId, fromDate, toDate);
    }
    async getMachineState(machineId, from, to) {
        console.log(`[AnalyticsController] Received request for state for machine: ${machineId}`);
        const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        console.log(`[AnalyticsController] Date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
        return this.machineStateService.getMachineState(machineId, fromDate, toDate);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)(':machineId/cycles'),
    __param(0, (0, common_1.Param)('machineId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getCycles", null);
__decorate([
    (0, common_1.Get)(':machineId/state'),
    __param(0, (0, common_1.Param)('machineId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getMachineState", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [cycle_analysis_service_1.CycleAnalysisService,
        machine_state_service_1.MachineStateService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map