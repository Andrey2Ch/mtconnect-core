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
exports.RailwayClient = void 0;
exports.loadRailwayConfig = loadRailwayConfig;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logFilePath = path.join(__dirname, '..', 'edge-gateway.log');
const log = (message) => {
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
    }
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${message}\n`);
    console.log(`[LOG] ${message}`);
};
if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
}
log('--- Edge Gateway Log Initialized ---');
class RailwayClient {
    constructor(config) {
        this.config = config;
        this.isOnline = false;
        this.retryTimer = null;
        this.dataBuffer = {
            data: [],
            lastSent: new Date(),
            retryCount: 0
        };
        this.httpClient = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.config.apiKey
            }
        });
        this.startPeriodicSync();
    }
    async sendData(data) {
        if (!this.config.enabled) {
            log('🔕 Railway client is disabled. Skipping send.');
            console.log('🔕 Railway клиент отключён');
            return false;
        }
        this.dataBuffer.data.push(data);
        if (this.dataBuffer.data.length >= 10 ||
            Date.now() - this.dataBuffer.lastSent.getTime() > 30000) {
            return await this.flushBuffer();
        }
        return true;
    }
    async sendDataBatch(batchData) {
        if (!this.config.enabled) {
            log('🔕 Railway client is disabled. Skipping send.');
            console.log('🔕 Railway клиент отключён');
            return false;
        }
        try {
            log(`📤 Preparing to send batch data for ${batchData.data.length} machines.`);
            console.log(`📤 Отправка batch данных в Railway (${batchData.data.length} машин)...`);
            const formattedData = batchData.data.map((item) => ({
                machineId: item.machineId,
                machineName: item.machineName,
                timestamp: item.timestamp,
                data: item.data
            }));
            const payload = {
                edgeGatewayId: this.config.edgeGatewayId,
                timestamp: new Date().toISOString(),
                data: formattedData
            };
            log(`PAYLOAD: ${JSON.stringify(payload, null, 2)}`);
            const response = await this.httpClient.post('/api/ext/data', payload);
            if (response.status === 200 || response.status === 201) {
                log(`✅ SUCCESS: Batch data sent successfully. Status: ${response.status}`);
                console.log(`✅ Batch данные успешно отправлены в Railway (${batchData.data.length} машин)`);
                this.isOnline = true;
                return true;
            }
            else {
                log(`⚠️ UNEXPECTED STATUS: ${response.status}`);
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        }
        catch (error) {
            log(`❌ ERROR sending batch data: ${error.message}`);
            if (error.response) {
                log(`ERROR DETAILS: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.error('❌ Ошибка отправки batch данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/ext/data`);
            console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
            const errorData = error.response?.data;
            if (errorData && typeof errorData === 'object') {
                console.error(`💬 Сообщение: ${JSON.stringify(errorData, null, 2)}`);
            }
            else {
                console.error(`💬 Сообщение: ${errorData || error.message || error.toString()}`);
            }
            this.isOnline = false;
            return false;
        }
    }
    async flushBuffer() {
        if (!this.config.enabled || this.dataBuffer.data.length === 0) {
            return false;
        }
        try {
            const formattedData = this.dataBuffer.data.map((item) => ({
                machineId: item.machineId,
                machineName: item.machineName,
                timestamp: item.timestamp,
                data: item.data
            }));
            const payload = {
                edgeGatewayId: this.config.edgeGatewayId,
                timestamp: new Date().toISOString(),
                data: formattedData
            };
            log(`📤 Flushing buffer with ${this.dataBuffer.data.length} records.`);
            console.log(`📤 Отправка ${this.dataBuffer.data.length} записей в Railway...`);
            const response = await this.httpClient.post('/api/ext/data', payload);
            if (response.status === 200 || response.status === 201) {
                log(`✅ SUCCESS: Buffer flushed successfully. Status: ${response.status}`);
                console.log(`✅ Данные успешно отправлены в Railway (${this.dataBuffer.data.length} записей)`);
                this.dataBuffer.data = [];
                this.dataBuffer.lastSent = new Date();
                this.dataBuffer.retryCount = 0;
                this.isOnline = true;
                return true;
            }
            else {
                log(`⚠️ UNEXPECTED STATUS on flush: ${response.status}`);
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        }
        catch (error) {
            log(`❌ ERROR flushing buffer: ${error.message}`);
            if (error.response) {
                log(`ERROR DETAILS on flush: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.error('❌ Ошибка отправки данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/ext/data`);
            console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
            const errorData = error.response?.data;
            if (errorData && typeof errorData === 'object') {
                console.error(`💬 Сообщение: ${JSON.stringify(errorData, null, 2)}`);
            }
            else {
                console.error(`💬 Сообщение: ${errorData || error.message || error.toString()}`);
            }
            this.isOnline = false;
            this.dataBuffer.retryCount++;
            if (this.dataBuffer.retryCount > this.config.retryAttempts) {
                console.warn(`⚠️ Превышено количество попыток (${this.config.retryAttempts}), удаляем старые данные`);
                this.dataBuffer.data = [];
                this.dataBuffer.retryCount = 0;
            }
            return false;
        }
    }
    async healthCheck() {
        if (!this.config.enabled) {
            return false;
        }
        try {
            log('🩺 Performing health check...');
            const response = await this.httpClient.get('/api/ext/health');
            this.isOnline = response.status === 200;
            log(`헬스 체크 결과: ${this.isOnline ? 'Online' : 'Offline'}`);
            return this.isOnline;
        }
        catch (error) {
            log(`❌ Health check failed: ${error.message}`);
            this.isOnline = false;
            return false;
        }
    }
    startPeriodicSync() {
        setInterval(async () => {
            if (this.dataBuffer.data.length > 0) {
                await this.flushBuffer();
            }
        }, 30000);
        setInterval(async () => {
            await this.healthCheck();
        }, 120000);
    }
    getStatus() {
        return {
            isOnline: this.isOnline,
            bufferSize: this.dataBuffer.data.length,
            retryCount: this.dataBuffer.retryCount,
            lastSent: this.dataBuffer.lastSent
        };
    }
}
exports.RailwayClient = RailwayClient;
function loadRailwayConfig(configPath) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
        baseUrl: config.railway?.baseUrl || 'https://mtconnect-core-production.up.railway.app',
        apiKey: config.railway?.apiKey || 'edge-gateway-api-key',
        edgeGatewayId: config.railway?.edgeGatewayId || 'edge-gateway-01',
        retryAttempts: config.railway?.retryAttempts || 3,
        retryDelay: config.railway?.retryDelay || 5000,
        enabled: config.railway?.enabled || true
    };
}
//# sourceMappingURL=railway-client.js.map