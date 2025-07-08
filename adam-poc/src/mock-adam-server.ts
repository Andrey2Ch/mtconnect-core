import * as net from 'net';

/**
 * Mock Modbus TCP Server для эмуляции ADAM-6050
 * Эмулирует 16 Digital Inputs и 16 Digital Outputs
 */
export class MockAdamServer {
    private server: net.Server;
    private digitalInputs: boolean[] = new Array(16).fill(false);
    private digitalOutputs: boolean[] = new Array(16).fill(false);
    private isRunning: boolean = false;

    constructor(private port: number = 502) {
        this.server = net.createServer(this.handleConnection.bind(this));
        this.setupRandomInputs();
    }

    /**
     * Запуск Mock сервера
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                this.isRunning = true;
                console.log(`🔧 Mock ADAM-6050 сервер запущен на порту ${this.port}`);
                console.log('📊 Эмулируем 16 Digital Inputs + 16 Digital Outputs');
                resolve();
            });

            this.server.on('error', (err) => {
                console.error('❌ Ошибка Mock сервера:', err);
                reject(err);
            });
        });
    }

    /**
     * Остановка Mock сервера
     */
    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.isRunning) {
                this.server.close(() => {
                    this.isRunning = false;
                    console.log('🛑 Mock ADAM-6050 сервер остановлен');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Обработка подключения клиента
     */
    private handleConnection(socket: net.Socket): void {
        console.log(`🔌 Клиент подключился: ${socket.remoteAddress}:${socket.remotePort}`);

        socket.on('data', (data) => {
            try {
                const response = this.processModbusRequest(data);
                socket.write(response);
            } catch (error) {
                console.error('❌ Ошибка обработки Modbus запроса:', error);
            }
        });

        socket.on('close', () => {
            console.log('🔌 Клиент отключился');
        });

        socket.on('error', (err) => {
            console.error('❌ Ошибка соединения с клиентом:', err);
        });
    }

    /**
     * Обработка Modbus TCP запросов
     */
    private processModbusRequest(data: Buffer): Buffer {
        // Простая эмуляция Modbus TCP протокола
        // В реальности здесь должен быть полный парсер Modbus TCP
        
        if (data.length < 8) {
            throw new Error('Недостаточно данных в Modbus запросе');
        }

        // Modbus TCP Header: Transaction ID (2) + Protocol ID (2) + Length (2) + Unit ID (1)
        const transactionId = data.readUInt16BE(0);
        const protocolId = data.readUInt16BE(2);
        const length = data.readUInt16BE(4);
        const unitId = data.readUInt8(6);
        const functionCode = data.readUInt8(7);

        console.log(`📨 Modbus запрос: Function=${functionCode}, Unit=${unitId}, Transaction=${transactionId}`);

        // Обработка разных функций Modbus
        switch (functionCode) {
            case 0x02: // Read Discrete Inputs
                return this.handleReadDiscreteInputs(transactionId, unitId, data);
            case 0x01: // Read Coils (Digital Outputs)
                return this.handleReadCoils(transactionId, unitId, data);
            case 0x05: // Write Single Coil
                return this.handleWriteSingleCoil(transactionId, unitId, data);
            default:
                console.warn(`⚠️ Неподдерживаемая Modbus функция: ${functionCode}`);
                return this.createErrorResponse(transactionId, unitId, functionCode, 0x01); // Illegal Function
        }
    }

    /**
     * Обработка чтения Digital Inputs (Function Code 0x02)
     */
    private handleReadDiscreteInputs(transactionId: number, unitId: number, data: Buffer): Buffer {
        const startAddress = data.readUInt16BE(8);
        const quantity = data.readUInt16BE(10);

        console.log(`📥 Читаем Digital Inputs: адрес=${startAddress}, количество=${quantity}`);

        // Упаковываем биты в байты
        const byteCount = Math.ceil(quantity / 8);
        const responseData = Buffer.alloc(byteCount);

        for (let i = 0; i < quantity && (startAddress + i) < this.digitalInputs.length; i++) {
            const byteIndex = Math.floor(i / 8);
            const bitIndex = i % 8;
            if (this.digitalInputs[startAddress + i]) {
                responseData[byteIndex] |= (1 << bitIndex);
            }
        }

        // Создаем ответ
        const response = Buffer.alloc(9 + byteCount);
        response.writeUInt16BE(transactionId, 0);  // Transaction ID
        response.writeUInt16BE(0, 2);              // Protocol ID
        response.writeUInt16BE(3 + byteCount, 4);  // Length
        response.writeUInt8(unitId, 6);            // Unit ID
        response.writeUInt8(0x02, 7);              // Function Code
        response.writeUInt8(byteCount, 8);         // Byte Count
        responseData.copy(response, 9);            // Data

        return response;
    }

    /**
     * Обработка чтения Coils/Digital Outputs (Function Code 0x01)
     */
    private handleReadCoils(transactionId: number, unitId: number, data: Buffer): Buffer {
        const startAddress = data.readUInt16BE(8);
        const quantity = data.readUInt16BE(10);

        console.log(`📤 Читаем Digital Outputs: адрес=${startAddress}, количество=${quantity}`);

        // Упаковываем биты в байты
        const byteCount = Math.ceil(quantity / 8);
        const responseData = Buffer.alloc(byteCount);

        for (let i = 0; i < quantity && (startAddress + i) < this.digitalOutputs.length; i++) {
            const byteIndex = Math.floor(i / 8);
            const bitIndex = i % 8;
            if (this.digitalOutputs[startAddress + i]) {
                responseData[byteIndex] |= (1 << bitIndex);
            }
        }

        // Создаем ответ
        const response = Buffer.alloc(9 + byteCount);
        response.writeUInt16BE(transactionId, 0);  // Transaction ID
        response.writeUInt16BE(0, 2);              // Protocol ID
        response.writeUInt16BE(3 + byteCount, 4);  // Length
        response.writeUInt8(unitId, 6);            // Unit ID
        response.writeUInt8(0x01, 7);              // Function Code
        response.writeUInt8(byteCount, 8);         // Byte Count
        responseData.copy(response, 9);            // Data

        return response;
    }

    /**
     * Обработка записи одного Coil (Function Code 0x05)
     */
    private handleWriteSingleCoil(transactionId: number, unitId: number, data: Buffer): Buffer {
        const address = data.readUInt16BE(8);
        const value = data.readUInt16BE(10);

        if (address < this.digitalOutputs.length) {
            this.digitalOutputs[address] = (value === 0xFF00);
            console.log(`✏️ Записан Digital Output ${address}: ${this.digitalOutputs[address]}`);
        }

        // Эхо-ответ для записи
        const response = Buffer.alloc(12);
        response.writeUInt16BE(transactionId, 0);  // Transaction ID
        response.writeUInt16BE(0, 2);              // Protocol ID
        response.writeUInt16BE(6, 4);              // Length
        response.writeUInt8(unitId, 6);            // Unit ID
        response.writeUInt8(0x05, 7);              // Function Code
        response.writeUInt16BE(address, 8);        // Address
        response.writeUInt16BE(value, 10);         // Value

        return response;
    }

    /**
     * Создание ответа с ошибкой
     */
    private createErrorResponse(transactionId: number, unitId: number, functionCode: number, exceptionCode: number): Buffer {
        const response = Buffer.alloc(9);
        response.writeUInt16BE(transactionId, 0);           // Transaction ID
        response.writeUInt16BE(0, 2);                       // Protocol ID
        response.writeUInt16BE(3, 4);                       // Length
        response.writeUInt8(unitId, 6);                     // Unit ID
        response.writeUInt8(functionCode | 0x80, 7);        // Function Code + Error Flag
        response.writeUInt8(exceptionCode, 8);              // Exception Code

        return response;
    }

    /**
     * Настройка случайных изменений Digital Inputs для симуляции работы станков
     */
    private setupRandomInputs(): void {
        setInterval(() => {
            // Случайно изменяем несколько входов
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * 16);
                this.digitalInputs[randomIndex] = Math.random() > 0.7;
            }
        }, 2000); // Каждые 2 секунды
    }

    /**
     * Получить текущее состояние входов/выходов
     */
    getState() {
        return {
            digitalInputs: [...this.digitalInputs],
            digitalOutputs: [...this.digitalOutputs]
        };
    }
} 