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
var EdgeDataController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeDataController = void 0;
const common_1 = require("@nestjs/common");
const edgeDataStore = new Map();
let EdgeDataController = EdgeDataController_1 = class EdgeDataController {
    logger = new common_1.Logger(EdgeDataController_1.name);
    async receiveBatchData(batchData) {
        this.logger.log('Получены данные от Cloud Consumer');
        const { updates, source, timestamp } = batchData;
        if (!updates || !Array.isArray(updates)) {
            return { error: 'Неверный формат данных' };
        }
        for (const update of updates) {
            const { machineId, status, timestamp: machineTimestamp, data, error } = update;
            if (!machineId)
                continue;
            edgeDataStore.set(machineId, {
                id: machineId,
                name: machineId,
                type: machineId.startsWith('M_') ? 'MTConnect' : 'ADAM',
                status,
                lastUpdate: machineTimestamp || new Date().toISOString(),
                data: data || {},
                error: error || null,
                source: 'Edge Gateway'
            });
            this.logger.log(`Обновлена машина ${machineId}: ${status}`);
        }
        return {
            success: true,
            processed: updates.length,
            timestamp: new Date().toISOString()
        };
    }
    getEdgeData() {
        return {
            timestamp: new Date().toISOString(),
            machines: Array.from(edgeDataStore.values()),
            total: edgeDataStore.size
        };
    }
};
exports.EdgeDataController = EdgeDataController;
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EdgeDataController.prototype, "receiveBatchData", null);
__decorate([
    (0, common_1.Post)('edge-data'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EdgeDataController.prototype, "getEdgeData", null);
exports.EdgeDataController = EdgeDataController = EdgeDataController_1 = __decorate([
    (0, common_1.Controller)('api/machine-data')
], EdgeDataController);
//# sourceMappingURL=edge-data.controller.js.map