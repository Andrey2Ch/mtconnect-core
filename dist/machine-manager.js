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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineManager = void 0;
exports.runMachineManagerCLI = runMachineManagerCLI;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const net = __importStar(require("net"));
class MachineManager {
    constructor(configPath = path.join(__dirname, 'config.json')) {
        this.configPath = configPath;
    }
    // Загрузить конфигурацию
    loadConfig() {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(configData);
        }
        catch (error) {
            throw new Error(`Ошибка загрузки конфигурации: ${error}`);
        }
    }
    // Сохранить конфигурацию
    saveConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
            console.log('✅ Конфигурация успешно сохранена');
        }
        catch (error) {
            throw new Error(`Ошибка сохранения конфигурации: ${error}`);
        }
    }
    // Проверить подключение к станку
    async testMachineConnection(ip, port = 8193, timeout = 2000) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let connected = false;
            socket.setTimeout(timeout);
            socket.on('connect', () => {
                connected = true;
                socket.destroy();
                resolve(true);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.connect(port, ip);
        });
    }
    // Автообнаружение станков в сети
    async scanNetwork(baseIp = '192.168.1', startRange = 1, endRange = 254) {
        console.log(`🔍 Сканирование сети ${baseIp}.${startRange}-${endRange} на порту 8193...`);
        const foundMachines = [];
        const promises = [];
        for (let i = startRange; i <= endRange; i++) {
            const ip = `${baseIp}.${i}`;
            const promise = this.testMachineConnection(ip).then(connected => {
                if (connected) {
                    foundMachines.push(ip);
                    console.log(`✅ Найден станок: ${ip}:8193`);
                }
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        console.log(`🎯 Найдено станков: ${foundMachines.length}`);
        return foundMachines.sort();
    }
    // Добавить новый станок
    addMachine(machineData) {
        const config = this.loadConfig();
        // Валидация обязательных полей
        if (!machineData.id || !machineData.name || !machineData.ip) {
            throw new Error('Обязательные поля: id, name, ip');
        }
        // Проверка на дублирование ID
        if (config.machines.find(m => m.id === machineData.id)) {
            throw new Error(`Станок с ID "${machineData.id}" уже существует`);
        }
        // Проверка на дублирование IP
        if (config.machines.find(m => m.ip === machineData.ip)) {
            throw new Error(`Станок с IP "${machineData.ip}" уже существует`);
        }
        // Создание полной конфигурации станка с defaults
        const newMachine = {
            id: machineData.id,
            name: machineData.name,
            ip: machineData.ip,
            port: machineData.port || 8193,
            type: machineData.type || 'CNC',
            mtconnectAgentUrl: machineData.mtconnectAgentUrl || this.generateAgentUrl(config.machines.length),
            uuid: machineData.uuid || machineData.id.toLowerCase(),
            spindles: machineData.spindles || ['S0'],
            axes: machineData.axes || ['X', 'Y', 'Z']
        };
        config.machines.push(newMachine);
        this.saveConfig(config);
        console.log(`✅ Добавлен станок: ${newMachine.name} (${newMachine.ip})`);
    }
    // Удалить станок
    removeMachine(machineId) {
        const config = this.loadConfig();
        const initialLength = config.machines.length;
        config.machines = config.machines.filter(m => m.id !== machineId);
        if (config.machines.length === initialLength) {
            throw new Error(`Станок с ID "${machineId}" не найден`);
        }
        this.saveConfig(config);
        console.log(`✅ Удален станок: ${machineId}`);
    }
    // Обновить станок
    updateMachine(machineId, updates) {
        const config = this.loadConfig();
        const machineIndex = config.machines.findIndex(m => m.id === machineId);
        if (machineIndex === -1) {
            throw new Error(`Станок с ID "${machineId}" не найден`);
        }
        // Обновляем только переданные поля
        config.machines[machineIndex] = { ...config.machines[machineIndex], ...updates };
        this.saveConfig(config);
        console.log(`✅ Обновлен станок: ${machineId}`);
    }
    // Проверить все станки
    async validateAllMachines() {
        const config = this.loadConfig();
        const online = [];
        const offline = [];
        console.log('🔍 Проверка подключения ко всем станкам...');
        for (const machine of config.machines) {
            const isConnected = await this.testMachineConnection(machine.ip, machine.port);
            if (isConnected) {
                online.push(`${machine.name} (${machine.ip})`);
                console.log(`✅ ${machine.name} (${machine.ip}) - подключен`);
            }
            else {
                offline.push(`${machine.name} (${machine.ip})`);
                console.log(`❌ ${machine.name} (${machine.ip}) - недоступен`);
            }
        }
        console.log(`📊 Результат: ${online.length} онлайн, ${offline.length} офлайн`);
        return { online, offline };
    }
    // Генерировать URL для MTConnect агента
    generateAgentUrl(index) {
        return `http://localhost:${5001 + index}`;
    }
    // Получить список всех станков
    listMachines() {
        const config = this.loadConfig();
        return config.machines;
    }
    // Экспорт конфигурации
    exportConfig(outputPath) {
        const config = this.loadConfig();
        fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`✅ Конфигурация экспортирована в ${outputPath}`);
    }
    // Импорт конфигурации
    importConfig(inputPath) {
        const importedConfig = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        this.saveConfig(importedConfig);
        console.log(`✅ Конфигурация импортирована из ${inputPath}`);
    }
}
exports.MachineManager = MachineManager;
// CLI утилита для управления станками
async function runMachineManagerCLI() {
    const manager = new MachineManager();
    const args = process.argv.slice(2);
    const command = args[0];
    try {
        switch (command) {
            case 'list':
                console.log('📋 Список станков:');
                manager.listMachines().forEach(machine => {
                    console.log(`  ${machine.id}: ${machine.name} (${machine.ip}:${machine.port})`);
                });
                break;
            case 'add':
                if (args.length < 4) {
                    console.error('Использование: add <id> <name> <ip> [port]');
                    process.exit(1);
                }
                manager.addMachine({
                    id: args[1],
                    name: args[2],
                    ip: args[3],
                    port: args[4] ? parseInt(args[4]) : 8193
                });
                break;
            case 'remove':
                if (args.length < 2) {
                    console.error('Использование: remove <id>');
                    process.exit(1);
                }
                manager.removeMachine(args[1]);
                break;
            case 'scan':
                const baseIp = args[1] || '192.168.1';
                const foundIps = await manager.scanNetwork(baseIp);
                console.log('\n🎯 Найденные IP адреса:');
                foundIps.forEach(ip => console.log(`  ${ip}:8193`));
                break;
            case 'validate':
                await manager.validateAllMachines();
                break;
            case 'test':
                if (args.length < 2) {
                    console.error('Использование: test <ip> [port]');
                    process.exit(1);
                }
                const isConnected = await manager.testMachineConnection(args[1], args[2] ? parseInt(args[2]) : 8193);
                console.log(`${isConnected ? '✅' : '❌'} ${args[1]}:${args[2] || 8193} - ${isConnected ? 'подключен' : 'недоступен'}`);
                break;
            default:
                console.log(`
🏭 MTConnect Machine Manager

Команды:
  list                          - Показать все станки
  add <id> <name> <ip> [port]   - Добавить новый станок
  remove <id>                   - Удалить станок
  scan [baseIp]                 - Сканировать сеть на станки
  validate                      - Проверить все станки
  test <ip> [port]             - Проверить конкретный IP

Примеры:
  node machine-manager.js list
  node machine-manager.js add "SR-30" "SR-30" "192.168.1.200"
  node machine-manager.js scan "192.168.1"
  node machine-manager.js validate
                `);
                break;
        }
    }
    catch (error) {
        console.error(`❌ Ошибка: ${error}`);
        process.exit(1);
    }
}
// Запуск CLI если файл вызван напрямую
if (require.main === module) {
    runMachineManagerCLI();
}
