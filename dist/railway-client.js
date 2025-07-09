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
                'Authorization': `Bearer ${this.config.apiKey}`
            }
        });
        // Запускаем периодическую отправку данных
        this.startPeriodicSync();
    }
    async sendData(data) {
        if (!this.config.enabled) {
            console.log('🔕 Railway клиент отключён');
            return false;
        }
        // Добавляем данные в буфер
        this.dataBuffer.data.push(data);
        // Если буфер большой или прошло много времени, отправляем сразу
        if (this.dataBuffer.data.length >= 10 ||
            Date.now() - this.dataBuffer.lastSent.getTime() > 30000) {
            return await this.flushBuffer();
        }
        return true;
    }
    async sendDataBatch(batchData) {
        if (!this.config.enabled) {
            console.log('🔕 Railway клиент отключён');
            return false;
        }
        try {
            console.log(`📤 Отправка batch данных в Railway (${batchData.data.length} машин)...`);
            const response = await this.httpClient.post('/api/ext/data', batchData);
            if (response.status === 200 || response.status === 201) {
                console.log(`✅ Batch данные успешно отправлены в Railway (${batchData.data.length} машин)`);
                this.isOnline = true;
                return true;
            }
            else {
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        }
        catch (error) {
            console.error('❌ Ошибка отправки batch данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/ext/data`);
            console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
            console.error(`💬 Сообщение: ${error.response?.data || error.message || error.toString()}`);
            this.isOnline = false;
            return false;
        }
    }
    async flushBuffer() {
        if (!this.config.enabled || this.dataBuffer.data.length === 0) {
            return false;
        }
        try {
            const payload = {
                edgeGatewayId: 'edge-gateway-01',
                timestamp: new Date().toISOString(),
                data: this.dataBuffer.data
            };
            console.log(`📤 Отправка ${this.dataBuffer.data.length} записей в Railway...`);
            const response = await this.httpClient.post('/api/ext/data', payload);
            if (response.status === 200 || response.status === 201) {
                console.log(`✅ Данные успешно отправлены в Railway (${this.dataBuffer.data.length} записей)`);
                this.dataBuffer.data = [];
                this.dataBuffer.lastSent = new Date();
                this.dataBuffer.retryCount = 0;
                this.isOnline = true;
                return true;
            }
            else {
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        }
        catch (error) {
            console.error('❌ Ошибка отправки данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/ext/data`);
            console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
            console.error(`💬 Сообщение: ${error.response?.data || error.message || error.toString()}`);
            this.isOnline = false;
            this.dataBuffer.retryCount++;
            // Если превышено количество попыток, удаляем старые данные
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
            const response = await this.httpClient.get('/api/ext/health');
            this.isOnline = response.status === 200;
            return this.isOnline;
        }
        catch (error) {
            this.isOnline = false;
            return false;
        }
    }
    startPeriodicSync() {
        // Отправляем данные каждые 30 секунд
        setInterval(async () => {
            if (this.dataBuffer.data.length > 0) {
                await this.flushBuffer();
            }
        }, 30000);
        // Проверяем подключение каждые 2 минуты
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
// Функция для загрузки конфигурации Railway
function loadRailwayConfig(configPath) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
        baseUrl: config.railway?.baseUrl || 'https://mtconnect-core-production.up.railway.app',
        apiKey: config.railway?.apiKey || 'edge-gateway-api-key',
        retryAttempts: config.railway?.retryAttempts || 3,
        retryDelay: config.railway?.retryDelay || 5000,
        enabled: config.railway?.enabled || true
    };
}
