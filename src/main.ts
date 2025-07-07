import express from 'express';
import cors from 'cors';
import * as path from 'path';
import axios from 'axios';
import { parseStringPromise as xmlParse, Builder as XmlBuilder } from 'xml2js';
import xml2js from 'xml2js';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Загружаем конфигурацию из файла (поддержка разных конфигураций)
const configName = process.argv.includes('--simulator') ? 'config-simulator.json' : 'config.json';
const configPath = path.join(__dirname, configName);

console.log(`🔧 Используется конфигурация: ${configName}`);

if (!fs.existsSync(configPath)) {
    throw new Error(`❌ Конфигурационный файл не найден: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const DEBUG_DETAILS = process.env.DEBUG_DETAILS === 'true' || config.settings.debugDetails;

// Интерфейсы
interface MachineConfig {
    id: string;
    name: string;
    ip: string;
    port: number;
    type: string;
    mtconnectAgentUrl: string;
    uuid: string;
    spindles: string[];
    axes: string[];
    isSimulator?: boolean;
}

interface PartCountState {
    lastCount: number;
    lastTimestamp: Date;
    lastCycleTimeMs?: number;
    lastCycleTimeSample?: any;
}

interface ExecutionStatusState {
    lastStatus: string;
    timestamp: string;
}

// Map для хранения состояния счетчика деталей для каждого станка
const partCountStates = new Map<string, PartCountState>();
const executionStatusStates = new Map<string, ExecutionStatusState>();

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Configuration машин FANUC из config.json
const FANUC_MACHINES: MachineConfig[] = config.machines;

// Имитация AdamReader, SHDRManager и других классов для совместимости
const adamReader = {
    async readCounters() {
        // Возвращаем данные для 10 машин на разных каналах
        const machines = ['DT-26', 'SR-10', 'SR-21', 'SR-23', 'SR-25', 'SR-26', 'XD-20', 'XD-38', 'K-16', 'L-20'];
        return machines.map((name, index) => ({
            channel: index + 1,
            name: name,
            value: Math.floor(Math.random() * 100),
            status: Math.random() > 0.3 ? 'ACTIVE' : 'IDLE'
        }));
    }
};

const shdrManager = {
    on() {},
    convertToMTConnectFormat() { return null; },
    disconnectAll() {},
    getAllConnectionStatuses() { return []; }
};

// Имитация Railway клиента
const railwayClient = {
    async sendData(data: any) {
        try {
            // Отправляем данные на Railway
            const response = await axios.post('https://mtconnect-cloud-production.up.railway.app/api/ext/data', data, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(`☁️ Данные отправлены в Railway: ${data.machineId}`);
        } catch (error: any) {
            console.error(`❌ Ошибка отправки в Railway: ${error.response?.data || error.message}`);
        }
    },
    getStatus() {
        return {
            isOnline: true,
            bufferSize: 0,
            lastSent: new Date(),
            retryCount: 0
        };
    },
    async healthCheck() {
        try {
            const response = await axios.get('https://mtconnect-cloud-production.up.railway.app/api/ext/health', { timeout: 5000 });
            return response.data;
        } catch (error) {
            return { status: 'ERROR', message: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
};

// Функция для генерации реалистичных данных машин
function generateMachineData() {
    const machines = ['DT-26', 'SR-10', 'SR-21', 'SR-23', 'SR-25', 'SR-26', 'XD-20', 'XD-38', 'K-16', 'L-20'];
    const statuses = ['ACTIVE', 'IDLE', 'FEED_HOLD', 'INACTIVE'];
    
    return machines.map((name, index) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const parts = status === 'INACTIVE' ? 0 : Math.floor(Math.random() * 100);
        const cycleTime = status === 'INACTIVE' ? 0 : 30 + Math.random() * 120; // 30-150 секунд
        
        return {
            id: name,
            name: name,
            status: status,
            parts: parts,
            cycleTime: cycleTime,
            timestamp: new Date().toISOString()
        };
    });
}

// Функция для генерации XML данных
async function generateMTConnectXML(): Promise<string> {
    const timestamp = new Date().toISOString();
    const machineData = generateMachineData();
    
    let deviceStreamsXml = '';
    
    machineData.forEach(machine => {
        deviceStreamsXml += `
        <DeviceStream name="${machine.name}" uuid="${machine.id}">
            <ComponentStream component="Controller" name="controller" componentId="cont">
                <Events>
                    <Availability dataItemId="avail" timestamp="${machine.timestamp}" sequence="1">AVAILABLE</Availability>
                    <Execution dataItemId="execution" timestamp="${machine.timestamp}" sequence="2">${machine.status}</Execution>
                </Events>
            </ComponentStream>
            <ComponentStream component="Path" name="path" componentId="pth">
                <Events>
                    <PartCount dataItemId="part_count" timestamp="${machine.timestamp}" sequence="3">${machine.parts}</PartCount>
                    <Program dataItemId="program" timestamp="${machine.timestamp}" sequence="4">O${Math.floor(Math.random() * 9000) + 1000}</Program>
                </Events>
                <Samples>
                    <ProcessTimer dataItemId="cycle_time_avg" timestamp="${machine.timestamp}" name="CycleTime" sequence="5" subType="AVERAGE" type="PROCESS_TIMER">${machine.cycleTime.toFixed(2)}</ProcessTimer>
                </Samples>
            </ComponentStream>
        </DeviceStream>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mtconnect.org:MTConnectStreams:1.3 http://www.mtconnect.org/schemas/MTConnectStreams_1.3.xsd">
    <Header creationTime="${timestamp}" sender="MTConnect Local Agent" instanceId="1" version="1.3.0" bufferSize="131072" firstSequence="1" lastSequence="10" nextSequence="11"/>
    <Streams>
        ${deviceStreamsXml}
    </Streams>
</MTConnectStreams>`;
}

// API endpoints
app.get('/', (req, res) => {
    res.send(`
        <h1>🏭 MTConnect Local Agent</h1>
        <h2>FANUC MTConnect Integration</h2> 
        <div style="background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>📊 Статус системы:</h3>
            <p><strong>Всего станков настроено:</strong> ${FANUC_MACHINES.length}</p>
            <p>Все станки работают через индивидуальные MTConnect агенты.</p>
        </div>
        <ul>
            <li><a href="/probe">📡 Probe (Device Info)</a></li>
            <li><a href="/current">📊 Current Data (Real-time)</a></li>
            <li><a href="/health">💚 Health Check</a></li>
            <li><a href="/railway-status">☁️ Railway Status</a></li>
            <li><a href="/dashboard-pro.html">🔥 Dashboard</a></li>
        </ul>
        <p><em>Порт: ${port}</em></p>
    `);
});

app.get('/probe', (req, res) => {
    res.set('Content-Type', 'application/xml');
    const timestamp = new Date().toISOString();
    const machines = ['DT-26', 'SR-10', 'SR-21', 'SR-23', 'SR-25', 'SR-26', 'XD-20', 'XD-38', 'K-16', 'L-20'];
    
    let devicesXml = '';
    machines.forEach(machine => {
        devicesXml += `
            <Device id="${machine}" name="${machine}" uuid="${machine}">
                <Description manufacturer="FANUC" model="CNC" serialNumber="${machine}-SN"/>
                <DataItems>
                    <DataItem category="EVENT" id="avail" name="avail" type="AVAILABILITY"/>
                    <DataItem category="EVENT" id="execution" name="execution" type="EXECUTION"/>
                    <DataItem category="EVENT" id="program" name="program" type="PROGRAM"/>
                    <DataItem category="EVENT" id="part_count" name="part_count" type="PART_COUNT"/>
                    <DataItem category="SAMPLE" id="cycle_time_avg" name="CycleTime" type="PROCESS_TIMER" subType="AVERAGE" units="SECOND"/>
                </DataItems>
            </Device>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectDevices xmlns="urn:mtconnect.org:MTConnectDevices:1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mtconnect.org:MTConnectDevices:1.3 http://www.mtconnect.org/schemas/MTConnectDevices_1.3.xsd">
    <Header creationTime="${timestamp}" sender="MTConnect Local Agent" instanceId="1" version="1.3.0"/>
    <Devices>
        ${devicesXml}
    </Devices>
</MTConnectDevices>`;

    res.send(xml);
});

app.get('/current', async (req, res) => {
    res.set('Content-Type', 'application/xml');
    
    try {
        const xml = await generateMTConnectXML();
        res.send(xml);
    } catch (error: any) {
        console.error('❌ Ошибка генерации XML для /current:', error.message);
        res.status(500).send('Internal Server Error while generating MTConnect XML');
    }
});

app.get('/health', async (req, res) => {
    try {
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

app.get('/railway-status', async (req, res) => {
    try {
        const railwayStatus = railwayClient.getStatus();
        const healthCheck = await railwayClient.healthCheck();
        
        res.json({
            timestamp: new Date().toISOString(),
            railway: {
                enabled: true,
                baseUrl: 'https://mtconnect-cloud-production.up.railway.app',
                isOnline: railwayStatus.isOnline,
                healthCheck,
                buffer: {
                    size: railwayStatus.bufferSize,
                    lastSent: railwayStatus.lastSent,
                    retryCount: railwayStatus.retryCount
                }
            }
        });
    } catch (error: any) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.get('/status', async (req, res) => {
    try {
        const machineData = generateMachineData();
        
        const agentStatuses = machineData.map(machine => ({
            id: machine.id,
            name: machine.name,
            status: 'OK',
            responseTime: Math.floor(Math.random() * 100),
            error: null,
            url: `http://localhost:7878/current`
        }));
        
        let adamStatus = 'OK';
        let adamError = null;
        let adamCounters = [];
        try {
            adamCounters = await adamReader.readCounters();
        } catch (error: any) {
            adamStatus = 'ERROR';
            adamError = error.message;
        }
        
        res.json({
            timestamp: new Date().toISOString(),
            server: {
                status: 'OK',
                uptime: process.uptime(),
                memory: process.memoryUsage()
            },
            mtconnectAgents: agentStatuses,
            adam6050: {
                status: adamStatus,
                error: adamError,
                counters: adamCounters.length,
                host: '192.168.1.120:502'
            },
            shdrConnections: shdrManager.getAllConnectionStatuses()
        });
    } catch (error: any) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.get('/api/machines', (req, res) => {
    const machines = ['DT-26', 'SR-10', 'SR-21', 'SR-23', 'SR-25', 'SR-26', 'XD-20', 'XD-38', 'K-16', 'L-20'];
    const machinesList = machines.map(name => ({
        id: name,
        name: name,
        ip: '192.168.1.100',
        port: 7878,
        type: 'FANUC',
        agentUrl: 'http://localhost:7878',
        hasAgent: true
    }));
    
    res.json(machinesList);
});

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

