"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
const PORT = 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
let machineData = [];
let lastDataUpdate = new Date();
const configPath = path_1.default.join(__dirname, 'config.json');
let localConfig = {};
try {
    const configData = fs_1.default.readFileSync(configPath, 'utf8');
    localConfig = JSON.parse(configData);
}
catch (error) {
    console.error('❌ Ошибка загрузки конфигурации:', error);
    process.exit(1);
}
function generateMockData(machine) {
    const isOnline = Math.random() > 0.2;
    if (!isOnline) {
        return {
            availability: 'UNAVAILABLE',
            executionStatus: 'INACTIVE',
            partCount: 0,
            cycleTime: 0,
            program: '',
            block: '',
            line: ''
        };
    }
    const statuses = ['ACTIVE', 'IDLE', 'FEED_HOLD'];
    const programs = ['O1001', 'O1002', 'O1003', 'O1004'];
    return {
        availability: 'AVAILABLE',
        executionStatus: statuses[Math.floor(Math.random() * statuses.length)],
        partCount: Math.floor(Math.random() * 100) + 1,
        cycleTime: Math.round((Math.random() * 120 + 30) * 100) / 100,
        program: programs[Math.floor(Math.random() * programs.length)],
        block: `N${Math.floor(Math.random() * 999) + 1}`,
        line: `${Math.floor(Math.random() * 999) + 1}`
    };
}
async function collectMachineData() {
    const collectedData = [];
    for (const machine of localConfig.machines) {
        try {
            const data = generateMockData(machine);
            collectedData.push({
                machineId: machine.id,
                machineName: machine.name,
                timestamp: new Date().toISOString(),
                data: data
            });
            console.log(`✅ ${machine.id}: ${data.executionStatus} | Parts: ${data.partCount} | Cycle: ${data.cycleTime}s`);
        }
        catch (error) {
            console.error(`❌ Ошибка сбора данных с ${machine.id}:`, error);
            collectedData.push({
                machineId: machine.id,
                machineName: machine.name,
                timestamp: new Date().toISOString(),
                data: {
                    availability: 'UNAVAILABLE',
                    executionStatus: 'INACTIVE',
                    partCount: 0,
                    cycleTime: 0
                }
            });
        }
    }
    machineData = collectedData;
    lastDataUpdate = new Date();
    await sendToRailway(collectedData);
}
async function sendToRailway(data) {
    if (!localConfig.railway || !localConfig.railway.enabled) {
        console.log('🔄 Railway отключен в конфигурации');
        return;
    }
    try {
        const railwayData = {
            edgeGatewayId: localConfig.railway.edgeGatewayId || 'MTConnect-Edge-1',
            timestamp: new Date().toISOString(),
            data: data
        };
        const response = await axios_1.default.post(`${localConfig.railway.baseUrl}/api/ext/data`, railwayData, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': localConfig.railway.apiKey
            },
            timeout: 5000
        });
        console.log('✅ Данные отправлены в Railway:', response.data);
    }
    catch (error) {
        console.error('❌ Ошибка отправки в Railway:');
        console.error(`🔗 URL: ${localConfig.railway.baseUrl}/api/ext/data`);
        console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
        console.error(`💬 Сообщение: ${error.response?.data || error.message || error.toString()}`);
    }
}
app.get('/api/machines', (req, res) => {
    res.json({
        machines: machineData,
        lastUpdate: lastDataUpdate,
        totalMachines: localConfig.machines.length
    });
});
app.get('/current', (req, res) => {
    res.set('Content-Type', 'application/xml');
    const timestamp = lastDataUpdate.toISOString();
    const deviceStreamsXml = machineData.map(machine => {
        const availability = machine.data.availability || 'AVAILABLE';
        const execution = machine.data.executionStatus || 'IDLE';
        const program = machine.data.program || 'O1001';
        const partCount = machine.data.partCount || 0;
        const cycleTime = machine.data.cycleTime || 0;
        return `<DeviceStream name="${machine.machineName}" uuid="${machine.machineId}" timestamp="${machine.timestamp}">
      <ComponentStream name="controller" component="Controller">
        <Events>
          <Availability dataItemId="avail" timestamp="${machine.timestamp}" name="avail">${availability}</Availability>
          <Execution dataItemId="execution" timestamp="${machine.timestamp}" name="execution">${execution}</Execution>
          <Program dataItemId="program" timestamp="${machine.timestamp}" name="program">${program}</Program>
        </Events>
      </ComponentStream>
      <ComponentStream name="path" component="Path">
        <Events>
          <Execution dataItemId="execution" timestamp="${machine.timestamp}" name="execution">${execution}</Execution>
          <Program dataItemId="program" timestamp="${machine.timestamp}" name="program">${program}</Program>
        </Events>
        <Samples>
          <PartCount dataItemId="part_count" timestamp="${machine.timestamp}" name="part_count">${partCount}</PartCount>
          <ProcessTimer dataItemId="cycle_time_avg" timestamp="${machine.timestamp}" name="CycleTime" subType="AVERAGE">${cycleTime}</ProcessTimer>
        </Samples>
      </ComponentStream>
    </DeviceStream>`;
    }).join('\n        ');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mtconnect.org:MTConnectStreams:1.3 http://www.mtconnect.org/schemas/MTConnectStreams_1.3.xsd">
    <Header creationTime="${timestamp}" sender="MTConnect Local Agent" instanceId="1" version="1.3.0" bufferSize="131072" firstSequence="1" lastSequence="${machineData.length}" nextSequence="${machineData.length + 1}"/>
    <Streams>
        ${deviceStreamsXml}
    </Streams>
</MTConnectStreams>`;
    res.send(xml);
});
app.get('/api/adam/counters', (req, res) => {
    const adamData = localConfig.machines.map((machine, index) => {
        const machineData = getMachineData(machine.id);
        let activityStatus = 'adam-online';
        let activityText = 'Онлайн';
        let confidence = 'ВЫСОКАЯ';
        let cycleTimeMs = null;
        if (machineData && machineData.data.executionStatus === 'ACTIVE') {
            activityStatus = 'adam-producing';
            activityText = 'ПРОИЗВОДИТ';
            cycleTimeMs = machineData.data.cycleTime * 1000;
            confidence = 'ВЫСОКАЯ';
        }
        else if (machineData && machineData.data.executionStatus === 'IDLE') {
            activityStatus = 'adam-active';
            activityText = 'АКТИВЕН';
            confidence = 'СРЕДНЯЯ';
        }
        return {
            channel: index + 1,
            machineId: machine.id,
            machineName: machine.name,
            count: machineData ? machineData.data.partCount : 0,
            lastUpdate: machineData ? machineData.timestamp : new Date().toISOString(),
            status: machineData && machineData.data.availability === 'AVAILABLE' ? 'connected' : 'disconnected',
            cycleTimeMs: cycleTimeMs,
            confidence: confidence,
            partsInCycle: machineData ? Math.floor(machineData.data.partCount / 10) : 0,
            timestamp: machineData ? machineData.timestamp : new Date().toISOString()
        };
    });
    res.json({
        counters: adamData,
        totalChannels: 10,
        activeChannels: adamData.filter((d) => d.status === 'connected').length,
        lastUpdate: lastDataUpdate.toISOString()
    });
});
function getMachineData(machineId) {
    return machineData.find(m => m.machineId === machineId);
}
app.get('/status', (req, res) => {
    const onlineMachines = machineData.filter(m => m.data.availability === 'AVAILABLE').length;
    const activeMachines = machineData.filter(m => m.data.executionStatus === 'ACTIVE').length;
    const mtconnectAgents = localConfig.machines.map((machine) => ({
        id: machine.id,
        name: machine.name,
        status: 'OK',
        responseTime: Math.floor(Math.random() * 50) + 10,
        error: null,
        url: machine.mtconnectAgentUrl || 'mock'
    }));
    res.json({
        timestamp: new Date().toISOString(),
        server: {
            status: 'OK',
            uptime: process.uptime(),
            memory: {
                heapUsed: process.memoryUsage().heapUsed,
                heapTotal: process.memoryUsage().heapTotal,
                external: process.memoryUsage().external,
                rss: process.memoryUsage().rss
            }
        },
        adam6050: {
            status: 'OK',
            error: null,
            counters: 2,
            host: '192.168.1.100:502'
        },
        mtconnectAgents: mtconnectAgents,
        railway: {
            status: localConfig.railway?.enabled ? 'enabled' : 'disabled',
            url: localConfig.railway?.baseUrl,
            lastSyncAttempt: lastDataUpdate.toISOString()
        },
        overview: {
            totalMachines: machineData.length,
            onlineMachines: onlineMachines,
            activeMachines: activeMachines,
            productionRate: Math.round((activeMachines / machineData.length) * 100)
        }
    });
});
app.get('/api/machines/:id', (req, res) => {
    const machineId = req.params.id;
    const machine = machineData.find(m => m.machineId === machineId);
    if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(machine);
});
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        service: 'MTConnect Edge Gateway',
        timestamp: new Date().toISOString(),
        dataLastUpdate: lastDataUpdate,
        machineCount: machineData.length,
        railwayEnabled: localConfig.railway?.enabled || false
    });
});
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'cloud-api', 'mtconnect-cloud', 'public', 'dashboard-pro.html'));
});
app.get('/dashboard-pro.html', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'cloud-api', 'mtconnect-cloud', 'public', 'dashboard-pro.html'));
});
app.listen(PORT, () => {
    console.log(`🚀 MTConnect Edge Gateway запущен на http://localhost:${PORT}`);
    console.log(`📊 Дашборд доступен по адресу: http://localhost:${PORT}`);
    console.log(`🔄 Сбор данных с ${localConfig.machines.length} машин...`);
    collectMachineData();
    setInterval(collectMachineData, localConfig.settings.dataUpdateInterval || 5000);
});
//# sourceMappingURL=local-dashboard.js.map