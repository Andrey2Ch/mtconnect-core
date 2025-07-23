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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Импорты наших классов
const adam_reader_1 = require("./adam-reader");
const shdr_client_1 = require("./shdr-client");
// Загружаем конфигурацию
const configPath = path.join(__dirname, 'config.json');
console.log(`🔧 Используется конфигурация: config.json`);
if (!fs.existsSync(configPath)) {
    throw new Error(`❌ Конфигурационный файл не найден: ${configPath}`);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || '3000', 10);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Машины из конфигурации
const FANUC_MACHINES = config.machines;
// Инициализация SHDR Manager
const shdrManager = new shdr_client_1.SHDRManager();
// Инициализация AdamReader
const adamReader = new adam_reader_1.AdamReader();
// Настройка SHDR подключений
FANUC_MACHINES.forEach(machine => {
    const shdrConfig = {
        ip: machine.ip,
        port: machine.port,
        machineId: machine.id,
        machineName: machine.name,
        reconnectInterval: 5000,
        timeout: 10000
    };
    console.log(`🔧 Настройка SHDR подключения для ${machine.name} (${machine.ip}:${machine.port})`);
    shdrManager.addMachine(shdrConfig);
});
// События SHDR Manager
shdrManager.on('machineConnected', (machineId) => {
    console.log(`🎉 SHDR машина подключена: ${machineId}`);
});
shdrManager.on('machineDisconnected', (machineId) => {
    console.log(`😞 SHDR машина отключена: ${machineId}`);
});
shdrManager.on('dataReceived', (machineId, dataItem) => {
    console.log(`📊 SHDR данные от ${machineId}: ${dataItem.dataItem} = ${dataItem.value}`);
});
// API endpoints
app.get('/', (req, res) => {
    res.send(`
        <h1>🏭 MTConnect Modernized System</h1>
        <h2>Direct SHDR + ADAM Integration</h2> 
        <div style="background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>📊 Статус системы:</h3>
            <p><strong>FANUC станков:</strong> ${FANUC_MACHINES.length}</p>
            <p><strong>Архитектура:</strong> Прямые SHDR подключения (БЕЗ MTConnect агентов)</p>
        </div>
        <ul>
            <li><a href="/api/machines">📋 Список машин</a></li>
            <li><a href="/api/adam/counters">🔢 ADAM счетчики</a></li>
            <li><a href="/health">💚 Health Check</a></li>
        </ul>
        <p><em>Порт: ${port}</em></p>
    `);
});
// API для получения списка машин
app.get('/api/machines', (req, res) => {
    const machinesList = FANUC_MACHINES.map(machine => ({
        id: machine.id,
        name: machine.name,
        ip: machine.ip,
        port: machine.port,
        type: machine.type,
        connectionStatus: 'active'
    }));
    res.json(machinesList);
});
// Health check
app.get('/health', async (req, res) => {
    try {
        // Проверка ADAM-6050
        let adamStatus = 'OK';
        let adamCounters = 0;
        try {
            const counters = await adamReader.readCounters();
            adamCounters = counters.length;
        }
        catch (error) {
            adamStatus = 'ERROR';
        }
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            adam6050: {
                status: adamStatus,
                counters: adamCounters
            },
            machines: FANUC_MACHINES.length,
            shdrConnections: shdrManager.getAllConnectionStatuses()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// API для ADAM счетчиков
app.get('/api/adam/counters', async (req, res) => {
    try {
        const counters = await adamReader.readCounters();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            counters: counters
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// API для SHDR данных
app.get('/api/shdr/data', (req, res) => {
    const shdrData = {};
    FANUC_MACHINES.forEach(machine => {
        const data = shdrManager.convertToMTConnectFormat(machine.id);
        shdrData[machine.id] = {
            machineName: machine.name,
            connectionStatus: 'active',
            data: data || null
        };
    });
    res.json({
        timestamp: new Date().toISOString(),
        machines: shdrData
    });
});
// Запуск сервера
async function startServer() {
    app.listen(port, () => {
        console.log(`✅ Сервер запущен на http://localhost:${port}`);
        console.log(`💡 Откройте http://localhost:${port}/dashboard-new.html для просмотра дашборда`);
    });
}
// Graceful shutdown
async function gracefulShutdown() {
    console.log('\n🔌 Завершение работы...');
    console.log('🔄 Отключение SHDR подключений...');
    shdrManager.disconnectAll();
    console.log('✅ Сервер остановлен.');
    process.exit(0);
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
// Main function
async function main() {
    console.log('🚀 Запуск упрощенной системы...');
    await startServer();
    console.log('✅ Система запущена');
}
main().catch(console.error);
