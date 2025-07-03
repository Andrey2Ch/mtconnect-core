"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCollector = void 0;
const net_1 = __importDefault(require("net"));
const axios_1 = __importDefault(require("axios"));
class DataCollector {
    // Попытка 1: HTTP запрос на известные порты MTConnect
    async tryMTConnectHTTP(ip, port) {
        const startTime = Date.now();
        const url = `http://${ip}:${port}/current`;
        try {
            const response = await axios_1.default.get(url, { timeout: 3000 });
            return {
                method: `HTTP MTConnect (${url})`,
                success: true,
                data: response.data.substring(0, 500) + '...',
                responseTime: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                method: `HTTP MTConnect (${url})`,
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }
    // Попытка 2: Raw TCP подключение
    async tryRawTCP(ip, port) {
        const startTime = Date.now();
        return new Promise((resolve) => {
            const socket = new net_1.default.Socket();
            let received = '';
            socket.setTimeout(3000);
            socket.on('connect', () => {
                // Попробуем отправить простой FOCAS запрос
                socket.write('\x00\x00\x00\x01'); // Минимальный FOCAS запрос
            });
            socket.on('data', (data) => {
                received += data.toString('hex');
                socket.destroy();
                resolve({
                    method: `Raw TCP (${ip}:${port})`,
                    success: true,
                    data: `Received ${data.length} bytes: ${received.substring(0, 100)}...`,
                    responseTime: Date.now() - startTime
                });
            });
            socket.on('error', (error) => {
                resolve({
                    method: `Raw TCP (${ip}:${port})`,
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - startTime
                });
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve({
                    method: `Raw TCP (${ip}:${port})`,
                    success: false,
                    error: 'Connection timeout',
                    responseTime: Date.now() - startTime
                });
            });
            socket.connect(port, ip);
        });
    }
    // Попытка 3: Проверка локальных MTConnect портов
    async tryLocalMTConnect(port) {
        return this.tryMTConnectHTTP('127.0.0.1', port);
    }
    // Попытка 4: Сканирование портов на машине
    async scanMachinePorts(ip, ports) {
        const results = [];
        for (const port of ports) {
            const startTime = Date.now();
            try {
                const result = await this.portScan(ip, port);
                results.push({
                    method: `Port Scan ${ip}:${port}`,
                    success: result,
                    data: result ? 'Port is open' : 'Port is closed',
                    responseTime: Date.now() - startTime
                });
            }
            catch (error) {
                results.push({
                    method: `Port Scan ${ip}:${port}`,
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - startTime
                });
            }
        }
        return results;
    }
    async portScan(ip, port) {
        return new Promise((resolve) => {
            const socket = new net_1.default.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(port, ip);
        });
    }
    // Полное тестирование одной машины
    async fullMachineTest(machineName, ip) {
        console.log(`\n🔍 === TESTING ${machineName} (${ip}) ===`);
        // 1. Сканирование известных портов
        console.log('\n📡 Scanning common ports...');
        const commonPorts = [80, 443, 8080, 5000, 5001, 5002, 5005, 7705, 8193];
        const portResults = await this.scanMachinePorts(ip, commonPorts);
        portResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`  ${status} ${result.method}: ${result.data || result.error}`);
        });
        // 2. Проверка MTConnect портов
        console.log('\n🌐 Testing MTConnect HTTP...');
        const mtcPorts = [5000, 5001, 5005, 8080];
        for (const port of mtcPorts) {
            const result = await this.tryMTConnectHTTP(ip, port);
            const status = result.success ? '✅' : '❌';
            console.log(`  ${status} ${result.method}: ${result.success ? 'GOT DATA!' : result.error}`);
            if (result.success && result.data) {
                console.log(`      📋 Preview: ${result.data.substring(0, 200)}...`);
            }
        }
        // 3. Raw TCP тест на порт 8193 (FOCAS)
        console.log('\n🔌 Testing raw TCP (FOCAS port 8193)...');
        const tcpResult = await this.tryRawTCP(ip, 8193);
        const status = tcpResult.success ? '✅' : '❌';
        console.log(`  ${status} ${tcpResult.method}: ${tcpResult.success ? 'GOT RESPONSE!' : tcpResult.error}`);
        if (tcpResult.success && tcpResult.data) {
            console.log(`      📋 Hex data: ${tcpResult.data}`);
        }
    }
    // Тест всех машин
    async testAllMachines() {
        const machines = [
            { name: 'DT-26', ip: '192.168.1.90' },
            { name: 'SR-10', ip: '192.168.1.91' },
            { name: 'SR-21', ip: '192.168.1.199' },
            { name: 'SR-23', ip: '192.168.1.103' },
            { name: 'SR-25', ip: '192.168.1.104' },
            { name: 'SR-26', ip: '192.168.1.54' },
            { name: 'XD-20', ip: '192.168.1.105' },
            { name: 'XD-38', ip: '192.168.1.101' }
        ];
        console.log('🚀 STARTING COMPREHENSIVE DATA COLLECTION TEST\n');
        // Сначала проверим локальные MTConnect порты
        console.log('🏠 === TESTING LOCAL MTCONNECT AGENTS ===');
        const localPorts = [5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008];
        for (const port of localPorts) {
            const result = await this.tryLocalMTConnect(port);
            const status = result.success ? '✅' : '❌';
            console.log(`${status} localhost:${port} - ${result.success ? 'ACTIVE!' : result.error}`);
            if (result.success) {
                console.log(`   📊 Data preview: ${result.data?.substring(0, 150)}...`);
            }
        }
        // Тестируем машины (только первые 3 для экономии времени)
        console.log('\n🏭 === TESTING FANUC MACHINES ===');
        for (const machine of machines.slice(0, 3)) {
            await this.fullMachineTest(machine.name, machine.ip);
        }
    }
}
exports.DataCollector = DataCollector;
