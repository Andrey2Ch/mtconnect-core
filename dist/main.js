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
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const fs = __importStar(require("fs"));
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
// Импорты наших классов
const adam_reader_1 = require("./adam-reader");
const shdr_client_1 = require("./shdr-client");
const factory_1 = require("./machine-handlers/factory");
const railway_client_1 = require("./railway-client");
// Загружаем конфигурацию из файла (поддержка разных конфигураций)
let configName;
// Проверяем аргументы командной строки для кастомной конфигурации
const customConfigArg = process.argv.find(arg => arg.endsWith('.json') && !arg.startsWith('--'));
if (customConfigArg) {
    configName = customConfigArg;
}
else if (process.argv.includes('--simulator')) {
    configName = 'config-simulator.json';
}
else {
    configName = 'config.json';
}
const configPath = path.join(__dirname, configName);
console.log(`🔧 Используется конфигурация: ${configName}`);
if (!fs.existsSync(configPath)) {
    throw new Error(`❌ Конфигурационный файл не найден: ${configPath}`);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DEBUG_DETAILS = process.env.DEBUG_DETAILS === 'true' || config.settings.debugDetails;
// Map для хранения состояния счетчика деталей для каждого станка
const partCountStates = new Map();
const executionStatusStates = new Map();
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || '5000', 10);
// Middleware
app.use((0, cors_1.default)());
// Используем папку дашборда из облачного API для единого файла
app.use(express_1.default.static(path.join(__dirname, '..', 'cloud-api', 'mtconnect-cloud', 'public')));
app.use(express_1.default.json());
// Configuration машин FANUC из config.json
const FANUC_MACHINES = config.machines;
// Инициализация SHDR Manager для симуляторов и прямых SHDR подключений
const shdrManager = new shdr_client_1.SHDRManager();
// Создаём экземпляр AdamReader
const adamReader = new adam_reader_1.AdamReader();
// Инициализируем Railway клиент
const railwayConfig = (0, railway_client_1.loadRailwayConfig)(configPath);
const railwayClient = new railway_client_1.RailwayClient(railwayConfig);
// Настройка SHDR подключений для машин с isSimulator: true
FANUC_MACHINES.filter(machine => machine.isSimulator).forEach(machine => {
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
    if (DEBUG_DETAILS) {
        console.log(`📊 SHDR данные от ${machineId}: ${dataItem.dataItem} = ${dataItem.value}`);
    }
});
// Функция для генерации XML данных
async function generateMTConnectXML() {
    const timestamp = new Date().toISOString();
    const xmlBuilder = new xml2js_1.Builder({ headless: true, renderOpts: { pretty: false } });
    let deviceStreamsXmlParts = [];
    for (const machine of FANUC_MACHINES) {
        let deviceStreamDataObject = null;
        // Проверяем, это SHDR машина (симулятор) или обычный MTConnect агент
        if (machine.isSimulator) {
            // Получаем данные от SHDR Manager
            const shdrData = shdrManager.convertToMTConnectFormat(machine.id);
            if (shdrData) {
                deviceStreamDataObject = shdrData;
                console.log(`✅ Данные для ${machine.name} (${machine.id}) получены от SHDR`);
            }
            else {
                console.log(`⚠️ Нет SHDR данных для ${machine.name} (${machine.id})`);
                continue;
            }
        }
        else if (machine.mtconnectAgentUrl) {
            try {
                console.log(`🔄 Запрос данных от MTConnect Agent для ${machine.name} (${machine.id}) по адресу ${machine.mtconnectAgentUrl}/current`);
                const response = await axios_1.default.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 2500 });
                const agentXmlRaw = response.data;
                const agentXml = response.data;
                const parsedAgentXml = await (0, xml2js_1.parseStringPromise)(agentXml, { explicitArray: false });
                if (parsedAgentXml.MTConnectStreams && parsedAgentXml.MTConnectStreams.Streams && parsedAgentXml.MTConnectStreams.Streams.DeviceStream) {
                    deviceStreamDataObject = parsedAgentXml.MTConnectStreams.Streams.DeviceStream;
                    deviceStreamDataObject.$ = deviceStreamDataObject.$ || {};
                    deviceStreamDataObject.$.name = machine.name;
                    deviceStreamDataObject.$.uuid = machine.id;
                    console.log(`✅ Данные для ${machine.name} (${machine.id}) получены от MTConnect Agent`);
                    // ---> НАЧАЛО ФИНАЛЬНОЙ ВЕРСИИ ЛОГИКИ РАСЧЕТА ВРЕМЕНИ ЦИКЛА <---
                    const processComponentTree = (component) => {
                        // Рекурсивно обрабатываем вложенные компоненты и ЗАМЕНЯЕМ их на обновленные
                        if (component.ComponentStream) {
                            const subStreams = Array.isArray(component.ComponentStream) ? component.ComponentStream : [component.ComponentStream];
                            // Используем map для получения массива обновленных компонентов
                            const updatedSubStreams = subStreams.map(processComponentTree);
                            // Обновляем ComponentStream в родительском компоненте
                            component.ComponentStream = updatedSubStreams.length === 1 ? updatedSubStreams[0] : updatedSubStreams;
                        }
                        // Работаем только с компонентом Path
                        const isPath = component.$?.name === 'path' || component.$?.componentId === 'pth' || component.$?.component === 'Path';
                        if (!isPath) {
                            return component; // Возвращаем компонент без изменений
                        }
                        // --- ИНДИВИДУАЛЬНАЯ ЛОГИКА ОБРАБОТКИ ДЛЯ КАЖДОГО СТАНКА ---
                        const handler = factory_1.MachineHandlerFactory.getHandler(machine.id);
                        if (!handler) {
                            console.warn(`⚠️ Не найден обработчик для станка ${machine.id}`);
                            return component;
                        }
                        // Получаем данные через индивидуальный обработчик
                        const currentPartCount = handler.getPartCount(deviceStreamDataObject);
                        // Получаем timestamp из PartCount события или используем текущее время
                        let currentTimestampDate = new Date();
                        const partCountEvent = component.Events?.PartCount;
                        if (partCountEvent && partCountEvent.$.timestamp) {
                            currentTimestampDate = new Date(partCountEvent.$.timestamp);
                        }
                        if (currentPartCount !== null) {
                            const machineState = partCountStates.get(machine.id);
                            if (machineState && currentPartCount > machineState.lastCount) {
                                // Используем индивидуальную логику расчёта времени цикла
                                const cycleTimeMs = handler.calculateCycleTime(currentPartCount, machineState.lastCount, currentTimestampDate, machineState.lastTimestamp);
                                if (cycleTimeMs !== null) {
                                    const partsProduced = currentPartCount - machineState.lastCount;
                                    console.log(`⏱️ Цикл для ${machine.name} (${machine.id}): ${partsProduced} дет. за ${cycleTimeMs / 1000} сек. (среднее: ${cycleTimeMs / 1000} сек/дет.)`);
                                    const cycleTimeSample = {
                                        $: {
                                            dataItemId: handler.getDataItemId(),
                                            timestamp: currentTimestampDate.toISOString(),
                                            name: 'CycleTime',
                                            sequence: Math.floor(Math.random() * 100000),
                                            subType: handler.getCycleTimeFormat(),
                                            type: 'PROCESS_TIMER'
                                        },
                                        _: (cycleTimeMs / 1000).toFixed(1)
                                    };
                                    if (!component.Samples)
                                        component.Samples = {};
                                    if (!component.Samples.ProcessTimer)
                                        component.Samples.ProcessTimer = [];
                                    if (!Array.isArray(component.Samples.ProcessTimer)) {
                                        component.Samples.ProcessTimer = [component.Samples.ProcessTimer];
                                    }
                                    component.Samples.ProcessTimer.push(cycleTimeSample);
                                    console.log(`✅ Добавлен CycleTime Sample для ${machine.name}`);
                                    partCountStates.set(machine.id, {
                                        lastCount: currentPartCount,
                                        lastTimestamp: currentTimestampDate,
                                        lastCycleTimeMs: cycleTimeMs,
                                        lastCycleTimeSample: cycleTimeSample
                                    });
                                    // Отправляем данные в Railway
                                    // Маппинг MTConnect статусов в API enum
                                    const currentStatus = executionStatusStates.get(machine.id)?.lastStatus || 'UNKNOWN';
                                    let apiExecutionStatus = "UNAVAILABLE";
                                    switch (currentStatus) {
                                        case "ACTIVE":
                                        case "EXECUTING":
                                            apiExecutionStatus = "ACTIVE";
                                            break;
                                        case "IDLE":
                                        case "READY":
                                            apiExecutionStatus = "READY";
                                            break;
                                        case "STOPPED":
                                        case "STOP":
                                            apiExecutionStatus = "STOPPED";
                                            break;
                                        case "INTERRUPTED":
                                        case "FAULT":
                                            apiExecutionStatus = "INTERRUPTED";
                                            break;
                                        default:
                                            apiExecutionStatus = "UNAVAILABLE";
                                    }
                                    const railwayData = {
                                        machineId: machine.id,
                                        machineName: machine.name,
                                        timestamp: currentTimestampDate.toISOString(),
                                        data: {
                                            partCount: currentPartCount,
                                            cycleTime: cycleTimeMs / 1000,
                                            executionStatus: apiExecutionStatus,
                                            availability: "AVAILABLE",
                                            program: "O1001"
                                        }
                                    };
                                    railwayClient.sendData(railwayData);
                                }
                            }
                            else if (!machineState || currentPartCount !== machineState.lastCount) {
                                console.log(`⚙️ Обновлен PartCount для ${machine.name} (${machine.id}): ${currentPartCount} в ${currentTimestampDate.toISOString()}`);
                                partCountStates.set(machine.id, {
                                    lastCount: currentPartCount,
                                    lastTimestamp: currentTimestampDate
                                });
                            }
                            // Восстанавливаем последний Sample если есть
                            const currentState = partCountStates.get(machine.id);
                            if (currentState?.lastCycleTimeSample) {
                                if (!component.Samples)
                                    component.Samples = {};
                                if (!component.Samples.ProcessTimer)
                                    component.Samples.ProcessTimer = [];
                                if (!Array.isArray(component.Samples.ProcessTimer)) {
                                    component.Samples.ProcessTimer = [component.Samples.ProcessTimer];
                                }
                                const existingSample = component.Samples.ProcessTimer.find((sample) => sample.$?.dataItemId === handler.getDataItemId());
                                if (!existingSample) {
                                    component.Samples.ProcessTimer.push(currentState.lastCycleTimeSample);
                                    console.log(`✅ Восстановлен CycleTime Sample для ${machine.name}`);
                                }
                            }
                        }
                        return component;
                    };
                    deviceStreamDataObject = processComponentTree(deviceStreamDataObject);
                    try {
                        let pathComponentStream = null;
                        if (deviceStreamDataObject && deviceStreamDataObject.ComponentStream) {
                            const components = Array.isArray(deviceStreamDataObject.ComponentStream) ? deviceStreamDataObject.ComponentStream : [deviceStreamDataObject.ComponentStream];
                            pathComponentStream = components.find((cs) => cs.$?.name === 'path' || cs.$?.componentId === 'pth');
                        }
                        if (pathComponentStream?.Events) {
                            const events = pathComponentStream.Events;
                            let blockValue = null;
                            let blockTimestamp = null;
                            if (events.Block && events.Block._ && events.Block.$?.timestamp) {
                                blockValue = events.Block._;
                                blockTimestamp = events.Block.$.timestamp;
                            }
                            // Заглушка для программы - не читаем от станков, используем постоянное значение
                            const finalProgramDisplayValue = "O1001";
                            const finalProgramDisplayTimestamp = parsedAgentXml?.MTConnectStreams?.Header?.creationTime || timestamp;
                            if (!events.Program) {
                                events.Program = { $: {} };
                            }
                            events.Program._ = finalProgramDisplayValue;
                            events.Program.$ = events.Program.$ || {};
                            events.Program.$.timestamp = finalProgramDisplayTimestamp;
                            events.Program.$.dataItemId = 'program';
                            events.Program.$.name = 'program';
                            if (!events.Program.$.sequence) {
                                events.Program.$.sequence = parsedAgentXml?.MTConnectStreams?.Header?.nextSequence || '0';
                            }
                        }
                    }
                    catch (e) {
                        console.error(`❌ Ошибка при обновлении номера программы для ${machine.name} (${machine.id}): ${e.message}`);
                    }
                    // Обработка Execution Status
                    const componentsArg = deviceStreamDataObject?.ComponentStream;
                    const executionStatusValue = findExecutionStatusRecursive(componentsArg ? (Array.isArray(componentsArg) ? componentsArg : [componentsArg]) : undefined);
                    if (DEBUG_DETAILS)
                        console.log(`Найден Execution статус для ${machine.name} (${machine.id}):`, executionStatusValue);
                    if (executionStatusValue !== null) {
                        const currentExecutionStatus = executionStatusValue;
                        // Используем корректно определенное время из заголовка XML агента (или fallback)
                        const currentExecutionStatusTimestamp = parsedAgentXml?.MTConnectStreams?.Header?.creationTime || timestamp;
                        const previousExecutionState = executionStatusStates.get(machine.id);
                        if (previousExecutionState) {
                            if (currentExecutionStatus !== previousExecutionState.lastStatus) {
                                console.log(`🔄 Статус Execution для ${machine.name} (${machine.id}) изменился: БЫЛ ${previousExecutionState.lastStatus}, СТАЛ ${currentExecutionStatus} в ${currentExecutionStatusTimestamp}`);
                                executionStatusStates.set(machine.id, { lastStatus: currentExecutionStatus, timestamp: currentExecutionStatusTimestamp });
                                // Отправляем данные в Railway при изменении статуса
                                const currentPartCount = partCountStates.get(machine.id)?.lastCount || 0;
                                // Маппинг MTConnect статусов в API enum
                                let apiExecutionStatus = "UNAVAILABLE";
                                switch (currentExecutionStatus) {
                                    case "ACTIVE":
                                    case "EXECUTING":
                                        apiExecutionStatus = "ACTIVE";
                                        break;
                                    case "IDLE":
                                    case "READY":
                                        apiExecutionStatus = "READY";
                                        break;
                                    case "STOPPED":
                                    case "STOP":
                                        apiExecutionStatus = "STOPPED";
                                        break;
                                    case "INTERRUPTED":
                                    case "FAULT":
                                        apiExecutionStatus = "INTERRUPTED";
                                        break;
                                    default:
                                        apiExecutionStatus = "UNAVAILABLE";
                                }
                                const railwayData = {
                                    machineId: machine.id,
                                    machineName: machine.name,
                                    timestamp: currentExecutionStatusTimestamp,
                                    data: {
                                        partCount: currentPartCount,
                                        executionStatus: apiExecutionStatus,
                                        availability: "AVAILABLE",
                                        program: "O1001"
                                    }
                                };
                                railwayClient.sendData(railwayData);
                                console.log(`📤 Отправлены данные в Railway при изменении статуса: ${machine.name} -> ${currentExecutionStatus}`);
                            }
                        }
                        else {
                            console.log(`ℹ️ Инициализирован Execution статус для ${machine.name} (${machine.id}): ${currentExecutionStatus} в ${currentExecutionStatusTimestamp}`);
                            executionStatusStates.set(machine.id, { lastStatus: currentExecutionStatus, timestamp: currentExecutionStatusTimestamp });
                            // Отправляем данные в Railway при первой инициализации
                            const currentPartCount = partCountStates.get(machine.id)?.lastCount || 0;
                            // Маппинг MTConnect статусов в API enum
                            let apiExecutionStatus = "UNAVAILABLE";
                            switch (currentExecutionStatus) {
                                case "ACTIVE":
                                case "EXECUTING":
                                    apiExecutionStatus = "ACTIVE";
                                    break;
                                case "IDLE":
                                case "READY":
                                    apiExecutionStatus = "READY";
                                    break;
                                case "STOPPED":
                                case "STOP":
                                    apiExecutionStatus = "STOPPED";
                                    break;
                                case "INTERRUPTED":
                                case "FAULT":
                                    apiExecutionStatus = "INTERRUPTED";
                                    break;
                                default:
                                    apiExecutionStatus = "UNAVAILABLE";
                            }
                            const railwayData = {
                                machineId: machine.id,
                                machineName: machine.name,
                                timestamp: currentExecutionStatusTimestamp,
                                data: {
                                    partCount: currentPartCount,
                                    executionStatus: apiExecutionStatus,
                                    availability: "AVAILABLE",
                                    program: "O1001"
                                }
                            };
                            railwayClient.sendData(railwayData);
                            console.log(`📤 Отправлены данные в Railway при инициализации: ${machine.name} -> ${currentExecutionStatus}`);
                        }
                    }
                }
                else {
                    console.warn(`⚠️ Неожиданная структура XML от агента для ${machine.name} (${machine.id})`);
                }
            }
            catch (error) {
                console.error(`❌ ОШИБКА подключения к MTConnect Agent ${machine.name} (${machine.id}): ${error.message}`);
                console.error(`🔗 URL: ${machine.mtconnectAgentUrl}/current`);
                // НЕ ГЕНЕРИРУЕМ FALLBACK! Пропускаем станок если он недоступен
                continue;
            }
        }
        else {
            console.error(`🚨 Машина ${machine.name} (${machine.id}) не имеет mtconnectAgentUrl! ПРОПУСКАЕМ.`);
            // НЕ ГЕНЕРИРУЕМ UNAVAILABLE! Пропускаем станок
            continue;
        }
        if (deviceStreamDataObject) {
            let deviceXml = xmlBuilder.buildObject({ DeviceStream: deviceStreamDataObject });
            const currentState = partCountStates.get(machine.id);
            if (currentState?.lastCycleTimeMs) {
                const cycleTimeSec = (currentState.lastCycleTimeMs / 1000).toFixed(1);
                const timestamp = currentState.lastTimestamp.toISOString();
                const sequence = Math.floor(Math.random() * 100000);
                const pathSamplesRegex = /(<ComponentStream[^>]*name="path"[^>]*>.*?<Samples>)/s;
                const match = deviceXml.match(pathSamplesRegex);
                if (match) {
                    const processTimerXml = `\n        <ProcessTimer dataItemId="cycle_time_avg" timestamp="${timestamp}" name="CycleTime" sequence="${sequence}" subType="AVERAGE" type="PROCESS_TIMER">${cycleTimeSec}</ProcessTimer>`;
                    deviceXml = deviceXml.replace(match[1], match[1] + processTimerXml);
                    console.log(`✅ Добавлен ProcessTimer в XML для ${machine.name} (${machine.id}): ${cycleTimeSec} сек`);
                }
                else {
                    console.log(`⚠️ Не удалось найти Samples секцию в path компоненте для ${machine.name} (${machine.id})`);
                }
            }
            deviceStreamsXmlParts.push(deviceXml);
        }
    }
    const streamsContent = deviceStreamsXmlParts.join('\n');
    const headerSequence = deviceStreamsXmlParts.length || 0;
    return `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:1.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mtconnect.org:MTConnectStreams:1.3 http://www.mtconnect.org/schemas/MTConnectStreams_1.3.xsd">
    <Header creationTime="${timestamp}" sender="MTConnect Local Agent" instanceId="1" version="1.3.0" bufferSize="131072" firstSequence="1" lastSequence="${headerSequence}" nextSequence="${headerSequence + 1}"/>
    <Streams>
        ${streamsContent}
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
            <li><a href="/dashboard-pro.html">🔥 Real Dashboard</a></li>
        </ul>
        <p><em>Порт: ${port}</em></p>
    `);
});
app.get('/probe', (req, res) => {
    res.set('Content-Type', 'application/xml');
    const timestamp = new Date().toISOString();
    let devicesXml = '';
    // Probe генерируется одинаково для всех, т.к. dashboard.html его не сильно использует для деталей
    FANUC_MACHINES.forEach(machine => {
        // Используем machine.id для UUID, чтобы дашборд мог сопоставить
        const deviceUuid = machine.id;
        devicesXml += `
            <Device id="${deviceUuid}" name="${machine.name}" uuid="${deviceUuid}">
                <Description manufacturer="FANUC" model="${machine.type || 'Generic CNC'}" serialNumber="${deviceUuid}-SN"/>
                <DataItems>
                    <DataItem category="EVENT" id="avail" name="avail" type="AVAILABILITY"/>
                    <DataItem category="EVENT" id="estop" name="estop" type="EMERGENCY_STOP"/>
                    <DataItem category="EVENT" id="execution" name="execution" type="EXECUTION"/>
                    <DataItem category="EVENT" id="program" name="program" type="PROGRAM"/>
                    <DataItem category="SAMPLE" id="Sspeed" name="S1rpm" type="SPINDLE_SPEED" units="REVOLUTION/MINUTE"/>
                    <DataItem category="SAMPLE" id="feedrate" name="feed" type="PATH_FEEDRATE" units="MILLIMETER/MINUTE"/>
                    <DataItem category="SAMPLE" id="Xact" name="Xabs" type="POSITION" subType="ACTUAL" units="MILLIMETER"/>
                    <DataItem category="SAMPLE" id="Yact" name="Yabs" type="POSITION" subType="ACTUAL" units="MILLIMETER"/>
                    <DataItem category="SAMPLE" id="Zact" name="Zabs" type="POSITION" subType="ACTUAL" units="MILLIMETER"/>
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
    }
    catch (error) {
        console.error('❌ Ошибка генерации XML для /current:', error.message, error.stack);
        res.status(500).send('Internal Server Error while generating MTConnect XML');
    }
});
app.get('/health', async (req, res) => {
    try {
        // Проверка соединения с Adam-6050
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
// Railway статус
app.get('/railway-status', async (req, res) => {
    try {
        const railwayStatus = railwayClient.getStatus();
        const healthCheck = await railwayClient.healthCheck();
        res.json({
            timestamp: new Date().toISOString(),
            railway: {
                enabled: railwayConfig.enabled,
                baseUrl: railwayConfig.baseUrl,
                isOnline: railwayStatus.isOnline,
                healthCheck,
                buffer: {
                    size: railwayStatus.bufferSize,
                    lastSent: railwayStatus.lastSent,
                    retryCount: railwayStatus.retryCount
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});
// Детальный статус всех соединений
app.get('/status', async (req, res) => {
    try {
        // Проверка MTConnect агентов
        const agentStatuses = [];
        for (const machine of FANUC_MACHINES) {
            let status = 'UNKNOWN';
            let responseTime = 0;
            let error = null;
            if (machine.mtconnectAgentUrl) {
                try {
                    const startTime = Date.now();
                    await axios_1.default.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 3000 });
                    responseTime = Date.now() - startTime;
                    status = 'OK';
                }
                catch (err) {
                    status = 'ERROR';
                    error = err.message;
                }
            }
            else {
                status = 'NO_AGENT';
            }
            agentStatuses.push({
                id: machine.id,
                name: machine.name,
                status,
                responseTime,
                error,
                url: machine.mtconnectAgentUrl
            });
        }
        // Проверка Adam-6050
        let adamStatus = 'OK';
        let adamError = null;
        let adamCounters = [];
        try {
            adamCounters = await adamReader.readCounters();
        }
        catch (error) {
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
    }
    catch (error) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});
// API для получения сырых XML данных конкретного станка
app.get('/api/machine/:machineId/xml', async (req, res) => {
    const machineId = req.params.machineId;
    const machine = FANUC_MACHINES.find(m => m.id === machineId);
    if (!machine) {
        return res.status(404).json({ error: `Станок ${machineId} не найден` });
    }
    if (!machine.mtconnectAgentUrl) {
        return res.status(400).json({ error: `У станка ${machineId} не настроен MTConnect Agent URL` });
    }
    try {
        console.log(`🔄 Запрос XML данных для ${machine.name} (${machine.id}) по адресу ${machine.mtconnectAgentUrl}/current`);
        const response = await axios_1.default.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 5000 });
        res.set('Content-Type', 'application/xml');
        res.send(response.data);
    }
    catch (error) {
        console.error(`❌ ОШИБКА получения XML для ${machine.name} (${machine.id}): ${error.message}`);
        res.status(500).json({
            error: `Ошибка подключения к MTConnect Agent`,
            details: error.message,
            url: `${machine.mtconnectAgentUrl}/current`
        });
    }
});
// API для получения списка всех машин
app.get('/api/machines', (req, res) => {
    const machinesList = FANUC_MACHINES.map(machine => ({
        id: machine.id,
        name: machine.name,
        ip: machine.ip,
        port: machine.port,
        type: machine.type,
        agentUrl: machine.mtconnectAgentUrl,
        hasAgent: !!machine.mtconnectAgentUrl
    }));
    res.json(machinesList);
});
// API для получения времени цикла всех машин (запасной вариант)
app.get('/api/cycle-times', (req, res) => {
    const result = {};
    for (const [machineId, state] of partCountStates.entries()) {
        result[machineId] = {
            lastCycleTimeSec: state.lastCycleTimeMs ? (state.lastCycleTimeMs / 1000).toFixed(1) : null,
            lastUpdate: state.lastTimestamp ? state.lastTimestamp.toISOString() : null
        };
    }
    res.json(result);
});
// Эндпоинт для получения данных Adam-6050
app.get('/api/adam/counters', async (req, res) => {
    try {
        const counters = await getAdamCounters();
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
// Переменная для контроля частоты отправки Adam данных
let lastAdamSendTime = 0;
const ADAM_SEND_COOLDOWN = 5000; // 5 секунд между отправками Adam данных
// Функция для получения Adam счётчиков
async function getAdamCounters() {
    try {
        const counters = await adamReader.readCounters();
        console.log(`📊 Получено ${counters.length} счётчиков с Adam-6050`);
        // Подготавливаем данные Adam для отправки БАТЧЕМ (не поштучно!)
        if (counters.length > 0) {
            const now = Date.now();
            // Проверяем cooldown
            if (now - lastAdamSendTime < ADAM_SEND_COOLDOWN) {
                console.log(`⏳ Пропуск отправки Adam данных (cooldown: ${Math.round((ADAM_SEND_COOLDOWN - (now - lastAdamSendTime)) / 1000)}с)`);
                return counters;
            }
            const adamDataBatch = [];
            for (const counter of counters) {
                // Валидация данных перед обработкой
                if (!counter.machineId || counter.machineId.trim() === '') {
                    console.warn(`⚠️ Пропуск Adam данных: пустой machineId для канала ${counter.channel}`);
                    continue;
                }
                if (typeof counter.count !== 'number' || counter.count < 0) {
                    console.warn(`⚠️ Пропуск Adam данных: неправильный count ${counter.count} для ${counter.machineId}`);
                    continue;
                }
                // Преобразуем строковое значение confidence в число
                let confidenceValue = 1.0;
                if (typeof counter.confidence === 'string') {
                    switch (counter.confidence.toUpperCase()) {
                        case 'ВЫСОКАЯ':
                        case 'HIGH':
                            confidenceValue = 1.0;
                            break;
                        case 'СРЕДНЯЯ':
                        case 'MEDIUM':
                            confidenceValue = 0.7;
                            break;
                        case 'НИЗКАЯ':
                        case 'LOW':
                            confidenceValue = 0.3;
                            break;
                        default:
                            confidenceValue = 0.5; // Для неизвестных значений
                    }
                }
                else if (typeof counter.confidence === 'number') {
                    confidenceValue = counter.confidence;
                }
                const railwayData = {
                    machineId: counter.machineId,
                    machineName: counter.machineId, // Для Adam машин ID и имя одинаковые
                    timestamp: counter.timestamp,
                    data: {
                        partCount: counter.count,
                        cycleTime: counter.cycleTimeMs ? counter.cycleTimeMs / 1000 : undefined, // Конвертируем в секунды
                        adamData: {
                            analogData: {
                                "count": counter.count,
                                "cycleTimeMs": counter.cycleTimeMs || 0,
                                "partsInCycle": counter.partsInCycle || 1,
                                "confidence": confidenceValue
                            }
                        }
                    }
                };
                adamDataBatch.push(railwayData);
            }
            // Отправка Adam данных в Railway как batch
            if (adamDataBatch.length > 0) {
                const batchData = {
                    edgeGatewayId: 'adam-6050-gateway',
                    timestamp: new Date().toISOString(),
                    data: adamDataBatch.map(item => ({
                        machineId: item.machineId,
                        machineName: item.machineName,
                        timestamp: item.timestamp,
                        data: item.data
                    }))
                };
                // Логируем детали batch перед отправкой
                const machineIds = batchData.data.map(item => item.machineId);
                const uniqueMachineIds = [...new Set(machineIds)];
                console.log(`📦 Adam batch данные:`, {
                    totalMachines: batchData.data.length,
                    machineIds: machineIds,
                    uniqueMachineIds: uniqueMachineIds,
                    hasDuplicates: machineIds.length !== uniqueMachineIds.length
                });
                if (machineIds.length !== uniqueMachineIds.length) {
                    console.error(`❌ ОБНАРУЖЕНЫ ДУБЛИКАТЫ в Adam batch!`);
                    console.error(`Все ID: ${machineIds.join(', ')}`);
                    console.error(`Уникальные ID: ${uniqueMachineIds.join(', ')}`);
                    // Удаляем дубликаты
                    const uniqueData = [];
                    const seenIds = new Set();
                    for (const item of batchData.data) {
                        if (!seenIds.has(item.machineId)) {
                            uniqueData.push(item);
                            seenIds.add(item.machineId);
                        }
                        else {
                            console.log(`🗑️ Удаляем дубликат: ${item.machineId}`);
                        }
                    }
                    batchData.data = uniqueData;
                    console.log(`✅ Дубликаты удалены, итого машин: ${batchData.data.length}`);
                }
                lastAdamSendTime = now; // Обновляем время последней отправки
                railwayClient.sendDataBatch(batchData);
                console.log(`📊 Adam данные подготовлены и отправлены в Railway как batch (${batchData.data.length} машин)`);
            }
        }
        return counters;
    }
    catch (error) {
        console.error('❌ Ошибка чтения Adam-6050:', error);
        return [];
    }
}
// Запуск сервера
async function startServer() {
    app.listen(port, () => {
        console.log(`✅ Сервер запущен на http://localhost:${port}`);
        console.log('💡 Откройте http://localhost:5000/dashboard-pro.html для просмотра дашборда');
    });
}
// Graceful shutdown
async function gracefulShutdown() {
    console.log('\n🔌 Завершение работы сервера...');
    console.log('🔄 Отключение SHDR подключений...');
    shdrManager.disconnectAll();
    console.log('✅ Сервер остановлен.');
    process.exit(0);
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
// Main async function
async function main() {
    try {
        await startServer();
    }
    catch (error) {
        console.error("❌ Критическая ошибка при запуске приложения:", error);
        process.exit(1);
    }
}
function findExecutionStatusRecursive(components) {
    if (!components) {
        return null;
    }
    for (const component of components) {
        // Проверяем Events непосредственно в текущем компоненте (например, Controller)
        if (component.Events?.Execution?._) {
            if (DEBUG_DETAILS)
                console.log(`Найден Execution напрямую в Events компонента ${component.$?.name || component.$?.id}: ${component.Events.Execution._}`);
            return component.Events.Execution._;
        }
        // Проверяем вложенные ComponentStream
        if (component.ComponentStream) {
            const subStreams = Array.isArray(component.ComponentStream) ? component.ComponentStream : [component.ComponentStream];
            for (const subComponent of subStreams) {
                // Случай для <ComponentStream name="path"> <Events> <Execution> ... </Events> </ComponentStream>
                if (subComponent.$ && (subComponent.$.name === 'path' || subComponent.$.id === 'pth') && subComponent.Events?.Execution?._) {
                    if (DEBUG_DETAILS)
                        console.log(`Найден Execution в path: ${subComponent.Events.Execution._}`);
                    return subComponent.Events.Execution._;
                }
                // Общий случай для <Events> <Execution> ... </Events> внутри любого ComponentStream
                if (subComponent.Events?.Execution?._) {
                    if (DEBUG_DETAILS)
                        console.log(`Найден Execution в Events субкомпонента ${subComponent.$?.name || subComponent.$?.id}: ${subComponent.Events.Execution._}`);
                    return subComponent.Events.Execution._;
                }
                // Рекурсивный вызов для дальнейших вложенных ComponentStream
                if (subComponent.ComponentStream) {
                    const nestedComponents = Array.isArray(subComponent.ComponentStream) ? subComponent.ComponentStream : [subComponent.ComponentStream];
                    const foundInChildren = findExecutionStatusRecursive(nestedComponents);
                    if (foundInChildren) {
                        return foundInChildren;
                    }
                }
            }
        }
    }
    return null;
}
// Вспомогательная функция для извлечения номера программы из строки Block
function extractProgramFromBlock(blockString) {
    if (!blockString)
        return null;
    // 1. Сначала ищем стандартный формат в скобках (O1234) или (123-45)
    let match = blockString.match(/\(([^)]+)\)/);
    if (match && match[1]) {
        return match[1];
    }
    // 2. Если скобок нет, ищем номер программы после буквы 'O' в начале строки/блока
    //    Это будет соответствовать форматам O701-02, O1234 и т.д.
    match = blockString.match(/^O(\d{1,5}[-\.]\d{1,5}|\d{1,8})/);
    if (match && match[0]) { // match[0] содержит полное совпадение, например "O701-02"
        return match[0];
    }
    // 3. Если ничего не найдено, возвращаем null, чтобы использовать оригинальное значение Program
    return null;
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Включаем валидацию
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    // Включаем CORS для внешних API
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: false,
    });
    // Railway использует переменную PORT
    const nestPort = process.env.NODE_ENV === 'production' ? process.env.PORT || 3000 : 3000;
    console.log(`🚀 MTConnect Cloud API запущен на порту ${nestPort}`);
    console.log(`📊 Health Check: http://localhost:${nestPort}/api/ext/health`);
    console.log(`📡 Data Endpoint: http://localhost:${nestPort}/api/ext/data`);
    await app.listen(nestPort);
}
// Запускаем основной сервер
main().catch(console.error);
// Запускаем NestJS если нужно
if (process.env.NODE_ENV === 'production') {
    bootstrap().catch(console.error);
}
