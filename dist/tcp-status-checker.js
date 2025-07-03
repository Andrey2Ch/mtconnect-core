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
exports.tcpStatusChecker = exports.TCPStatusChecker = void 0;
const net = __importStar(require("net"));
class TCPStatusChecker {
    // Отправляем простые TCP команды для получения статуса
    async checkMachineStatus(ip, port = 8193) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let responseData = '';
            const timeout = setTimeout(() => {
                socket.destroy();
                // Timeout НЕ значит что станок не работает! Просто нет FOCAS доступа
                resolve({
                    connected: false,
                    running: false, // БЕЗ FOCAS = НЕ ЗНАЕМ
                    mode: 'TIMEOUT',
                    program: 0,
                    feed: 0,
                    spindle: 0,
                    error: 'Connection timeout'
                });
            }, 3000);
            socket.on('connect', () => {
                // Отправляем команду статуса (базовая FANUC команда)
                const statusCmd = Buffer.from([0x01, 0x00, 0x00, 0x00]); // Простая команда статуса
                socket.write(statusCmd);
            });
            socket.on('data', (data) => {
                responseData += data.toString('hex');
                // Простой анализ ответа
                const status = this.parseResponse(data, ip);
                clearTimeout(timeout);
                socket.end();
                resolve(status);
            });
            socket.on('error', (err) => {
                clearTimeout(timeout);
                // ВАЖНО: Закрытый FOCAS порт НЕ значит что станок не работает!
                // Многие станки работают но закрывают FOCAS порт без лицензии
                resolve({
                    connected: false, // TCP соединение не удалось
                    running: false, // БЕЗ FOCAS = НЕ ЗНАЕМ
                    mode: 'NO_FOCAS_ACCESS',
                    program: 0,
                    feed: 0,
                    spindle: 0,
                    error: `TCP error: ${err.message}`
                });
            });
            socket.on('close', () => {
                clearTimeout(timeout);
                if (responseData.length === 0) {
                    // TCP соединение есть, но нет данных - возможно работает
                    resolve({
                        connected: true,
                        running: false, // БЕЗ FOCAS = НЕ ЗНАЕМ
                        mode: 'TCP_CONNECTED',
                        program: 0,
                        feed: 0,
                        spindle: 0
                    });
                }
            });
            try {
                socket.connect(port, ip);
            }
            catch (error) {
                clearTimeout(timeout);
                resolve({
                    connected: false,
                    running: false,
                    mode: 'ERROR',
                    program: 0,
                    feed: 0,
                    spindle: 0,
                    error: error.message
                });
            }
        });
    }
    parseResponse(data, ip) {
        // Простой анализ ответа FANUC
        const hex = data.toString('hex');
        // Если получили ответ - станок подключен
        const connected = data.length > 0;
        // Эвристика для определения работы
        const running = this.analyzeRunningStatus(data, ip);
        return {
            connected,
            running,
            mode: connected ? (running ? 'AUTO' : 'MANUAL') : 'OFFLINE',
            program: 0,
            feed: 0,
            spindle: 0
        };
    }
    analyzeRunningStatus(data, ip) {
        // БЕЗ FOCAS ЛИЦЕНЗИИ - МЫ НЕ ЗНАЕМ!
        return false; // Честно признаемся что не знаем
    }
    // Улучшенная проверка доступности
    async isPortOpen(ip, port) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, 2000);
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
}
exports.TCPStatusChecker = TCPStatusChecker;
exports.tcpStatusChecker = new TCPStatusChecker();
exports.default = exports.tcpStatusChecker;
