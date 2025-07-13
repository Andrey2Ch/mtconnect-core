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
const app_service_1 = require("./app.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("./schemas/machine-data.schema");
const fs = require("fs");
const path = require("path");
let AppController = class AppController {
    constructor(appService, machineDataModel) {
        this.appService = appService;
        this.machineDataModel = machineDataModel;
    }
    getHello() {
        return this.appService.getHello();
    }
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'MTConnect Cloud API',
            version: '1.0.0'
        };
    }
    getDashboard() {
        return {
            message: 'MTConnect Cloud Dashboard API',
            endpoints: {
                '/machines': 'Список всех станков',
                '/health': 'Статус API',
                '/dashboard/index.html': 'Веб-интерфейс'
            }
        };
    }
    async getMachines() {
        try {
            console.log('📊 Получаю данные машин из MongoDB...');
            const latestData = await this.machineDataModel.aggregate([
                {
                    $sort: { 'metadata.machineId': 1, timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latestRecord: { $first: '$$ROOT' }
                    }
                }
            ]);
            console.log(`📊 Найдено ${latestData.length} машин в базе данных`);
            const configPaths = [
                path.join(__dirname, 'config.json'),
                path.join(__dirname, '..', 'config.json'),
                path.join(process.cwd(), 'config.json'),
                path.join(process.cwd(), 'src', 'config.json')
            ];
            let configPath = '';
            for (const testPath of configPaths) {
                if (fs.existsSync(testPath)) {
                    configPath = testPath;
                    break;
                }
            }
            if (!configPath) {
                throw new Error('Конфигурационный файл не найден');
            }
            console.log(`⚙️ Используем config.json из: ${configPath}`);
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const configMap = new Map();
            config.machines.forEach(machine => {
                configMap.set(machine.id, machine);
            });
            const onlineThreshold = 5 * 60 * 1000;
            const now = new Date();
            const mtconnectMachines = [];
            const adamMachines = [];
            for (const item of latestData) {
                const record = item.latestRecord;
                const machineId = record.metadata.machineId;
                const machineName = record.metadata.machineName;
                const lastUpdate = new Date(record.timestamp);
                const timeDiff = now.getTime() - lastUpdate.getTime();
                const isOnline = timeDiff < onlineThreshold;
                console.log(`🔍 ${machineId}: последнее обновление ${lastUpdate.toISOString()}, разница ${timeDiff}мс, статус: ${isOnline ? 'online' : 'offline'}`);
                if (record.data.adamData) {
                    adamMachines.push({
                        id: machineId,
                        name: machineName,
                        channel: record.data.adamData.channel || 0,
                        ip: '192.168.1.120',
                        port: 502,
                        type: 'ADAM-6050 Counter',
                        status: isOnline ? 'online' : 'offline',
                        count: record.data.adamData.analogData?.['count'] || 0,
                        lastUpdate: lastUpdate.toISOString(),
                        confidence: record.data.adamData.confidence || 'unknown'
                    });
                }
                else {
                    const configMachine = configMap.get(machineId);
                    if (configMachine) {
                        mtconnectMachines.push({
                            id: machineId,
                            name: machineName,
                            ip: configMachine.ip,
                            port: configMachine.port,
                            type: configMachine.type,
                            status: isOnline ? 'online' : 'offline',
                            agentUrl: configMachine.mtconnectAgentUrl,
                            uuid: configMachine.uuid,
                            spindles: configMachine.spindles,
                            axes: configMachine.axes,
                            source: 'Edge Gateway',
                            lastUpdate: lastUpdate.toISOString(),
                            partCount: record.data.partCount,
                            executionStatus: record.data.executionStatus,
                            cycleTime: record.data.cycleTime
                        });
                    }
                }
            }
            const result = {
                timestamp: new Date().toISOString(),
                summary: {
                    total: mtconnectMachines.length + adamMachines.length,
                    mtconnect: {
                        total: mtconnectMachines.length,
                        online: mtconnectMachines.filter(m => m.status === 'online').length,
                        offline: mtconnectMachines.filter(m => m.status === 'offline').length
                    },
                    adam: {
                        total: adamMachines.length,
                        online: adamMachines.filter(m => m.status === 'online').length,
                        offline: adamMachines.filter(m => m.status === 'offline').length
                    }
                },
                machines: {
                    mtconnect: mtconnectMachines,
                    adam: adamMachines
                }
            };
            console.log(`✅ Возвращаю данные: ${result.summary.total} машин (${result.summary.mtconnect.online + result.summary.adam.online} online)`);
            return result;
        }
        catch (error) {
            console.error('❌ Ошибка получения данных машин:', error);
            return {
                timestamp: new Date().toISOString(),
                error: error.message,
                summary: {
                    total: 0,
                    mtconnect: { total: 0, online: 0, offline: 0 },
                    adam: { total: 0, online: 0, offline: 0 }
                },
                machines: {
                    mtconnect: [],
                    adam: []
                }
            };
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
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
    (0, common_1.Get)('/dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('/machines'),
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