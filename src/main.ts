import express from 'express';
import cors from 'cors';
import * as path from 'path';
import axios from 'axios';
import { parseStringPromise as xmlParse, Builder as XmlBuilder } from 'xml2js';
import xml2js from 'xml2js';
import * as fs from 'fs';
import { SHDRManager, SHDRConnectionConfig } from './shdr-client';
// import cycleTracker from './cycle-tracker'; // Закомментируйте или удалите, если не используется

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
    isSimulator?: boolean; // Новое поле для SHDR подключений
}

interface PartCountState {
    lastCount: number;
    lastTimestamp: Date;
    lastCycleTimeMs?: number; // Опционально, для хранения последнего времени цикла
    lastCycleTimeSample?: any; // НОВОЕ: Сохраняем последний Sample для постоянного отображения
}

interface ExecutionStatusState {
    lastStatus: string;
    timestamp: string;
}

// Map для хранения состояния счетчика деталей для каждого станка
const partCountStates = new Map<string, PartCountState>();
const executionStatusStates = new Map<string, ExecutionStatusState>();

const app = express();
const port = config.settings.serverPort || 5000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Configuration машин FANUC из config.json
const FANUC_MACHINES: MachineConfig[] = config.machines;

// Инициализация SHDR Manager для симуляторов и прямых SHDR подключений
const shdrManager = new SHDRManager();

// Настройка SHDR подключений для машин с isSimulator: true
FANUC_MACHINES.filter(machine => machine.isSimulator).forEach(machine => {
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
    if (DEBUG_DETAILS) {
        console.log(`📊 SHDR данные от ${machineId}: ${dataItem.dataItem} = ${dataItem.value}`);
    }
});

