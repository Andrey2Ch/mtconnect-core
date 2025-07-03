import * as net from 'net';
import { EventEmitter } from 'events';

export interface SHDRDataItem {
    timestamp: string;
    device: string;
    dataItem: string;
    value: string;
}

export interface SHDRConnectionConfig {
    ip: string;
    port: number;
    machineId: string;
    machineName: string;
    reconnectInterval?: number;
    timeout?: number;
}

export class SHDRClient extends EventEmitter {
    private socket: net.Socket | null = null;
    private config: SHDRConnectionConfig;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private buffer: string = '';

    constructor(config: SHDRConnectionConfig) {
        super();
        this.config = {
            reconnectInterval: 5000,
            timeout: 10000,
            ...config
        };
    }

    public connect(): void {
        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy();
        }

        this.socket = new net.Socket();
        this.socket.setTimeout(this.config.timeout!);

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

    private handleData(chunk: Buffer): void {
        // Добавляем данные к буферу
        this.buffer += chunk.toString();
        
        // Обрабатываем полные строки
        const lines = this.buffer.split('\n');
        
        // Сохраняем неполную последнюю строку в буфере
        this.buffer = lines.pop() || '';
        
        // Обрабатываем полные строки
        lines.forEach(line => {
            if (line.trim()) {
                this.parseSHDRLine(line.trim());
            }
        });
    }

    private parseSHDRLine(line: string): void {
        const parts = line.split('|');
        
        if (parts.length >= 4) {
            const dataItem: SHDRDataItem = {
                timestamp: parts[0],
                device: parts[1],
                dataItem: parts[2],
                value: parts[3]
            };
            
            this.emit('data', dataItem);
        } else {
            console.warn(`⚠️ Неверный формат SHDR для ${this.config.machineName}: ${line}`);
        }
    }

    private handleDisconnect(): void {
        this.isConnected = false;
        
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }

        this.emit('disconnect');
        
        // Автопереподключение
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Переподключение SHDR к ${this.config.machineName} через ${this.config.reconnectInterval}мс (попытка ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, this.config.reconnectInterval);
        } else {
            console.log(`❌ Максимум попыток переподключения исчерпан для ${this.config.machineName}`);
            this.emit('maxReconnectAttemptsReached');
        }
    }

    public disconnect(): void {
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

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    public getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }
}

export class SHDRManager extends EventEmitter {
    private clients: Map<string, SHDRClient> = new Map();
    private dataStore: Map<string, Map<string, SHDRDataItem>> = new Map();

    public addMachine(config: SHDRConnectionConfig): void {
        const client = new SHDRClient(config);
        
        client.on('connect', () => {
            console.log(`🔗 SHDR Manager: ${config.machineName} подключен`);
            this.emit('machineConnected', config.machineId);
        });

        client.on('disconnect', () => {
            console.log(`🔌 SHDR Manager: ${config.machineName} отключен`);
            this.emit('machineDisconnected', config.machineId);
        });

        client.on('data', (dataItem: SHDRDataItem) => {
            this.updateDataStore(config.machineId, dataItem);
            this.emit('dataReceived', config.machineId, dataItem);
        });

        client.on('error', (error) => {
            this.emit('machineError', config.machineId, error);
        });

        this.clients.set(config.machineId, client);
        
        // Инициализируем хранилище данных для машины
        if (!this.dataStore.has(config.machineId)) {
            this.dataStore.set(config.machineId, new Map());
        }
        
        client.connect();
    }

    private updateDataStore(machineId: string, dataItem: SHDRDataItem): void {
        const machineData = this.dataStore.get(machineId);
        if (machineData) {
            machineData.set(dataItem.dataItem, dataItem);
        }
    }

    public getMachineData(machineId: string): Map<string, SHDRDataItem> | undefined {
        return this.dataStore.get(machineId);
    }

    public getAllMachinesData(): Map<string, Map<string, SHDRDataItem>> {
        return this.dataStore;
    }

    public getMachineConnectionStatus(machineId: string): boolean {
        const client = this.clients.get(machineId);
        return client ? client.getConnectionStatus() : false;
    }

    public getAllConnectionStatuses(): Map<string, boolean> {
        const statuses = new Map<string, boolean>();
        for (const [machineId, client] of this.clients) {
            statuses.set(machineId, client.getConnectionStatus());
        }
        return statuses;
    }

    public disconnectAll(): void {
        for (const client of this.clients.values()) {
            client.disconnect();
        }
        this.clients.clear();
        this.dataStore.clear();
    }

    public getConnectedMachinesCount(): number {
        let count = 0;
        for (const client of this.clients.values()) {
            if (client.getConnectionStatus()) {
                count++;
            }
        }
        return count;
    }

    // Конвертация SHDR данных в MTConnect формат
    public convertToMTConnectFormat(machineId: string): any {
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
                    Events: {} as { [key: string]: any },
                    Samples: {} as { [key: string]: any }
                },
                {
                    $: {
                        component: "Path", 
                        componentId: "path",
                        name: "path"
                    },
                    Events: {} as { [key: string]: any },
                    Samples: {} as { [key: string]: any }
                }
            ]
        };

        // Маппинг SHDR параметров в MTConnect структуру
        for (const [dataItemName, dataItem] of machineData) {
            const mtconnectItem = {
                _: dataItem.value,
                $: {
                    dataItemId: dataItemName,
                    timestamp: dataItem.timestamp || timestamp,
                    name: dataItemName
                }
            };

            // Определяем, куда поместить элемент (Events или Samples)
            const isEvent = ['avail', 'mode', 'exec', 'program', 'block', 'estop', 'door', 'coolant'].includes(dataItemName);
            const componentIndex = ['Xact', 'Yact', 'Zact', 'program', 'block', 'exec'].includes(dataItemName) ? 1 : 0;
            
            if (isEvent) {
                deviceStream.ComponentStream[componentIndex].Events[this.capitalizeFirst(dataItemName)] = mtconnectItem;
            } else {
                deviceStream.ComponentStream[componentIndex].Samples[this.capitalizeFirst(dataItemName)] = mtconnectItem;
            }
        }

        return deviceStream;
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
} 