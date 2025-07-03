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
exports.FanucIntegration = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const focas_real_1 = require("./focas-real");
const cycle_tracker_1 = __importDefault(require("./cycle-tracker"));
// Константы FOCAS (из Fwlib32.h)
const EW_OK = 0;
const EW_SOCKET = -8;
const EW_TIMEOUT = -16;
class FanucIntegration {
    constructor() {
        this.isAvailable = false;
        this.machines = new Map();
        this.machineIPs = new Map();
        this.focasWarningShown = false; // Флаг для однократного предупреждения
        this.dllPath = path.join(process.cwd(), 'Fwlib32.dll');
        this.checkAvailability();
    }
    checkAvailability() {
        try {
            this.isAvailable = fs.existsSync(this.dllPath);
            if (this.isAvailable) {
                console.log(`✅ FANUC интеграция готова. DLL найдена: ${this.dllPath}`);
            }
            else {
                console.log(`❌ FANUC DLL не найдена: ${this.dllPath}`);
                console.log(`⚠️ Система будет работать только с TCP подключениями без реальных данных FOCAS`);
                this.focasWarningShown = true;
            }
        }
        catch (error) {
            console.error('❌ Ошибка проверки FANUC DLL:', error);
            this.isAvailable = false;
        }
    }
    isReady() {
        return this.isAvailable;
    }
    // Подключение к станку FANUC
    async connectToMachine(machineId, ip, port = 8193) {
        console.log(`🔧 Подключение к FANUC ${machineId} на ${ip}:${port}`);
        try {
            // Сохраняем IP для этой машины
            this.machineIPs.set(machineId, ip);
            // Пытаемся подключиться через РЕАЛЬНЫЙ FOCAS
            if (focas_real_1.realFocasClient.isAvailable()) {
                const result = await focas_real_1.realFocasClient.connect(ip, port);
                if (result.success) {
                    const machineData = {
                        timestamp: new Date().toISOString(),
                        handle: result.handle,
                        connected: true,
                        status: { mode: 0, running: 0, motion: 0, emergency: 0, alarm: 0, edit: 0 },
                        positions: {
                            X: { value: 0, unit: 'mm' },
                            Y: { value: 0, unit: 'mm' },
                            Z: { value: 0, unit: 'mm' }
                        },
                        spindle: { speed: 0, override: 100 },
                        feed: { rate: 0, override: 100 },
                        program: { number: 0, sequence: 0, block: '' },
                        alarms: []
                    };
                    this.machines.set(machineId, machineData);
                    console.log(`✅ ${machineId} (${ip}) подключен через РЕАЛЬНЫЙ FOCAS`);
                    return true;
                }
            }
            // FALLBACK: Тест TCP подключения
            const isReachable = await this.testConnection(ip, port);
            if (isReachable) {
                const handle = Math.floor(Math.random() * 1000) + 1;
                const machineData = {
                    timestamp: new Date().toISOString(),
                    handle: handle,
                    connected: true,
                    status: {
                        mode: 0,
                        running: 0,
                        motion: 0,
                        emergency: 0,
                        alarm: 0,
                        edit: 0
                    },
                    positions: {
                        X: { value: 0, unit: 'mm' },
                        Y: { value: 0, unit: 'mm' },
                        Z: { value: 0, unit: 'mm' }
                    },
                    spindle: {
                        speed: 0,
                        override: 100
                    },
                    feed: {
                        rate: 0,
                        override: 100
                    },
                    program: {
                        number: 0,
                        sequence: 0,
                        block: ''
                    },
                    alarms: []
                };
                this.machines.set(machineId, machineData);
                console.log(`✅ FANUC ${machineId} подключен (handle: ${handle})`);
                return true;
            }
            else {
                console.log(`❌ FANUC ${machineId} недоступен по адресу ${ip}:${port}`);
                return false;
            }
        }
        catch (error) {
            console.error(`❌ Ошибка подключения к FANUC ${machineId}:`, error);
            return false;
        }
    }
    // Проверка доступности по сети
    async testConnection(ip, port) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, 5000);
            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.end();
                resolve(true);
            });
            socket.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
            try {
                socket.connect(port, ip);
            }
            catch {
                clearTimeout(timeout);
                resolve(false);
            }
        });
    }
    // Получение IP адреса машины
    getIpForMachine(machineId) {
        return this.machineIPs.get(machineId);
    }
    // Получение данных с станка (настоящие FOCAS вызовы)
    async getMachineData(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.connected) {
            return null;
        }
        try {
            const ip = this.getIpForMachine(machineId);
            if (!ip) {
                console.error(`❌ IP не найден для машины ${machineId}`);
                machine.status.running = 0;
                machine.status.motion = 0;
                machine.status.mode = 0;
                return machine;
            }
            let focasData = null;
            let focasAvailableAndSuccessful = false;
            if (focas_real_1.realFocasClient.isAvailable()) {
                try {
                    focasData = await focas_real_1.realFocasClient.getMachineData(machineId, ip);
                    if (focasData) {
                        focasAvailableAndSuccessful = true;
                    }
                }
                catch (error) {
                    console.log(`⚠️  FOCAS ошибка для ${ip}: ${error.message || error}`);
                }
            }
            machine.timestamp = new Date().toISOString();
            if (focasAvailableAndSuccessful && focasData && focasData.status) {
                machine.positions.X.value = focasData.status.position?.x || 0;
                machine.positions.Y.value = focasData.status.position?.y || 0;
                machine.positions.Z.value = focasData.status.position?.z || 0;
                machine.spindle.speed = focasData.status.spindleSpeed || 0;
                machine.feed.rate = focasData.status.feedrate || 0;
                machine.program.number = focasData.status.programNumber || 0;
                machine.status.alarm = (focasData.status.alarms && focasData.status.alarms.length > 0) ? 1 : 0;
                machine.status.emergency = (focasData.status.alarms && focasData.status.alarms.some((a) => a.includes('EMERGENCY'))) ? 1 : 0;
                machine.alarms = focasData.status.alarms || [];
                // Выводим в лог структуру focasData.status, чтобы понять, как определить running
                console.log(`🔍 FOCAS данные (статус) для ${ip}:`, JSON.stringify(focasData.status));
                // ВРЕМЕННО: пока не знаем точное поле, ставим running = 0
                // Позже, на основе лога выше, мы напишем здесь правильную логику.
                machine.status.running = 0;
            }
            else {
                machine.status.running = 0;
                if (!focasAvailableAndSuccessful) {
                    console.log(`ℹ️ FOCAS данные для ${ip} недоступны, статус running = 0.`);
                }
            }
            machine.status.motion = machine.status.running === 1 && machine.feed.rate > 0 ? 1 : 0;
            machine.status.mode = machine.status.running === 1 ? 1 : 0;
            cycle_tracker_1.default.updateMachineStatus(machineId, machine.status.running === 1);
            return machine;
        }
        catch (error) {
            console.error(`❌ Ошибка получения данных для ${machineId}: ${error.message || error}`);
            const machine = this.machines.get(machineId);
            if (machine) {
                machine.status.running = 0;
                machine.status.motion = 0;
                machine.status.mode = 0;
                return machine;
            }
            return null;
        }
    }
    // Отключение от станка
    async disconnectFromMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            return false;
        }
        try {
            // Здесь должен быть вызов cnc_freelibhndl()
            machine.connected = false;
            this.machines.delete(machineId);
            console.log(`✅ FANUC ${machineId} отключен (handle: ${machine.handle})`);
            return true;
        }
        catch (error) {
            console.error(`❌ Ошибка отключения FANUC ${machineId}:`, error);
            return false;
        }
    }
    // Получение списка подключенных машин
    getConnectedMachines() {
        return Array.from(this.machines.keys()).filter(id => {
            const machine = this.machines.get(id);
            return machine && machine.connected;
        });
    }
    // Получение статистики
    getStatistics() {
        const connectedCount = this.getConnectedMachines().length;
        const runningCount = Array.from(this.machines.values())
            .filter(m => m.connected && m.status.running === 1).length;
        return {
            connected: connectedCount,
            running: runningCount,
            efficiency: connectedCount > 0 ? Math.round((runningCount / connectedCount) * 100) : 0
        };
    }
    // Преобразование в MTConnect формат
    toMTConnectData(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            return null;
        }
        return {
            timestamp: machine.timestamp,
            programNumber: machine.program.number,
            currentProgram: machine.program.number,
            sequenceNumber: machine.program.sequence,
            feedrate: machine.feed.rate,
            spindleSpeed: machine.spindle.speed,
            positions: machine.positions,
            status: {
                mode: machine.status.mode,
                automatic: machine.status.mode,
                running: machine.status.running,
                motion: machine.status.motion,
                emergency: machine.status.emergency,
                alarm: machine.status.alarm
            }
        };
    }
}
exports.FanucIntegration = FanucIntegration;
exports.default = FanucIntegration;