// Функция для генерации XML данных
async function generateMTConnectXML(): Promise<string> {
    const timestamp = new Date().toISOString();
    const xmlBuilder = new XmlBuilder({ headless: true, renderOpts: { pretty: false } });
    let deviceStreamsXmlParts: string[] = [];

    for (const machine of FANUC_MACHINES) {
        let deviceStreamDataObject: any = null; 

        // Проверяем, это SHDR машина (симулятор) или обычный MTConnect агент
        if (machine.isSimulator) {
            // Получаем данные от SHDR Manager
            const shdrData = shdrManager.convertToMTConnectFormat(machine.id);
            if (shdrData) {
                deviceStreamDataObject = shdrData;
                console.log(`✅ Данные для ${machine.name} (${machine.id}) получены от SHDR`);
            } else {
                console.log(`⚠️ Нет SHDR данных для ${machine.name} (${machine.id})`);
                continue;
            }
        } else if (machine.mtconnectAgentUrl) {
            try {
                console.log(`🔄 Запрос данных от MTConnect Agent для ${machine.name} (${machine.id}) по адресу ${machine.mtconnectAgentUrl}/current`);
                const response = await axios.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 2500 });
                const agentXmlRaw = response.data;
                const agentXml = response.data;
                const parsedAgentXml = await xmlParse(agentXml as string, { explicitArray: false });

                if (parsedAgentXml.MTConnectStreams && parsedAgentXml.MTConnectStreams.Streams && parsedAgentXml.MTConnectStreams.Streams.DeviceStream) {
                    deviceStreamDataObject = parsedAgentXml.MTConnectStreams.Streams.DeviceStream;
                    
                    deviceStreamDataObject.$ = deviceStreamDataObject.$ || {};
                    deviceStreamDataObject.$.name = machine.name; 
                    deviceStreamDataObject.$.uuid = machine.id;   
                    console.log(`✅ Данные для ${machine.name} (${machine.id}) получены от MTConnect Agent`);

                    // ---> НАЧАЛО ФИНАЛЬНОЙ ВЕРСИИ ЛОГИКИ РАСЧЕТА ВРЕМЕНИ ЦИКЛА <---
                    const processComponentTree = (component: any): any => {
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

                        // --- Логика обработки PartCount и добавления CycleTime (остается прежней) ---
                        const partCountEvent = component.Events?.PartCount;
                        if (partCountEvent && partCountEvent._ && partCountEvent.$.timestamp) {
                            const currentPartCount = parseInt(partCountEvent._, 10);
                            if (!isNaN(currentPartCount)) {
                                const currentTimestampDate = new Date(partCountEvent.$.timestamp);
                                const machineState = partCountStates.get(machine.id);

                                if (machineState && currentPartCount > machineState.lastCount) {
                                    const cycleTimeMs = currentTimestampDate.getTime() - machineState.lastTimestamp.getTime();
                                    const partsProduced = currentPartCount - machineState.lastCount;
                                    const averageCycleTimeMs = cycleTimeMs / partsProduced;

                                    console.log(` machinedetails ⏱️ Цикл для ${machine.name} (${machine.id}): ${partsProduced} дет. за ${cycleTimeMs / 1000} сек. (среднее: ${averageCycleTimeMs / 1000} сек/дет.)`);

                                    const cycleTimeSample = {
                                        $: {
                                            dataItemId: 'cycle_time_avg',
                                            timestamp: currentTimestampDate.toISOString(),
                                            name: 'CycleTime',
                                            sequence: Math.floor(Math.random() * 100000),
                                            subType: 'AVERAGE',
                                            type: 'PROCESS_TIMER'
                                        },
                                        _: (averageCycleTimeMs / 1000).toFixed(2)
                                    };

                                    if (!component.Samples) component.Samples = {};
                                    if (!component.Samples.ProcessTimer) {
                                        component.Samples.ProcessTimer = [];
                                    }
                                    if (!Array.isArray(component.Samples.ProcessTimer)) {
                                        component.Samples.ProcessTimer = [component.Samples.ProcessTimer];
                                    }
                                    component.Samples.ProcessTimer.push(cycleTimeSample);
                                    console.log(`✅ Добавлен CycleTime Sample для ${machine.name}`);
                                    
                                    partCountStates.set(machine.id, {
                                        lastCount: currentPartCount,
                                        lastTimestamp: currentTimestampDate,
                                        lastCycleTimeMs: averageCycleTimeMs,
                                        lastCycleTimeSample: cycleTimeSample // Сохраняем Sample
                                    });
                                } else if (!machineState || currentPartCount !== machineState.lastCount) {
                                    console.log(` machinedetails ⚙️ Обновлен PartCount для ${machine.name} (${machine.id}): ${currentPartCount} в ${partCountEvent.$.timestamp}`);
                                    partCountStates.set(machine.id, {
                                        lastCount: currentPartCount,
                                        lastTimestamp: currentTimestampDate
                                    });
                                }
                            }
                        }
                        // --- Конец логики ---
                        
                        return component; // Возвращаем измененный (или нет) компонент
                    };

                    // Запускаем обработку и ПЕРЕЗАПИСЫВАЕМ корневой объект
                    deviceStreamDataObject = processComponentTree(deviceStreamDataObject);
                    // ---> КОНЕЦ ФИНАЛЬНОЙ ВЕРСИИ ЛОГИКИ <---

                    // ---> НАЧАЛО ОБНОВЛЕНИЯ НОМЕРА ПРОГРАММЫ (из Block) <---
                    try {
                        let pathComponentStream: any = null;
                        if (deviceStreamDataObject && deviceStreamDataObject.ComponentStream) {
                            const components = Array.isArray(deviceStreamDataObject.ComponentStream) ? deviceStreamDataObject.ComponentStream : [deviceStreamDataObject.ComponentStream];
                            pathComponentStream = components.find((cs: any) => cs.$?.name === 'path' || cs.$?.componentId === 'pth');
                        }

                        if (pathComponentStream?.Events) {
                            const events = pathComponentStream.Events; // С explicitArray: false, Events - объект, если уникален

                            let blockValue: string | null = null;
                            let blockTimestamp: string | null = null;
                            if (events.Block && events.Block._ && events.Block.$?.timestamp) {
                                blockValue = events.Block._;
                                blockTimestamp = events.Block.$.timestamp;
                            }

                            let originalProgramValue: string | null = null;
                            let originalProgramTimestamp: string | null = null;
                            if (events.Program && events.Program._ && events.Program.$?.timestamp) {
                                originalProgramValue = events.Program._;
                                originalProgramTimestamp = events.Program.$.timestamp;
                            }

                            const parsedProgFromBlock = blockValue ? extractProgramFromBlock(blockValue) : null;

                            let finalProgramDisplayValue = "-";
                            // Используем общий timestamp итерации как fallback, если ниоткуда не смогли взять timestamp программы
                            let finalProgramDisplayTimestamp = parsedAgentXml?.MTConnectStreams?.Header?.creationTime || timestamp; 

                            if (parsedProgFromBlock && blockTimestamp) {
                                finalProgramDisplayValue = parsedProgFromBlock;
                                finalProgramDisplayTimestamp = blockTimestamp;
                            } else if (originalProgramValue && originalProgramTimestamp) {
                                finalProgramDisplayValue = originalProgramValue;
                                finalProgramDisplayTimestamp = originalProgramTimestamp;
                            }
                            
                            // Обновляем или создаем Program DataItem в pathComponentStream.Events
                            if (!events.Program) { // Если Program DataItem отсутствует
                                events.Program = { $: {} }; 
                            }
                            events.Program._ = finalProgramDisplayValue;
                            events.Program.$ = events.Program.$ || {}; // Убедимся, что $ существует
                            events.Program.$.timestamp = finalProgramDisplayTimestamp;
                            events.Program.$.dataItemId = 'program'; 
                            events.Program.$.name = 'program'; 
                            if(!events.Program.$.sequence) { 
                                events.Program.$.sequence = parsedAgentXml?.MTConnectStreams?.Header?.nextSequence || '0';
                            }
                            if (DEBUG_DETAILS) console.log(`machinedetails 📝 Обновлен Program для ${machine.name} (${machine.id}): ${finalProgramDisplayValue} в ${finalProgramDisplayTimestamp}`);
                        }
                    } catch (e: any) {
                        console.error(`❌ Ошибка при обновлении номера программы для ${machine.name} (${machine.id}): ${e.message}`);
                    }
                    // ---> КОНЕЦ ОБНОВЛЕНИЯ НОМЕРА ПРОГРАММЫ <---

                    // Обработка Execution Status
                    const componentsArg = deviceStreamDataObject?.ComponentStream;
                    const executionStatusValue = findExecutionStatusRecursive(componentsArg ? (Array.isArray(componentsArg) ? componentsArg : [componentsArg]) : undefined);

                    if (DEBUG_DETAILS) console.log(`Найден Execution статус для ${machine.name} (${machine.id}):`, executionStatusValue);

                    if (executionStatusValue !== null) {
                        const currentExecutionStatus = executionStatusValue;
                        // Используем корректно определенное время из заголовка XML агента (или fallback)
                        const currentExecutionStatusTimestamp = parsedAgentXml?.MTConnectStreams?.Header?.creationTime || timestamp; 

                        const previousExecutionState = executionStatusStates.get(machine.id);

                        if (previousExecutionState) {
                            if (currentExecutionStatus !== previousExecutionState.lastStatus) {
                                console.log(`machinedetails 🔄 Статус Execution для ${machine.name} (${machine.id}) изменился: БЫЛ ${previousExecutionState.lastStatus}, СТАЛ ${currentExecutionStatus} в ${currentExecutionStatusTimestamp}`);
                                executionStatusStates.set(machine.id, { lastStatus: currentExecutionStatus, timestamp: currentExecutionStatusTimestamp });
                            }
                        } else {
                            console.log(`machinedetails ℹ️ Инициализирован Execution статус для ${machine.name} (${machine.id}): ${currentExecutionStatus} в ${currentExecutionStatusTimestamp}`);
                            executionStatusStates.set(machine.id, { lastStatus: currentExecutionStatus, timestamp: currentExecutionStatusTimestamp });
                        }
                    }

                } else {
                    console.warn(`⚠️ Неожиданная структура XML от агента для ${machine.name} (${machine.id})`);
                }
            } catch (error: any) {
                console.error(`❌ ОШИБКА подключения к MTConnect Agent ${machine.name} (${machine.id}): ${error.message}`);
                console.error(`🔗 URL: ${machine.mtconnectAgentUrl}/current`);
                // НЕ ГЕНЕРИРУЕМ FALLBACK! Пропускаем станок если он недоступен
                continue;
            }
        } else {
            console.error(`🚨 Машина ${machine.name} (${machine.id}) не имеет mtconnectAgentUrl! ПРОПУСКАЕМ.`);
            // НЕ ГЕНЕРИРУЕМ UNAVAILABLE! Пропускаем станок
            continue;
        }

        // Добавляем только если есть реальные данные
        if (deviceStreamDataObject) {
            // --- НАЧАЛО: ВРЕМЕННЫЙ ОТЛАДОЧНЫЙ КОД ---
            if (['SR-10', 'SR-21', 'SR-23'].includes(machine.id)) {
                try {
                    // Сохраняем в файл для детального анализа
                    const debugFileName = `debug-${machine.id}-object.json`;
                    fs.writeFileSync(path.join(__dirname, '..', debugFileName), JSON.stringify(deviceStreamDataObject, null, 2));
                    console.log(`✅ DEBUG: Объект для ${machine.id} сохранен в ${debugFileName}`);
                } catch (e: any) {
                    console.error(`❌ DEBUG: Не удалось сохранить отладочный файл для ${machine.id}.`, e.message);
                }
            }
            // --- КОНЕЦ: ВРЕМЕННЫЙ ОТЛАДОЧНЫЙ КОД ---
            deviceStreamsXmlParts.push(xmlBuilder.buildObject({ DeviceStream: deviceStreamDataObject }) as string);
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
            <li><a href="/real">🔥 Real Dashboard</a></li>
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
    } catch (error: any) {
        console.error('❌ Ошибка генерации XML для /current:', error.message, error.stack);
        res.status(500).send('Internal Server Error while generating MTConnect XML');
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
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
        const response = await axios.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 5000 });
        
        res.set('Content-Type', 'application/xml');
        res.send(response.data);
    } catch (error: any) {
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

// Запуск сервера
async function startServer(): Promise<void> {
    app.listen(port, () => {
        console.log(`✅ Сервер запущен на http://localhost:${port}`);
        console.log('💡 Откройте http://localhost:5000/real-dashboard.html для просмотра дашборда');
    });
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
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
    } catch (error) {
        console.error("❌ Критическая ошибка при запуске приложения:", error);
        process.exit(1);
    }
}

