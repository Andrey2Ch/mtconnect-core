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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthernetIPClient = void 0;
const net = __importStar(require("net"));
class EthernetIPClient {
    constructor(host) {
        this.port = 44818; // Стандартный порт Ethernet/IP
        this.socket = null;
        this.isConnected = false;
        this.host = host;
    }
    async connect() {
        return new Promise((resolve) => {
            this.socket = new net.Socket();
            const timeout = setTimeout(() => {
                this.socket?.destroy();
                resolve(false);
            }, 5000);
            this.socket.on('connect', () => {
                clearTimeout(timeout);
                this.isConnected = true;
                console.log(`✅ Ethernet/IP подключен к ${this.host}`);
                resolve(true);
            });
            this.socket.on('error', (error) => {
                clearTimeout(timeout);
                console.log(`⚠️ Ethernet/IP ошибка ${this.host}:`, error.message);
                resolve(false);
            });
            this.socket.connect(this.port, this.host);
        });
    }
    async readRegisters() {
        if (!this.isConnected || !this.socket) {
            return null;
        }
        try {
            // Запросы к стандартным регистрам FANUC
            const registers = await this.readFanucRegisters([
                { address: 0x1000, type: 'INT16' }, // Скорость шпинделя
                { address: 0x1004, type: 'INT16' }, // Подача
                { address: 0x2000, type: 'FLOAT' }, // X позиция
                { address: 0x2004, type: 'FLOAT' }, // Y позиция  
                { address: 0x2008, type: 'FLOAT' }, // Z позиция
                { address: 0x3000, type: 'INT16' }, // Номер программы
                { address: 0x3004, type: 'INT16' }, // Номер кадра
                { address: 0x4000, type: 'INT16' }, // Режим
                { address: 0x4004, type: 'INT16' }, // Статус
            ]);
            return {
                spindle_speed: registers[0] || 0,
                feedrate: registers[1] || 0,
                x_position: registers[2] || 0,
                y_position: registers[3] || 0,
                z_position: registers[4] || 0,
                program_number: registers[5] || 0,
                sequence_number: registers[6] || 0,
                mode: registers[7] || 0,
                status: registers[8] || 0,
            };
        }
        catch (error) {
            console.error('❌ Ошибка чтения регистров:', error);
            return null;
        }
    }
    async readFanucRegisters(registers) {
        // Реализация чтения регистров через Ethernet/IP
        // Это упрощенная версия, в реальности нужен полный Ethernet/IP стек
        return new Promise((resolve) => {
            const results = [];
            // Имитация успешного чтения для тестирования
            // В реальности здесь будет отправка Ethernet/IP пакетов
            setTimeout(() => {
                for (let i = 0; i < registers.length; i++) {
                    // Возвращаем реалистичные тестовые значения
                    switch (registers[i].address) {
                        case 0x1000:
                            results.push(Math.floor(Math.random() * 3000 + 500));
                            break; // RPM
                        case 0x1004:
                            results.push(Math.floor(Math.random() * 500 + 100));
                            break; // Feed
                        case 0x2000:
                            results.push(Math.random() * 100);
                            break; // X
                        case 0x2004:
                            results.push(Math.random() * 100);
                            break; // Y
                        case 0x2008:
                            results.push(Math.random() * 100);
                            break; // Z
                        default: results.push(Math.floor(Math.random() * 1000));
                    }
                }
                resolve(results);
            }, 100);
        });
    }
    async disconnect() {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
        }
        this.isConnected = false;
    }
    getConnectionStatus() {
        return this.isConnected;
    }
}
exports.EthernetIPClient = EthernetIPClient;
exports.default = EthernetIPClient;
