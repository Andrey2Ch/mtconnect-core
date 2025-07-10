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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const fs = require("fs");
const path = require("path");
const axios_1 = require("axios");
let AppController = class AppController {
    constructor(appService) {
        this.appService = appService;
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
            const configPaths = [
                path.join(__dirname, '..', '..', '..', 'src', 'config.json'),
                path.join(__dirname, '..', '..', '..', '..', 'src', 'config.json'),
                path.join(process.cwd(), 'src', 'config.json'),
                path.join(process.cwd(), 'config.json')
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
            console.log(`📁 Используем config.json из: ${configPath}`);
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const mtconnectMachines = await Promise.all(config.machines.map(async (machine) => {
                try {
                    console.log(`📡 Получаю данные от ${machine.name} (${machine.mtconnectAgentUrl})`);
                    const response = await axios_1.default.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 5000 });
                    console.log(`✅ ${machine.name} - статус: online`);
                    return {
                        id: machine.id,
                        name: machine.name,
                        ip: machine.ip,
                        port: machine.port,
                        type: machine.type,
                        status: 'online',
                        agentUrl: machine.mtconnectAgentUrl,
                        uuid: machine.uuid,
                        spindles: machine.spindles,
                        axes: machine.axes,
                        source: 'MTConnect Agent'
                    };
                }
                catch (error) {
                    console.log(`❌ ${machine.name} - статус: offline (${error.message})`);
                    return {
                        id: machine.id,
                        name: machine.name,
                        ip: machine.ip,
                        port: machine.port,
                        type: machine.type,
                        status: 'offline',
                        agentUrl: machine.mtconnectAgentUrl,
                        uuid: machine.uuid,
                        spindles: machine.spindles,
                        axes: machine.axes,
                        source: 'MTConnect Agent',
                        error: error.message
                    };
                }
            }));
            const adamMachines = await this.getAdamMachines();
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
    async getAdamMachines() {
        const adamIP = '192.168.1.120';
        const adamPort = 502;
        const channelMapping = new Map([
            [0, 'SR-22'],
            [1, 'SB-16'],
            [2, 'BT-38'],
            [3, 'K-162'],
            [4, 'K-163'],
            [5, 'L-20'],
            [6, 'K-16'],
            [8, 'SR-20'],
            [9, 'SR-32'],
            [11, 'SR-24']
        ]);
        try {
            console.log(`📡 Подключаюсь к ADAM-6050 (${adamIP}:${adamPort})`);
            const adamTest = await this.testAdamConnection(adamIP, adamPort);
            if (adamTest.connected) {
                console.log(`✅ ADAM-6050 - статус: online`);
                const machines = [];
                if (adamTest.counters && adamTest.counters.length > 0) {
                    adamTest.counters.forEach(counter => {
                        machines.push({
                            id: counter.machineId,
                            name: counter.machineId,
                            channel: counter.channel,
                            ip: adamIP,
                            port: adamPort,
                            type: 'ADAM-6050 Counter',
                            status: 'online',
                            count: counter.count,
                            lastUpdate: counter.timestamp,
                            confidence: counter.confidence
                        });
                    });
                }
                else {
                    channelMapping.forEach((machineId, channel) => {
                        machines.push({
                            id: machineId,
                            name: machineId,
                            channel: channel,
                            ip: adamIP,
                            port: adamPort,
                            type: 'ADAM-6050 Counter',
                            status: 'online'
                        });
                    });
                }
                return machines;
            }
            else {
                console.log(`❌ ADAM-6050 - статус: offline (${adamTest.error})`);
                const machines = [];
                channelMapping.forEach((machineId, channel) => {
                    machines.push({
                        id: machineId,
                        name: machineId,
                        channel: channel,
                        ip: adamIP,
                        port: adamPort,
                        type: 'ADAM-6050 Counter',
                        status: 'offline'
                    });
                });
                return machines;
            }
        }
        catch (error) {
            console.error('❌ Ошибка подключения к ADAM-6050:', error);
            const machines = [];
            const channelMapping = new Map([
                [0, 'SR-22'], [1, 'SB-16'], [2, 'BT-38'], [3, 'K-162'], [4, 'K-163'],
                [5, 'L-20'], [6, 'K-16'], [8, 'SR-20'], [9, 'SR-32'], [11, 'SR-24']
            ]);
            channelMapping.forEach((machineId, channel) => {
                machines.push({
                    id: machineId,
                    name: machineId,
                    channel: channel,
                    ip: adamIP,
                    port: adamPort,
                    type: 'ADAM-6050 Counter',
                    status: 'offline'
                });
            });
            return machines;
        }
    }
    async testAdamConnection(ip, port) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve({ connected: false, error: 'Timeout' });
            }, 5000);
            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve({ connected: true });
            });
            socket.on('error', (err) => {
                clearTimeout(timeout);
                resolve({ connected: false, error: err.message });
            });
            socket.connect(port, ip);
        });
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
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map