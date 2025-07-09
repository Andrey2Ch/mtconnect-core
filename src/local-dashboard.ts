import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Данные в памяти
let machineData: any[] = [];
let lastDataUpdate = new Date();

// Загрузка конфигурации
const configPath = path.join(__dirname, 'config.json');
let localConfig: any = {};

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  localConfig = JSON.parse(configData);
} catch (error) {
  console.error('❌ Ошибка загрузки конфигурации:', error);
  process.exit(1);
}

// Функция генерации тестовых данных (пока MTConnect агенты не настроены)
function generateMockData(machine: any) {
  const isOnline = Math.random() > 0.2; // 80% машин онлайн
  
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
    cycleTime: Math.round((Math.random() * 120 + 30) * 100) / 100, // 30-150 секунд
    program: programs[Math.floor(Math.random() * programs.length)],
    block: `N${Math.floor(Math.random() * 999) + 1}`,
    line: `${Math.floor(Math.random() * 999) + 1}`
  };
}

// Функция сбора данных с машин
async function collectMachineData() {
  const collectedData = [];
  
  for (const machine of localConfig.machines) {
    try {
      // Пока используем моковые данные
      const data = generateMockData(machine);
      
      collectedData.push({
        machineId: machine.id,
        machineName: machine.name,
        timestamp: new Date().toISOString(),
        data: data
      });
      
      console.log(`✅ ${machine.id}: ${data.executionStatus} | Parts: ${data.partCount} | Cycle: ${data.cycleTime}s`);
    } catch (error) {
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
  
  // Отправляем данные в Railway
  await sendToRailway(collectedData);
}

// Функция отправки данных в Railway
async function sendToRailway(data: any[]) {
  if (!localConfig.railway || !localConfig.railway.enabled) {
    console.log('🔄 Railway отключен в конфигурации');
    return;
  }

  try {
    const railwayData = {
      edgeGatewayId: 'edge-gateway-local',
      timestamp: new Date().toISOString(),
      data: data
    };

    const response = await axios.post(
      `${localConfig.railway.baseUrl}/api/ext/data`,
      railwayData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localConfig.railway.apiKey}`
        },
        timeout: 5000
      }
    );

    console.log('✅ Данные отправлены в Railway:', response.data);
  } catch (error: any) {
    console.error('❌ Ошибка отправки в Railway:');
    console.error(`🔗 URL: ${localConfig.railway.baseUrl}/api/ext/data`);
    console.error(`📝 Статус: ${error.response?.status || 'N/A'}`);
    console.error(`💬 Сообщение: ${error.response?.data || error.message || error.toString()}`);
  }
}

// API роуты
app.get('/api/machines', (req, res) => {
  res.json({
    machines: machineData,
    lastUpdate: lastDataUpdate,
    totalMachines: localConfig.machines.length
  });
});

// Endpoint для MTConnect данных (ожидается дашбордом)
app.get('/current', (req, res) => {
  res.set('Content-Type', 'application/xml');
  
  const timestamp = lastDataUpdate.toISOString();
  
  // Генерируем XML для каждой машины
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

// Endpoint для ADAM данных
app.get('/api/adam/counters', (req, res) => {
  // Создаем ADAM данные для всех машин (имитируем что все подключены через разные каналы)
  const adamData = localConfig.machines.map((machine: any, index: number) => {
    const machineData = getMachineData(machine.id);
    
    // Определяем активность
    let activityStatus = 'adam-online';
    let activityText = 'Онлайн';
    let confidence = 'ВЫСОКАЯ';
    let cycleTimeMs = null;
    
    if (machineData && machineData.data.executionStatus === 'ACTIVE') {
      activityStatus = 'adam-producing';
      activityText = 'ПРОИЗВОДИТ';
      cycleTimeMs = machineData.data.cycleTime * 1000; // секунды в миллисекунды
      confidence = 'ВЫСОКАЯ';
    } else if (machineData && machineData.data.executionStatus === 'IDLE') {
      activityStatus = 'adam-active';
      activityText = 'АКТИВЕН';
      confidence = 'СРЕДНЯЯ';
    }
    
    return {
      channel: index + 1, // каналы 1-10
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
    activeChannels: adamData.filter((d: any) => d.status === 'connected').length,
    lastUpdate: lastDataUpdate.toISOString()
  });
});

// Вспомогательная функция для получения данных машины
function getMachineData(machineId: string) {
  return machineData.find(m => m.machineId === machineId);
}

// Endpoint для статуса соединений (структура для dashboard-pro.html)
app.get('/status', (req, res) => {
  const onlineMachines = machineData.filter(m => m.data.availability === 'AVAILABLE').length;
  const activeMachines = machineData.filter(m => m.data.executionStatus === 'ACTIVE').length;
  
  // Генерируем данные для MTConnect агентов
  const mtconnectAgents = localConfig.machines.map((machine: any) => ({
    id: machine.id,
    name: machine.name,
    status: 'OK', // Пока все OK, так как это моковые данные
    responseTime: Math.floor(Math.random() * 50) + 10, // 10-60ms
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
      counters: 2, // K-16 и L-20
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

// Главная страница - дашборд
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'cloud-api', 'mtconnect-cloud', 'public', 'dashboard-pro.html'));
});

// Отдельный endpoint для дашборда
app.get('/dashboard-pro.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'cloud-api', 'mtconnect-cloud', 'public', 'dashboard-pro.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 MTConnect Edge Gateway запущен на http://localhost:${PORT}`);
  console.log(`📊 Дашборд доступен по адресу: http://localhost:${PORT}`);
  console.log(`🔄 Сбор данных с ${localConfig.machines.length} машин...`);
  
  // Запуск сбора данных
  collectMachineData();
  
  // Периодический сбор данных
  setInterval(collectMachineData, localConfig.settings.dataUpdateInterval || 5000);
}); 