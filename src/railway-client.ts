import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const logFilePath = path.join(__dirname, '..', 'edge-gateway.log');
const log = (message: string) => {
    // Очищаем лог при первом запуске, чтобы не путаться в старых записях
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
    }
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${message}\n`);
    console.log(`[LOG] ${message}`); // Дублируем в консоль для наглядности
};

// Очистим лог при старте приложения
if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
}
log('--- Edge Gateway Log Initialized ---');

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
            log('🔕 Railway client is disabled. Skipping send.');
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
            log('🔕 Railway client is disabled. Skipping send.');
            console.log('🔕 Railway клиент отключён');
            return false;
        }

        try {
            log(`📤 Preparing to send batch data for ${batchData.data.length} machines from source: ${batchData.source}`);
            console.log(`📤 Отправка batch данных в Railway (${batchData.data.length} машин)...`);
            
            // Форматируем данные в правильный формат для API
            const formattedData = batchData.data.map((item: any) => ({
                machineId: item.machineId,
                machineName: item.machineName,
                timestamp: item.timestamp,
                data: item.data
            }));
            
            const payload = {
                source: batchData.source || 'unknown', // Используем source из batchData
                edgeGatewayId: this.config.edgeGatewayId,
                timestamp: new Date().toISOString(),
                updates: formattedData
            };
            
            log(`PAYLOAD: ${JSON.stringify(payload, null, 2)}`);

            const response = await this.httpClient.post('/api/machine-data/batch', payload);
            
            if (response.status === 200 || response.status === 201) {
                log(`✅ SUCCESS: Batch data sent successfully. Status: ${response.status}`);
                console.log(`✅ Batch данные успешно отправлены в Railway (${batchData.data.length} машин)`);
                this.isOnline = true;
                return true;
            } else {
                log(`⚠️ UNEXPECTED STATUS: ${response.status}`);
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        } catch (error: any) {
            log(`❌ ERROR sending batch data: ${error.message}`);
            if (error.response) {
                log(`ERROR DETAILS: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.error('❌ Ошибка отправки batch данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/machine-data/batch`);
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
                source: 'adam-gateway', // Для flushBuffer всегда adam
                edgeGatewayId: this.config.edgeGatewayId,
                timestamp: new Date().toISOString(),
                updates: formattedData
            };

            log(`📤 Flushing buffer with ${this.dataBuffer.data.length} records.`);
            console.log(`📤 Отправка ${this.dataBuffer.data.length} записей в Railway...`);
            
            const response = await this.httpClient.post('/api/machine-data/batch', payload);
            
            if (response.status === 200 || response.status === 201) {
                log(`✅ SUCCESS: Buffer flushed successfully. Status: ${response.status}`);
                console.log(`✅ Данные успешно отправлены в Railway (${this.dataBuffer.data.length} записей)`);
                this.dataBuffer.data = [];
                this.dataBuffer.lastSent = new Date();
                this.dataBuffer.retryCount = 0;
                this.isOnline = true;
                return true;
            } else {
                log(`⚠️ UNEXPECTED STATUS on flush: ${response.status}`);
                throw new Error(`Неожиданный статус ответа: ${response.status}`);
            }
        } catch (error: any) {
            log(`❌ ERROR flushing buffer: ${error.message}`);
            if (error.response) {
                log(`ERROR DETAILS on flush: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.error('❌ Ошибка отправки данных в Railway:');
            console.error(`🔗 URL: ${this.config.baseUrl}/api/machine-data/batch`);
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
            log('🩺 Performing health check...');
            const response = await this.httpClient.get('/api/health'); // Используем стандартный health-check
            this.isOnline = response.status === 200;
            log(`헬스 체크 결과: ${this.isOnline ? 'Online' : 'Offline'}`);
            return this.isOnline;
        } catch (error) {
            log(`❌ Health check failed: ${error.message}`);
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