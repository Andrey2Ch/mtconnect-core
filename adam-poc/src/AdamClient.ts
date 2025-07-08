import * as ModbusRTU from 'jsmodbus';
import { Socket } from 'net';

/**
 * ADAM-6050 Modbus TCP Client
 * Подключение к ADAM-6050 через Modbus TCP для чтения Digital I/O
 */
export class AdamClient {
    private client: ModbusRTU.ModbusTCPClient;
    private socket: Socket;
    private keepAliveInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 5;
    private readonly reconnectInterval: number = 5000; // 5 секунд
    private readonly keepAliveIntervalMs: number = 30000; // 30 секунд
    private _isConnected: boolean = false;

    constructor(
        private readonly ip: string,
        private readonly port: number = 502,
        private readonly unitId: number = 1
    ) {
        this.socket = new Socket();
        this.client = new ModbusRTU.client.TCP(this.socket, this.unitId);
        this.setupSocketEvents();
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    /**
     * Подключение к ADAM-6050
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`🔌 Подключение к ADAM-6050 на ${this.ip}:${this.port}...`);
            
            this.socket.connect(this.port, this.ip, () => {
                console.log('✅ Подключен к ADAM-6050');
                this._isConnected = true;
                this.reconnectAttempts = 0;
                this.startKeepAlive();
                resolve();
            });

            // Таймаут подключения
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут подключения к ADAM-6050'));
            }, 10000);

            this.socket.once('connect', () => {
                clearTimeout(timeout);
            });

            this.socket.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Отключение от ADAM-6050
     */
    async disconnect(): Promise<void> {
        return new Promise((resolve) => {
            this.stopKeepAlive();
            this._isConnected = false;
            
            this.socket.end(() => {
                console.log('🔌 Отключен от ADAM-6050');
                resolve();
            });
        });
    }

    /**
     * Чтение Digital Inputs (16 каналов)
     * ADAM-6050 имеет 16 digital inputs на адресах 0-15
     */
    async readDigitalInputs(): Promise<boolean[]> {
        return this.executeWithRetry(async () => {
            const response = await this.client.readDiscreteInputs(0, 16);
            return response.response.body.valuesAsArray.map(val => Boolean(val));
        });
    }

    /**
     * Чтение Digital Outputs (16 каналов)
     * ADAM-6050 имеет 16 digital outputs на адресах 0-15
     */
    async readDigitalOutputs(): Promise<boolean[]> {
        return this.executeWithRetry(async () => {
            const response = await this.client.readCoils(0, 16);
            return response.response.body.valuesAsArray.map(val => Boolean(val));
        });
    }

    /**
     * Запись в Digital Outputs
     */
    async writeDigitalOutput(address: number, value: boolean): Promise<void> {
        return this.executeWithRetry(async () => {
            await this.client.writeSingleCoil(address, value);
        });
    }

    /**
     * Выполнение операции с повторными попытками
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3
    ): Promise<T> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!this._isConnected) {
                    throw new Error('Нет подключения к ADAM-6050');
                }
                return await operation();
            } catch (error) {
                console.warn(`⚠️ Операция неуспешна, попытка ${attempt}/${maxRetries}:`, error);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Пауза перед повторной попыткой
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Это не должно выполниться');
    }

    /**
     * Настройка событий сокета
     */
    private setupSocketEvents(): void {
        this.socket.on('error', (err) => {
            console.error('❌ Ошибка соединения:', err);
            this._isConnected = false;
            this.handleReconnect();
        });

        this.socket.on('close', () => {
            console.log('🔌 Соединение закрыто');
            this._isConnected = false;
            this.handleReconnect();
        });

        this.socket.on('timeout', () => {
            console.warn('⏰ Таймаут соединения');
            this._isConnected = false;
            this.socket.destroy();
        });
    }

    /**
     * Обработка переподключения
     */
    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Попытка переподключения (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(async () => {
                try {
                    await this.connect();
                } catch (error) {
                    console.error('❌ Переподключение неуспешно:', error);
                }
            }, this.reconnectInterval);
        } else {
            console.error('❌ Достигнуто максимальное количество попыток переподключения');
        }
    }

    /**
     * Запуск Keep-Alive
     */
    private startKeepAlive(): void {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
        }
        
        this.keepAliveInterval = setInterval(() => {
            this.sendKeepAlive();
        }, this.keepAliveIntervalMs);
        
        console.log(`💓 Keep-Alive запущен (интервал: ${this.keepAliveIntervalMs}ms)`);
    }

    /**
     * Остановка Keep-Alive
     */
    private stopKeepAlive(): void {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
            console.log('💓 Keep-Alive остановлен');
        }
    }

    /**
     * Отправка Keep-Alive запроса
     */
    private async sendKeepAlive(): Promise<void> {
        try {
            // Читаем один digital input как keep-alive запрос
            await this.client.readDiscreteInputs(0, 1);
            console.log('💓 Keep-Alive успешен');
        } catch (error) {
            console.error('❌ Keep-Alive неуспешен:', error);
            this._isConnected = false;
            this.handleReconnect();
        }
    }
} 