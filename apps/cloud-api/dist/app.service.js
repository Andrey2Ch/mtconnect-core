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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const machine_states_cache_service_1 = require("./services/machine-states-cache.service");
let AppService = class AppService {
    constructor(machineStatesCacheService) {
        this.machineStatesCacheService = machineStatesCacheService;
        this.logger = new common_1.Logger('AppService');
        this.machineStatesCache = new Map();
    }
    async onModuleInit() {
        this.logger.log('🚀 Cloud API инициализируется...');
        await this.loadMachineStatesCache();
        setInterval(async () => {
            await this.saveMachineStatesCache();
        }, 30000);
        this.logger.log('✅ Cloud API готов к работе!');
    }
    async loadMachineStatesCache() {
        try {
            this.machineStatesCache = await this.machineStatesCacheService.loadAllStates();
            this.machineStatesCache.forEach((state, machineId) => {
                const missedIdleTime = this.machineStatesCacheService.calculateMissedIdleTime(state.lastActiveTime);
                if (missedIdleTime > 0) {
                    state.idleTimeMinutes += missedIdleTime;
                    this.logger.log(`💾 ${machineId}: восстановлено ${missedIdleTime} мин пропущенного времени простоя`);
                }
                if (state.basePartCount === 0 && state.lastPartCount > 0) {
                    state.basePartCount = state.lastPartCount;
                    state.productionPartCount = 0;
                    this.logger.log(`🔢 ${machineId}: установлена базовая точка счетчика: ${state.basePartCount}`);
                }
            });
            this.logger.log(`💾 Загружен кэш состояний машин: ${this.machineStatesCache.size} машин`);
        }
        catch (error) {
            this.logger.error('❌ Ошибка загрузки кэша состояний машин:', error);
        }
    }
    async saveMachineStatesCache() {
        try {
            if (this.machineStatesCache.size > 0) {
                await this.machineStatesCacheService.saveAllStates(this.machineStatesCache);
            }
        }
        catch (error) {
            this.logger.error('❌ Ошибка сохранения кэша состояний машин:', error);
        }
    }
    getHello() {
        return 'MTConnect Cloud API is running!';
    }
    getMachineState(machineId) {
        return this.machineStatesCache.get(machineId);
    }
    updateMachineState(machineId, updates) {
        const existing = this.machineStatesCache.get(machineId) || {
            machineId,
            idleTimeMinutes: 0,
            lastActiveTime: new Date().toISOString(),
            basePartCount: 0,
            productionPartCount: 0,
            lastPartCount: 0,
            timestamp: new Date().toISOString()
        };
        this.machineStatesCache.set(machineId, {
            ...existing,
            ...updates,
            timestamp: new Date().toISOString()
        });
    }
    getProductionPartCount(machineId, currentPartCount) {
        const state = this.getMachineState(machineId);
        if (!state) {
            this.updateMachineState(machineId, {
                basePartCount: currentPartCount,
                productionPartCount: 0,
                lastPartCount: currentPartCount
            });
            return 0;
        }
        const result = this.machineStatesCacheService.calculateProductionCount(currentPartCount, state.basePartCount, state.lastPartCount);
        this.updateMachineState(machineId, {
            basePartCount: result.newBaseCount,
            productionPartCount: result.productionCount,
            lastPartCount: currentPartCount
        });
        return result.productionCount;
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [machine_states_cache_service_1.MachineStatesCacheService])
], AppService);
//# sourceMappingURL=app.service.js.map