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
exports.FocasClient = void 0;
const path = __importStar(require("path"));
const fanuc_integration_1 = __importDefault(require("./fanuc-integration"));
class FocasClient {
    constructor() {
        this.host = '';
        this.port = 8193;
        this.isConnected = false;
        this.machineIds = ['DT-26', 'SR-10', 'SR-21', 'SR-23', 'SR-25', 'SR-26', 'XD-20', 'XD-38'];
        this.machineIPs = [
            '192.168.1.105',
            '192.168.1.91',
            '192.168.1.101',
            '192.168.1.103',
            '192.168.1.104',
            '192.168.1.54',
            '192.168.1.90',
            '192.168.1.199'
        ];
        this.fanucIntegration = new fanuc_integration_1.default();
        console.log(`🏭 FOCAS Client инициализирован`);
        if (this.fanucIntegration.isReady()) {
            console.log(`✅ FANUC интеграция готова к работе`);
        }
        else {
            console.log(`⚠️ FANUC интеграция в режиме симуляции`);
        }
    }
    async connect() {
        if (this.isConnected) {
            return true;
        }
        try {
            console.log(`🔧 Подключение к FANUC станкам...`);
            let connectedCount = 0;
            // Подключаемся ко всем станкам
            for (let i = 0; i < this.machineIds.length; i++) {
                const machineId = this.machineIds[i];
                const ip = this.machineIPs[i];
                const connected = await this.fanucIntegration.connectToMachine(machineId, ip, this.port);
                if (connected) {
                    connectedCount++;
                    console.log(`✅ ${machineId} (${ip}) подключен`);
                }
                else {
                    console.log(`❌ ${machineId} (${ip}) недоступен`);
                }
            }
            this.isConnected = connectedCount > 0;
            if (this.isConnected) {
                console.log(`🔥 FANUC подключение завершено: ${connectedCount}/${this.machineIds.length} станков`);
                return true;
            }
            else {
                console.log(`❌ Не удалось подключиться ни к одному FANUC станку`);
                return false;
            }
        }
        catch (error) {
            console.error('❌ Ошибка подключения к FANUC:', error);
            this.isConnected = false;
            return false;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            console.log(`🔌 Отключение от FANUC станков...`);
            for (const machineId of this.machineIds) {
                await this.fanucIntegration.disconnectFromMachine(machineId);
            }
            this.isConnected = false;
            console.log(`✅ FANUC отключение завершено`);
        }
        catch (error) {
            console.error('❌ Ошибка отключения от FANUC:', error);
            this.isConnected = false;
        }
    }
    async getAllMachineData() {
        const machineDataMap = new Map();
        if (!this.isConnected) {
            console.log('⚠️ FANUC не подключен');
            return machineDataMap;
        }
        try {
            const connectedMachines = this.fanucIntegration.getConnectedMachines();
            for (const machineId of connectedMachines) {
                const data = await this.fanucIntegration.getMachineData(machineId);
                if (data) {
                    const mtconnectData = this.fanucIntegration.toMTConnectData(machineId);
                    if (mtconnectData) {
                        machineDataMap.set(machineId, mtconnectData);
                    }
                }
            }
            console.log(`📊 Получены данные от ${machineDataMap.size} FANUC станков`);
            return machineDataMap;
        }
        catch (error) {
            console.error('❌ Ошибка получения данных FANUC:', error);
            return machineDataMap;
        }
    }
    async getMachineData(machineId) {
        if (!this.isConnected) {
            return null;
        }
        try {
            const data = await this.fanucIntegration.getMachineData(machineId);
            if (data) {
                return this.fanucIntegration.toMTConnectData(machineId);
            }
            return null;
        }
        catch (error) {
            console.error(`❌ Ошибка получения данных ${machineId}:`, error);
            return null;
        }
    }
    getConnectionStatus() {
        return this.isConnected;
    }
    getStatistics() {
        return this.fanucIntegration.getStatistics();
    }
    getConnectedMachines() {
        return this.fanucIntegration.getConnectedMachines();
    }
    // Проверка доступности FOCAS
    static checkAvailability() {
        const dllPath = path.join(process.cwd(), 'Fwlib32.dll');
        try {
            const fs = require('fs');
            return fs.existsSync(dllPath);
        }
        catch {
            return false;
        }
    }
    // Получение информации о версии
    getVersionInfo() {
        return {
            focasAvailable: this.fanucIntegration.isReady(),
            dllPath: path.join(process.cwd(), 'Fwlib32.dll'),
            machineCount: this.machineIds.length,
            connectedCount: this.fanucIntegration.getConnectedMachines().length
        };
    }
}
exports.FocasClient = FocasClient;
exports.default = FocasClient;
