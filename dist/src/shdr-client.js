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
exports.SHDRManager = exports.SHDRClient = void 0;
const net = __importStar(require("net"));
const events_1 = require("events");
class SHDRClient extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.socket = null;
        this.reconnectTimer = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.buffer = '';
        this.config = {
            reconnectInterval: 5000,
            timeout: 10000,
            ...config
        };
    }
    connect() {
        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy();
        }
        this.socket = new net.Socket();
        this.socket.setTimeout(this.config.timeout);
        this.socket.on('connect', () => {
            console.log(`✅ SHDR подключен к ${this.config.machineName} (${this.config.ip}:${this.config.port})`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connect');
        });
        this.socket.on('data', (chunk) => {
            this.handleData(chunk);
        });
        this.socket.on('timeout', () => {
            console.log(`⏰ SHDR timeout для ${this.config.machineName}`);
            this.handleDisconnect();
        });
        this.socket.on('error', (error) => {
            console.log(`❌ SHDR ошибка для ${this.config.machineName}: ${error.message}`);
            this.emit('error', error);
            this.handleDisconnect();
        });
        this.socket.on('close', () => {
            console.log(`🔌 SHDR соединение закрыто для ${this.config.machineName}`);
            this.handleDisconnect();
        });
        console.log(`🔄 Подключение SHDR к ${this.config.machineName} (${this.config.ip}:${this.config.port})...`);
        this.socket.connect(this.config.port, this.config.ip);
    }
    handleData(chunk) {
        this.buffer += chunk.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        lines.forEach(line => {
            if (line.trim()) {
                this.parseSHDRLine(line.trim());
            }
        });
    }
    parseSHDRLine(line) {
        const parts = line.split('|');
        if (parts.length >= 4) {
            const dataItem = {
                timestamp: parts[0],
                device: parts[1],
                dataItem: parts[2],
                value: parts[3]
            };
            this.emit('data', dataItem);
        }
        else {
            console.warn(`⚠️ Неверный формат SHDR для ${this.config.machineName}: ${line}`);
        }
    }
    handleDisconnect() {
        this.isConnected = false;
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.emit('disconnect');
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Переподключение SHDR к ${this.config.machineName} через ${this.config.reconnectInterval}мс (попытка ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, this.config.reconnectInterval);
        }
        else {
            console.log(`❌ Максимум попыток переподключения исчерпан для ${this.config.machineName}`);
            this.emit('maxReconnectAttemptsReached');
        }
    }
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }
    getConnectionStatus() {
        return this.isConnected;
    }
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
}
exports.SHDRClient = SHDRClient;
class SHDRManager extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.clients = new Map();
        this.dataStore = new Map();
    }
    addMachine(config) {
        const client = new SHDRClient(config);
        client.on('connect', () => {
            console.log(`🔗 SHDR Manager: ${config.machineName} подключен`);
            this.emit('machineConnected', config.machineId);
        });
        client.on('disconnect', () => {
            console.log(`🔌 SHDR Manager: ${config.machineName} отключен`);
            this.emit('machineDisconnected', config.machineId);
        });
        client.on('data', (dataItem) => {
            this.updateDataStore(config.machineId, dataItem);
            this.emit('dataReceived', config.machineId, dataItem);
        });
        client.on('error', (error) => {
            this.emit('machineError', config.machineId, error);
        });
        this.clients.set(config.machineId, client);
        if (!this.dataStore.has(config.machineId)) {
            this.dataStore.set(config.machineId, new Map());
        }
        client.connect();
    }
    updateDataStore(machineId, dataItem) {
        const machineData = this.dataStore.get(machineId);
        if (machineData) {
            machineData.set(dataItem.dataItem, dataItem);
        }
    }
    getMachineData(machineId) {
        return this.dataStore.get(machineId);
    }
    getAllMachinesData() {
        return this.dataStore;
    }
    getMachineConnectionStatus(machineId) {
        const client = this.clients.get(machineId);
        return client ? client.getConnectionStatus() : false;
    }
    getAllConnectionStatuses() {
        const statuses = new Map();
        for (const [machineId, client] of this.clients) {
            statuses.set(machineId, client.getConnectionStatus());
        }
        return statuses;
    }
    disconnectAll() {
        for (const client of this.clients.values()) {
            client.disconnect();
        }
        this.clients.clear();
        this.dataStore.clear();
    }
    getConnectedMachinesCount() {
        let count = 0;
        for (const client of this.clients.values()) {
            if (client.getConnectionStatus()) {
                count++;
            }
        }
        return count;
    }
    convertToMTConnectFormat(machineId) {
        const machineData = this.dataStore.get(machineId);
        if (!machineData) {
            return null;
        }
        const timestamp = new Date().toISOString();
        const deviceStream = {
            $: {
                name: machineId,
                uuid: machineId.toLowerCase()
            },
            ComponentStream: [
                {
                    $: {
                        component: "Controller",
                        componentId: "controller"
                    },
                    Events: {},
                    Samples: {}
                },
                {
                    $: {
                        component: "Path",
                        componentId: "path",
                        name: "path"
                    },
                    Events: {},
                    Samples: {}
                }
            ]
        };
        for (const [dataItemName, dataItem] of machineData) {
            const mtconnectItem = {
                _: dataItem.value,
                $: {
                    dataItemId: dataItemName,
                    timestamp: dataItem.timestamp || timestamp,
                    name: dataItemName
                }
            };
            const isEvent = ['avail', 'mode', 'exec', 'program', 'block', 'estop', 'door', 'coolant'].includes(dataItemName);
            const componentIndex = ['Xact', 'Yact', 'Zact', 'program', 'block', 'exec'].includes(dataItemName) ? 1 : 0;
            if (isEvent) {
                deviceStream.ComponentStream[componentIndex].Events[this.capitalizeFirst(dataItemName)] = mtconnectItem;
            }
            else {
                deviceStream.ComponentStream[componentIndex].Samples[this.capitalizeFirst(dataItemName)] = mtconnectItem;
            }
        }
        return deviceStream;
    }
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
exports.SHDRManager = SHDRManager;
//# sourceMappingURL=shdr-client.js.map