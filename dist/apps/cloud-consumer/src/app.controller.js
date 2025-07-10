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
const data_storage_service_1 = require("./modules/data-storage/data-storage.service");
let AppController = class AppController {
    dataStorageService;
    constructor(dataStorageService) {
        this.dataStorageService = dataStorageService;
    }
    health() {
        return {
            status: 'ok',
            service: 'mtconnect-cloud-consumer',
            timestamp: new Date().toISOString(),
        };
    }
    async getStatus() {
        const stats = await this.dataStorageService.getStats();
        return {
            service: 'mtconnect-cloud-consumer',
            status: 'running',
            mqtt: {
                connected: true,
                subscriptions: ['mtconnect/data/+', 'mtconnect/adam/+'],
            },
            database: stats,
            timestamp: new Date().toISOString(),
        };
    }
    async getData(machineId, limit = '100') {
        return this.dataStorageService.getRecentData(machineId, parseInt(limit, 10));
    }
    async getMachines() {
        return this.dataStorageService.getMachines();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('/data'),
    __param(0, (0, common_1.Query)('machineId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getData", null);
__decorate([
    (0, common_1.Get)('/machines'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getMachines", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [data_storage_service_1.DataStorageService])
], AppController);
//# sourceMappingURL=app.controller.js.map