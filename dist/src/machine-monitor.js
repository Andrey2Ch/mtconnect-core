"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net = __importStar(require("net"));
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
class MachineMonitor {
    constructor() {
        this.machines = [
            { name: 'DT-26', ip: '192.168.1.90', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'SR-10', ip: '192.168.1.91', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'SR-21', ip: '192.168.1.199', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'SR-23', ip: '192.168.1.103', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'SR-25', ip: '192.168.1.104', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'SR-26', ip: '192.168.1.54', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'XD-20', ip: '192.168.1.105', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 },
            { name: 'XD-38', ip: '192.168.1.101', isOnline: false, lastSeen: null, uptime: 0, totalChecks: 0, successfulChecks: 0, availability: 0, responseTime: 0 }
        ];
        this.monitoringInterval = null;
        this.startTime = new Date();
        this.app = (0, express_1.default)();
        this.setupServer();
    }
    setupServer() {
        this.app.use(express_1.default.static('public'));
        this.app.get('/api/machines', (req, res) => {
            res.json({
                timestamp: new Date().toISOString(),
                systemUptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
                machines: this.machines.map(machine => ({
                    ...machine,
                    uptimeFormatted: this.formatUptime(machine.uptime),
                    lastSeenFormatted: machine.lastSeen ? this.formatRelativeTime(machine.lastSeen) : 'Никогда'
                }))
            });
        });
        this.app.get('/api/summary', (req, res) => {
            const onlineMachines = this.machines.filter(m => m.isOnline).length;
            const totalMachines = this.machines.length;
            const averageAvailability = this.machines.reduce((sum, m) => sum + m.availability, 0) / totalMachines;
            res.json({
                onlineMachines,
                totalMachines,
                offlineMachines: totalMachines - onlineMachines,
                productionEfficiency: ((onlineMachines / totalMachines) * 100).toFixed(1),
                averageAvailability: averageAvailability.toFixed(1),
                systemUptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
            });
        });
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/machine-dashboard.html'));
        });
    }
    async checkMachineStatus(machine) {
        const startTime = Date.now();
        return new Promise((resolve) => {
            machine.totalChecks++;
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                this.updateMachineStatus(machine, false, Date.now() - startTime);
                resolve();
            }, 3000);
            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.end();
                this.updateMachineStatus(machine, true, Date.now() - startTime);
                resolve();
            });
            socket.on('error', () => {
                clearTimeout(timeout);
                this.updateMachineStatus(machine, false, Date.now() - startTime);
                resolve();
            });
            socket.connect(8193, machine.ip);
        });
    }
    updateMachineStatus(machine, isOnline, responseTime) {
        const now = new Date();
        const wasOnline = machine.isOnline;
        machine.isOnline = isOnline;
        machine.responseTime = responseTime;
        if (isOnline) {
            machine.successfulChecks++;
            machine.lastSeen = now;
            if (!wasOnline) {
                console.log(`🟢 ${machine.name} (${machine.ip}) - ОНЛАЙН (${responseTime}ms)`);
            }
        }
        else {
            if (wasOnline) {
                console.log(`🔴 ${machine.name} (${machine.ip}) - ОФЛАЙН`);
            }
        }
        machine.availability = (machine.successfulChecks / machine.totalChecks) * 100;
        if (machine.lastSeen) {
            machine.uptime = Math.floor((now.getTime() - machine.lastSeen.getTime()) / 1000);
        }
    }
    async monitorAllMachines() {
        console.log(`🔍 Проверяю статус всех станков... (${new Date().toLocaleTimeString()})`);
        const promises = this.machines.map(machine => this.checkMachineStatus(machine));
        await Promise.all(promises);
        const onlineCount = this.machines.filter(m => m.isOnline).length;
        const efficiency = ((onlineCount / this.machines.length) * 100).toFixed(1);
        console.log(`📊 Результат: ${onlineCount}/${this.machines.length} онлайн (${efficiency}% эффективность)`);
    }
    formatUptime(seconds) {
        if (seconds < 60)
            return `${seconds}с`;
        if (seconds < 3600)
            return `${Math.floor(seconds / 60)}м ${seconds % 60}с`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}ч ${minutes}м`;
    }
    formatRelativeTime(date) {
        const secondsAgo = Math.floor((Date.now() - date.getTime()) / 1000);
        if (secondsAgo < 60)
            return `${secondsAgo} сек назад`;
        if (secondsAgo < 3600)
            return `${Math.floor(secondsAgo / 60)} мин назад`;
        return `${Math.floor(secondsAgo / 3600)} час назад`;
    }
    async startMonitoring(port = 5000, intervalSeconds = 2) {
        console.log('🚀 Запускаю систему мониторинга станков...');
        await this.monitorAllMachines();
        this.app.listen(port, () => {
            console.log(`🌐 Дашборд доступен на http://localhost:${port}`);
            console.log(`📊 API: http://localhost:${port}/api/machines`);
        });
        this.monitoringInterval = setInterval(() => {
            this.monitorAllMachines().catch(console.error);
        }, intervalSeconds * 1000);
        console.log(`⏰ Мониторинг каждые ${intervalSeconds} секунд`);
        console.log('✅ Система мониторинга запущена!');
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('🛑 Мониторинг остановлен');
    }
}
exports.default = MachineMonitor;
//# sourceMappingURL=machine-monitor.js.map