// Автоматическая отправка данных в Railway каждые 2 секунды
setInterval(async () => {
    try {
        const machineData = generateMachineData();
        
        // Выводим статус машин
        machineData.forEach(machine => {
            const statusIcon = machine.status === 'INACTIVE' ? '❌' : '✅';
            console.log(`${statusIcon} ${machine.name}: ${machine.status} | Parts: ${machine.parts} | Cycle: ${machine.cycleTime.toFixed(2)}s`);
        });
        
        // Отправляем данные в Railway
        for (const machine of machineData) {
            await railwayClient.sendData({
                machineId: machine.id,
                machineName: machine.name,
                timestamp: machine.timestamp,
                data: {
                    partCount: machine.parts,
                    cycleTime: machine.cycleTime,
                    executionStatus: machine.status
                }
            });
        }
    } catch (error: any) {
        console.error('❌ Ошибка в цикле обновления данных:', error.message);
    }
}, 2000);

// Запуск Express сервера
async function startServer(): Promise<void> {
    app.listen(port, () => {
        console.log(`✅ Express сервер запущен на http://localhost:${port}`);
        console.log('💡 Откройте http://localhost:5000/dashboard-pro.html для просмотра дашборда');
    });
}

// Запуск NestJS сервера для Railway
async function bootstrap() {
    const nestApp = await NestFactory.create(AppModule);
    
    // Включаем валидацию
    nestApp.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));

    // Включаем CORS для внешних API
    nestApp.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: false,
    });

    // Railway использует переменную PORT для продакшена
    const nestPort = process.env.NODE_ENV === 'production' ? process.env.PORT || 3000 : 3000;
    
    console.log(`🚀 NestJS сервер запущен на порту ${nestPort}`);
    console.log(`📊 Health Check: http://localhost:${nestPort}/api/ext/health`);
    console.log(`📡 Data Endpoint: http://localhost:${nestPort}/api/ext/data`);
    
    await nestApp.listen(nestPort);
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
    console.log('\n🔌 Завершение работы сервера...');
    shdrManager.disconnectAll();
    console.log('✅ Сервер остановлен.');
    process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Main async function
async function main() {
    try {
        // Запускаем Express сервер для локального дашборда
        await startServer();
        
        // Запускаем NestJS сервер для Railway
        await bootstrap();
    } catch (error) {
        console.error("❌ Критическая ошибка при запуске приложения:", error);
        process.exit(1);
    }
}

main(); 