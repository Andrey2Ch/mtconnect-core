import * as net from 'net';
import { EventEmitter } from 'events';

export interface SHDRDataItem {
    timestamp: string;
    device: string;
    dataItem: string;
    value: string;
}

interface PartCountHistory {
    machineId: string;
    changes: Array<{
        timestamp: Date;
        count: number;
        delta: number;
    }>;
    lastCount?: number;
    initialized: boolean;
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
    private partCountHistory: PartCountHistory;

    constructor(config: SHDRConnectionConfig) {
        super();
        this.config = {
            reconnectInterval: 5000,
            timeout: 10000,
            ...config
        };
        this.partCountHistory = {
            machineId: config.machineId,
            changes: [],
            initialized: false
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
        
        if (parts.length < 2) {
            console.warn(`⚠️ Неверный формат SHDR для ${this.config.machineName}: ${line}`);
            return;
        }

        const timestamp = parts[0];
        
        // Обрабатываем все пары dataItem|value, начиная с индекса 1
        for (let i = 1; i < parts.length; i += 2) {
            if (i + 1 >= parts.length) break; // Нет пары для последнего элемента
            
            const dataItemName = parts[i];
            const dataItemValue = parts[i + 1];
            
            // Обработка программы - разные форматы для разных станков
            let processedDataItem = dataItemName;
            let processedValue = dataItemValue;
            
            // Для SR-23 и SR-25: используем старый формат program = O0030(1211-39)
            if (dataItemName === 'program' && (this.config.machineName === 'SR-23' || this.config.machineName === 'SR-25')) {
                const programMatch = dataItemValue.match(/^O(\d+)\(([^)]+)\)$/);
                if (programMatch) {
                    // Убираем только одну цифру с дефисом в начале (2-753-04 -> 753-04)
                    let programName = programMatch[2];
                    programName = programName.replace(/^(\d-|<)/, ''); // Только одна цифра!
                    programName = programName.replace(/(\+[^>]*>?|>)$/, '');
                    processedValue = programName;
                } else {
                    continue; // Пропускаем program без правильного формата
                }
            }
            // Для остальных станков: используем program_comment = % O1212(753-04)
            else if (dataItemName === 'program_comment') {
                const commentMatch = dataItemValue.match(/O\d+\(([^)]+)\)/);
                if (commentMatch) {
                    processedDataItem = 'program';
                    let programName = commentMatch[1];
                    // Убираем только одну цифру с дефисом в начале (2-753-04 -> 753-04) или < в начале
                    programName = programName.replace(/^(\d-|<)/, ''); // Только одна цифра!
                    programName = programName.replace(/(\+[^>]*>?|>)$/, '');
                    processedValue = programName;
                } else {
                    continue; // Пропускаем program_comment без правильного формата
                }
            }
            // Игнорируем мусорные значения program для остальных станков
            else if (dataItemName === 'program' && this.config.machineName !== 'SR-23' && this.config.machineName !== 'SR-25') {
                continue; // Пропускаем мусорные значения типа "4.0", "27.27"
            }
            
            // Фильтруем только нужные данные
            const allowedDataItems = [
                'program',      // Программа CNC
                'part_count',   // Счетчик деталей 
                'execution',    // Статус выполнения
                'execution2',   // Статус выполнения для 2-го канала
                'availability', // Доступность
                'block'         // Текущий блок программы
            ];
            
            if (allowedDataItems.includes(processedDataItem)) {
                const dataItem = {
                    timestamp: timestamp,
                    device: this.config.machineName,
                    dataItem: processedDataItem,
                    value: processedValue
                };
                
                // Отслеживаем изменения part_count для расчета времени цикла
                if (processedDataItem === 'part_count') {
                    const partCount = parseInt(processedValue);
                    if (!isNaN(partCount)) {
                        this.updatePartCountHistory(partCount);
                    }
                }
                
                console.log(`✅ SHDR ACCEPTED для ${this.config.machineName}: ${processedDataItem} = ${processedValue}`);
                this.emit('data', dataItem);
            }
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

    getCycleTimeData(): { cycleTimeMs?: number; partsInCycle: number; confidence: string } {
        return this.calculateCycleTime();
    }

    private calculateCycleTime(): { cycleTimeMs?: number; partsInCycle: number; confidence: string } {
        const history = this.partCountHistory;
        const maxAgeMs = 5 * 60 * 1000; // 5 минут
        const now = new Date();

        // Очищаем старые записи
        history.changes = history.changes.filter(change => 
            now.getTime() - change.timestamp.getTime() <= maxAgeMs
        );

        if (history.changes.length < 2) {
            return { 
                cycleTimeMs: undefined, 
                partsInCycle: 0,
                confidence: 'Недостаточно данных'
            };
        }

        const totalParts = history.changes.reduce((sum, change) => sum + change.delta, 0);
        const firstChange = history.changes[0];
        const lastChange = history.changes[history.changes.length - 1];
        const totalTimeMs = lastChange.timestamp.getTime() - firstChange.timestamp.getTime();

        if (totalParts <= 0 || totalTimeMs <= 0) {
            return { 
                cycleTimeMs: undefined, 
                partsInCycle: totalParts,
                confidence: 'Нет изменений счетчика'
            };
        }

        const avgCycleTimeMs = totalTimeMs / totalParts;

        let confidence = 'НИЗКАЯ';
        if (history.changes.length >= 5) {
            confidence = 'ВЫСОКАЯ';
        } else if (history.changes.length >= 3) {
            confidence = 'СРЕДНЯЯ';
        }

        console.log(`⏱️ ${history.machineId}: ${totalParts} дет. за ${(totalTimeMs/1000).toFixed(1)} сек = ${(avgCycleTimeMs/1000).toFixed(2)} сек/дет (${confidence})`);

        return {
            cycleTimeMs: avgCycleTimeMs,
            partsInCycle: totalParts,
            confidence: confidence
        };
    }

    private updatePartCountHistory(newCount: number): void {
        const history = this.partCountHistory;
        const now = new Date();

        if (!history.initialized) {
            history.lastCount = newCount;
            history.initialized = true;
            console.log(`📋 Инициализирована история для ${history.machineId}, начальное значение: ${newCount.toLocaleString()}`);
            return;
        }

        if (history.lastCount !== undefined && newCount !== history.lastCount) {
            const delta = newCount - history.lastCount;
            if (delta > 0) { // Только положительные изменения
                history.changes.push({
                    timestamp: now,
                    count: newCount,
                    delta: delta
                });

                console.log(`🔄 ${history.machineId}: part_count изменился с ${history.lastCount.toLocaleString()} на ${newCount.toLocaleString()} (+${delta}) в ${now.toLocaleTimeString()}`);
                
                // Рассчитываем время цикла
                this.calculateCycleTime();
            }
        }

        history.lastCount = newCount;
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

    public getMachineCycleTime(machineId: string): { cycleTimeMs?: number; partsInCycle: number; confidence: string } | undefined {
        const client = this.clients.get(machineId);
        return client?.getCycleTimeData();
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