function findExecutionStatusRecursive(components: any[] | undefined): string | null {
    if (!components) {
        return null;
    }
    for (const component of components) {
        // Проверяем Events непосредственно в текущем компоненте (например, Controller)
        if (component.Events?.Execution?._) {
            if (DEBUG_DETAILS) console.log(`Найден Execution напрямую в Events компонента ${component.$?.name || component.$?.id}: ${component.Events.Execution._}`);
            return component.Events.Execution._;
        }

        // Проверяем вложенные ComponentStream
        if (component.ComponentStream) {
            const subStreams = Array.isArray(component.ComponentStream) ? component.ComponentStream : [component.ComponentStream];
            for (const subComponent of subStreams) {
                // Случай для <ComponentStream name="path"> <Events> <Execution> ... </Events> </ComponentStream>
                if (subComponent.$ && (subComponent.$.name === 'path' || subComponent.$.id === 'pth') && subComponent.Events?.Execution?._) {
                    if (DEBUG_DETAILS) console.log(`Найден Execution в path: ${subComponent.Events.Execution._}`);
                    return subComponent.Events.Execution._;
                }
                // Общий случай для <Events> <Execution> ... </Events> внутри любого ComponentStream
                if (subComponent.Events?.Execution?._) {
                    if (DEBUG_DETAILS) console.log(`Найден Execution в Events субкомпонента ${subComponent.$?.name || subComponent.$?.id}: ${subComponent.Events.Execution._}`);
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
function extractProgramFromBlock(blockString: string): string | null {
    if (!blockString) return null;

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

main(); 