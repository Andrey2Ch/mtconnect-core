import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface RailwayConfig {
    baseUrl: string;
    apiKey: string;
    edgeGatewayId: string;
    retryAttempts: number;
    retryDelay: number;
    enabled: boolean;
}

interface EdgeGatewayData {
    machineId: string;
    machineName: string;
    timestamp: string;
    data: {
        partCount?: number;
        cycleTime?: number;
        executionStatus?: string;
        availability?: string;
        program?: string;
        block?: string;
        line?: string;
        adamData?: any;
    };
}

interface DataBuffer {
    data: EdgeGatewayData[];
    lastSent: Date;
    retryCount: number;
}

export class RailwayClient {
    private config: RailwayConfig;
    private httpClient: any;
    private dataBuffer: DataBuffer;
    private isOnline: boolean;
    private retryTimer: NodeJS.Timeout | null;

    constructor(config: RailwayConfig) {
        this.config = config;
        this.isOnline = false;
        this.retryTimer = null;
        
        this.dataBuffer = {
            data: [],
            lastSent: new Date(),
            retryCount: 0
        };

        this.httpClient = axios.create({
            baseURL: this.config.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.config.apiKey
            }
        });

        // Запускаем периодическую отправку данных
        this.startPeriodicSync();
    }

    async sendData(data: EdgeGatewayData): Promise<boolean> {
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

    async sendDataBatch(batchData: any): Promise<boolean> {
        if (!this.config.enabled) {
            console.log('🔕 Railway клиент отключён');
            return false;
        }

        try {
            console.log(`📤 Отправка batch данных в Railway (${batchData.data.length} машин)...`);
            
            // Форматируем данные в правильный формат для API
            const formattedData = batchData.data.map((item: any) => ({
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
            
            const response = await this.httpClient.post('/api/ext/data', payload);
            
            if (response.status === 200 || response.status === 201) {
                console.log(`✅ Batch данные успешно отправлены в Railway (${batchData.data.length} машин)`);
                this.isOnline = true;
                return true;
            } else {
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        } catch (error: any) {
            console.error('❌ Ошибка отправки batch данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/ext/data`);
            console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
            // Исправляем логирование - правильно сериализуем объект
            const errorData = error.response?.data;
            if (errorData && typeof errorData === 'object') {
                console.error(`💬 Сообщение: ${JSON.stringify(errorData, null, 2)}`);
            } else {
                console.error(`💬 Сообщение: ${errorData || error.message || error.toString()}`);
            }
            
            this.isOnline = false;
            return false;
        }
    }

    async flushBuffer(): Promise<boolean> {
        if (!this.config.enabled || this.dataBuffer.data.length === 0) {
            return false;
        }

        try {
            // Форматируем данные в правильный формат для API
            const formattedData = this.dataBuffer.data.map((item: any) => ({
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

            console.log(`📤 Отправка ${this.dataBuffer.data.length} записей в Railway...`);
            
            const response = await this.httpClient.post('/api/ext/data', payload);
            
            if (response.status === 200 || response.status === 201) {
                console.log(`✅ Данные успешно отправлены в Railway (${this.dataBuffer.data.length} записей)`);
                this.dataBuffer.data = [];
                this.dataBuffer.lastSent = new Date();
                this.dataBuffer.retryCount = 0;
                this.isOnline = true;
                return true;
            } else {
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        } catch (error: any) {
            console.error('❌ Ошибка отправки данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/ext/data`);
            console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
            // Исправляем логирование - правильно сериализуем объект
            const errorData = error.response?.data;
            if (errorData && typeof errorData === 'object') {
                console.error(`💬 Сообщение: ${JSON.stringify(errorData, null, 2)}`);
            } else {
                console.error(`💬 Сообщение: ${errorData || error.message || error.toString()}`);
            }
            
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

    async healthCheck(): Promise<boolean> {
        if (!this.config.enabled) {
            return false;
        }

        try {
            const response = await this.httpClient.get('/api/ext/health');
            this.isOnline = response.status === 200;
            return this.isOnline;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }

    private startPeriodicSync() {
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

// Функция для загрузки конфигурации Railway
export function loadRailwayConfig(configPath: string): RailwayConfig {
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