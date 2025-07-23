import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';

// Импорты наших классов
import { AdamReader } from './adam-reader';
import { SHDRManager, SHDRConnectionConfig } from './shdr-client';

// Загружаем конфигурацию
const configPath = path.join(__dirname, 'config.json');
console.log(`🔧 Используется конфигурация: config.json`);

if (!fs.existsSync(configPath)) {
    throw new Error(`❌ Конфигурационный файл не найден: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Упрощенный интерфейс машины  
interface MachineConfig {
    id: string;
    name: string;
    ip: string;
    port: number;
    type: string;
    uuid: string;
    adamChannel?: number;
    countingMethod?: string;
}

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы (дашборд)
app.use(express.static(path.join(__dirname, '..', 'apps', 'cloud-api', 'public')));

// Машины из конфигурации
const FANUC_MACHINES: MachineConfig[] = config.machines;

// Инициализация SHDR Manager
const shdrManager = new SHDRManager();

// Инициализация AdamReader
const adamReader = new AdamReader();

// Настройка SHDR подключений
FANUC_MACHINES.forEach(machine => {
    const shdrConfig: SHDRConnectionConfig = {
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
shdrManager.on('machineConnected', (machineId: string) => {
    console.log(`🎉 SHDR машина подключена: ${machineId}`);
});

shdrManager.on('machineDisconnected', (machineId: string) => {
    console.log(`😞 SHDR машина отключена: ${machineId}`);
});

shdrManager.on('dataReceived', (machineId: string, dataItem: any) => {
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

// API для получения списка машин (совместимый с дашбордом)
app.get('/api/machines', async (req, res) => {
    // MTConnect машины (FANUC)
    const mtconnectMachines = FANUC_MACHINES.map(machine => {
        const connectionStatus = shdrManager.getMachineConnectionStatus(machine.id);
        const machineData = shdrManager.getMachineData(machine.id);
        const cycleTimeData = shdrManager.getMachineCycleTime(machine.id);

        const partCount = machineData?.get('part_count')?.value || 'N/A';
        const program = machineData?.get('program')?.value || 'N/A';
        const execution = machineData?.get('execution')?.value || 'N/A';
        
        // Форматируем время цикла
        const cycleTime = cycleTimeData?.cycleTimeMs 
            ? (cycleTimeData.cycleTimeMs / 1000).toFixed(2) 
            : 'N/A';

        return {
            id: machine.id,
            name: machine.name,
            ip: machine.ip,
            port: machine.port,
            type: machine.type,
            status: connectionStatus ? 'online' : 'offline', // Используем реальный статус
            connectionStatus: connectionStatus ? 'ACTIVE' : 'INACTIVE',
            category: 'mtconnect',
            partCount: partCount,
            program: program,
            execution: execution,
            cycleTime: cycleTime,
            cycleConfidence: cycleTimeData?.confidence || 'N/A',
            source: 'SHDR (Direct)'
        };
    });
    
    // ADAM машины (получаем актуальные данные)
    let adamMachines: any[] = [];
    try {
        const counters = await adamReader.readCounters();
        console.log(`📊 API: Получено ${counters.length} ADAM счетчиков для дашборда`);
        adamMachines = counters.map(counter => ({
            id: counter.machineId,
            name: counter.machineId,
            type: 'ADAM-6050',
            count: counter.count,
            cycleTime: counter.cycleTimeMs ? (counter.cycleTimeMs / 1000).toFixed(2) : 'N/A',
            confidence: counter.confidence || 'N/A',
            status: 'active',
            category: 'adam'
        }));
    } catch (error) {
        console.error('❌ API: Ошибка получения ADAM данных:', error);
    }
    
    // Формируем ответ в формате, ожидаемом дашбордом
    const response = {
        summary: {
            total: mtconnectMachines.length + adamMachines.length,
            mtconnect: {
                online: mtconnectMachines.filter(m => m.status === 'online').length,
                total: mtconnectMachines.length
            },
            adam: {
                online: adamMachines.length,
                total: adamMachines.length
            }
        },
        machines: {
            mtconnect: mtconnectMachines,
            adam: adamMachines
        },
        timestamp: new Date().toISOString()
    };
    
    res.json(response);
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
        } catch (error) {
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
    } catch (error) {
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
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API для SHDR данных
app.get('/api/shdr/data', (req, res) => {
    const shdrData: any = {};
    
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
async function startServer(): Promise<void> {
    app.listen(port, () => {
        console.log(`✅ Сервер запущен на http://localhost:${port}`);
        console.log(`💡 Откройте http://localhost:${port}/dashboard-new.html для просмотра дашборда`);
    });
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
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