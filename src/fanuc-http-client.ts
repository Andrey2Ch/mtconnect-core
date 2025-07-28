import * as http from 'http';
import { EventEmitter } from 'events';

export interface FanucData {
    machineId: string;
    machineName: string;
    partCount: number;
    program: string;
    programComment: string;
    availability: string;
    execution: string;
    mode: string;
    toolId: string;
    line: string;
    block: string;
    pathPosition: string;
    pathFeedrate: string;
    sspeedOvr: string;
    fovr: string;
    timestamp: string;
}

export interface FanucHttpClientConfig {
    machineId: string;
    machineName: string;
    port: number;
    ip?: string;
}

export class FanucHttpClient extends EventEmitter {
    private config: FanucHttpClientConfig;
    private isConnected: boolean = false;
    private lastData: FanucData | null = null;

    constructor(config: FanucHttpClientConfig) {
        super();
        this.config = {
            ip: 'localhost',
            ...config
        };
    }

    /**
     * Получить текущие данные от адаптера через HTTP GET /current
     */
    async getCurrentData(): Promise<FanucData | null> {
        try {
            const data = await this.makeHttpRequest('/current');
            const parsed = this.parseMTConnectData(data);
            
            if (parsed) {
                this.lastData = parsed;
                this.isConnected = true;
                this.emit('data', parsed);
            }
            
            return parsed;
        } catch (error) {
            this.isConnected = false;
            console.error(`❌ Ошибка получения данных от ${this.config.machineName}:`, error.message);
            return null;
        }
    }

    /**
     * Получить конфигурацию устройства через HTTP GET /probe  
     */
    async getProbeData(): Promise<string | null> {
        try {
            return await this.makeHttpRequest('/probe');
        } catch (error) {
            console.error(`❌ Ошибка получения probe от ${this.config.machineName}:`, error.message);
            return null;
        }
    }

    /**
     * HTTP запрос к адаптеру
     */
    private makeHttpRequest(endpoint: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.config.ip,
                port: this.config.port,
                path: endpoint,
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(data);
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('HTTP timeout'));
            });

            req.end();
        });
    }

    /**
     * Парсинг MTConnect данных (формат как в рабочем проекте)
     */
    private parseMTConnectData(rawData: string): FanucData | null {
        try {
            // MTConnect возвращает SHDR строки в конце ответа
            const lines = rawData.split('\n');
            
            // Ищем последнюю строку с данными (формат: timestamp|key|value|key|value...)
            let dataLine = '';
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.includes('|avail|') || line.includes('|part_count|')) {
                    dataLine = line;
                    break;
                }
            }

            if (!dataLine) {
                console.warn(`⚠️ Нет данных SHDR для ${this.config.machineName}`);
                return null;
            }

            // Парсим SHDR строку: timestamp|key|value|key|value...
            const parts = dataLine.split('|');
            const timestamp = parts[0];
            const data: any = {};

            // Извлекаем пары ключ-значение
            for (let i = 1; i < parts.length; i += 2) {
                if (i + 1 < parts.length) {
                    data[parts[i]] = parts[i + 1];
                }
            }

            // Извлекаем номер программы из комментария
            const programComment = data.program_comment || '';
            let program = data.program || '';
            
            // Парсим комментарий программы: % O0005(<634-04+A>) -> 5.5
            if (programComment && programComment.includes('O')) {
                const match = programComment.match(/O(\d+)/);
                if (match) {
                    const progNum = parseInt(match[1]);
                    program = `${Math.floor(progNum / 1000)}.${progNum % 1000}`;
                }
            }

            return {
                machineId: this.config.machineId,
                machineName: this.config.machineName,
                partCount: parseInt(data.part_count) || 0,
                program: program,
                programComment: programComment,
                availability: data.avail || 'UNAVAILABLE',
                execution: data.execution || 'UNAVAILABLE', 
                mode: data.mode || 'UNAVAILABLE',
                toolId: data.tool_id || '',
                line: data.line || '',
                block: data.block || '',
                pathPosition: data.path_position || '',
                pathFeedrate: data.path_feedrate || '0',
                sspeedOvr: data.SspeedOvr || '0',
                fovr: data.Fovr || '0',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Ошибка парсинга данных для ${this.config.machineName}:`, error);
            return null;
        }
    }

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    public getLastData(): FanucData | null {
        return this.lastData;
    }
}

/**
 * Менеджер для управления несколькими HTTP клиентами FANUC
 */
export class FanucHttpManager extends EventEmitter {
    private clients: Map<string, FanucHttpClient> = new Map();

    addMachine(config: FanucHttpClientConfig): void {
        const client = new FanucHttpClient(config);
        
        client.on('data', (data: FanucData) => {
            this.emit('data', data);
        });

        this.clients.set(config.machineId, client);
        console.log(`🔧 Добавлен HTTP клиент для ${config.machineName} (localhost:${config.port})`);
    }

    async getAllMachinesData(): Promise<FanucData[]> {
        const results: FanucData[] = [];
        const promises: Promise<FanucData | null>[] = [];

        for (const [machineId, client] of this.clients) {
            promises.push(client.getCurrentData());
        }

        const responses = await Promise.allSettled(promises);
        
        responses.forEach((response, index) => {
            if (response.status === 'fulfilled' && response.value) {
                results.push(response.value);
            }
        });

        return results;
    }

    getMachineData(machineId: string): FanucData | null {
        const client = this.clients.get(machineId);
        return client ? client.getLastData() : null;
    }

    getMachineConnectionStatus(machineId: string): boolean {
        const client = this.clients.get(machineId);
        return client ? client.getConnectionStatus() : false;
    }

    async testAllConnections(): Promise<void> {
        console.log('🔍 Тестирование подключений ко всем FANUC адаптерам...');
        
        for (const [machineId, client] of this.clients) {
            try {
                const data = await client.getCurrentData();
                if (data) {
                    console.log(`✅ ${data.machineName}: ${data.partCount} деталей, программа ${data.program}`);
                } else {
                    console.log(`❌ ${machineId}: нет данных`);
                }
            } catch (error) {
                console.log(`❌ ${machineId}: ошибка подключения`);
            }
        }
    }
} 