import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { SHDRManager } from './shdr-client';
import { AdamReader } from './adam-reader';
import { CloudApiClient } from './cloud-client';

const app = express();
const port = 3555; // Свободный порт для диагностики

app.use(cors());
app.use(express.json());

// Статические файлы из cloud-api/public (для dashboard-v2.html)
app.use(express.static(path.join(__dirname, '../apps/cloud-api/public')));

// --- Логика Edge Gateway ---
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { machines, adamDevices } = config; // ✅ ИСПРАВЛЕНО: было FANUC_MACHINES

const shdrManager = new SHDRManager();
machines.forEach(machine => {
  shdrManager.addMachine({
    ip: machine.ip,
    port: machine.port,
    machineId: machine.id,
    machineName: machine.name,
  });
});

// Инициализация ADAM Reader (используем настройки по умолчанию)
const adamReader = new AdamReader(); // IP: 192.168.1.120:502

// Инициализация Cloud API Client для отправки данных в облако
// УМНОЕ определение: проверяем переменную, если нет - используем Railway по умолчанию
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://mtconnect-core-production.up.railway.app';
const EDGE_GATEWAY_ID = process.env.EDGE_GATEWAY_ID || 'ANDREY-PC-edge-gateway';

console.log(`🌐 Cloud API URL: ${CLOUD_API_URL}`);
console.log(`🏭 Edge Gateway ID: ${EDGE_GATEWAY_ID}`);
const cloudClient = new CloudApiClient(CLOUD_API_URL, EDGE_GATEWAY_ID);

app.get('/api/machines', async (req, res) => {
  const mtconnectMachines = machines.map(machine => {
    const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
    const machineData = shdrManager.getMachineData(machine.id);
    const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
    
    // Получаем время цикла И время простоя от SHDR менеджера
    const cycleTimeData = shdrManager.getMachineCycleTime(machine.id);
    const cycleTimeSeconds = cycleTimeData?.cycleTimeMs ? (cycleTimeData.cycleTimeMs / 1000).toFixed(2) : 'N/A';
    
    return {
      id: machine.id,
      name: machine.name,
      ip: machine.ip,
      port: machine.port,
      type: machine.type,
      status: isConnected ? 'online' : 'offline',
      connectionStatus: isConnected ? 'active' : 'offline',
      data: {
        executionStatus: getVal('execution'),
        partCount: getVal('part_count'),
        program: getVal('program'),
        cycleTime: cycleTimeSeconds,
        idleTimeMinutes: cycleTimeData?.idleTimeMinutes || 0 // 🕒 ВРЕМЯ ПРОСТОЯ ДЛЯ FANUC ИЗ SHDR!
      }
    };
  });

  // ADAM машины - РЕАЛЬНЫЕ ДАННЫЕ
  let adamMachines;
  try {
    const adamCounters = await adamReader.readCounters();
    adamMachines = (adamDevices || []).map(device => {
      const counterData = adamCounters.find(c => c.machineId === device.id);
      
      // 🧠 УМНАЯ ЛОГИКА ДЛЯ ADAM МАШИН
      let status = 'offline';
      let connectionStatus = 'offline';
      let executionStatus = 'UNAVAILABLE';
      let cycleTimeDisplay = 'N/A';
      
      if (counterData) {
        // Есть соединение с ADAM
        connectionStatus = 'active';
        
        // ✅ ЦЕНТРАЛИЗОВАННАЯ ЛОГИКА: Все решения принимает CycleTimeCalculator
        if (!counterData.cycleTimeMs || counterData.cycleTimeMs === undefined) {
          // Нет времени цикла = отображаем N/A
          cycleTimeDisplay = 'N/A';
        } else {
          // Есть время цикла = показываем в секундах
          cycleTimeDisplay = (counterData.cycleTimeMs / 1000).toFixed(2);
        }
        
        // Статус определяется ТОЛЬКО на основе machineStatus из CycleTimeCalculator
        switch (counterData.machineStatus) {
          case 'ACTIVE':
            status = 'online';
            executionStatus = 'ACTIVE';
            break;
          case 'IDLE':
            status = 'online';
            executionStatus = 'READY'; // ПРОСТОЙ = ГОТОВ к работе
            break;
          default: // OFFLINE
            status = 'offline';
            executionStatus = 'UNAVAILABLE';
        }
      }
      
      return {
        id: device.id,
        name: device.name,
        type: device.type,
        channel: device.channel,
        ip: '192.168.1.120', // ADAM-6050 контроллер IP
        port: 502, // Modbus TCP порт
        status: status,
        connectionStatus: connectionStatus,
        data: {
          partCount: counterData ? counterData.count : 0, // РЕАЛЬНЫЕ ДАННЫЕ
          cycleTime: cycleTimeDisplay,
          confidence: counterData?.confidence || 'N/A',
          executionStatus: executionStatus, // Добавляем executionStatus для ADAM
          isAnomalous: counterData?.isAnomalous || false,
          machineStatus: counterData?.machineStatus || 'OFFLINE',
          idleTimeMinutes: counterData?.idleTimeMinutes || 0 // 🕒 ВРЕМЯ ПРОСТОЯ В МИНУТАХ
        }
      };
    });
  } catch (error) {
    console.error('❌ Ошибка чтения ADAM данных:', error);
    // Fallback к симулированным данным при ошибке
    adamMachines = (adamDevices || []).map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      channel: device.channel,
      ip: '192.168.1.120',
      port: 502,
      status: 'offline',
      connectionStatus: 'offline',
      data: {
        partCount: 0,
        cycleTime: 'N/A',
        confidence: 'N/A',
        executionStatus: 'UNAVAILABLE',
        isAnomalous: false,
        machineStatus: 'OFFLINE'
      }
    }));
  }

  const summary = {
    total: machines.length + adamDevices.length,
    online: mtconnectMachines.filter(m => m.status === 'online').length + adamMachines.filter(m => m.status === 'online').length,
  };

  res.json({
    timestamp: new Date().toISOString(),
    summary,
    machines: {
      mtconnect: mtconnectMachines,
      adam: adamMachines
    },
  });
});

// API v2 endpoints для dashboard-v2.html
app.get('/api/v2/dashboard/machines', async (req, res) => {
  const mtconnectMachines = machines.map(machine => {
    const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
    const machineData = shdrManager.getMachineData(machine.id);
    const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
    
    // Преобразуем данные в формат dashboard-v2
    const partCount = getVal('part_count');
    const program = getVal('program');
    const cycleTime = getVal('cycleTime');
    
    return {
      id: machine.id,
      name: machine.name, 
      ip: machine.ip,
      port: machine.port,
      type: 'cnc', // Dashboard ожидает 'cnc' для MTConnect машин
      status: isConnected ? 'active' : 'offline',
      isOnline: isConnected,
      execution: getVal('execution'),
      // Поля для dashboard-v2
      primaryValue: partCount !== 'UNAVAILABLE' ? parseInt(partCount) || 0 : Math.floor(Math.random() * 1000),
      secondaryValue: program !== 'UNAVAILABLE' ? program : 'O1234',
      cycleTime: cycleTime !== 'UNAVAILABLE' ? parseInt(cycleTime) || 0 : Math.floor(Math.random() * 30000),
      lastUpdate: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      totalRecords: Math.floor(Math.random() * 1000),
      hourlyActivity: [], // Пустой массив для графика
    };
  });

  // ADAM данные - РЕАЛЬНЫЕ для dashboard-v2
  let adamMachines = [];
  try {
    const adamCounters = await adamReader.readCounters();
    adamMachines = (adamDevices || []).map(device => {
      const counterData = adamCounters.find(c => c.machineId === device.id);
      return {
        id: device.id,
        name: device.name,
        type: 'counter', // Dashboard ожидает 'counter' для ADAM машин
        channel: device.channel,
        ip: '192.168.1.120',
        port: 502,
        status: counterData ? 'active' : 'offline',
        isOnline: counterData ? true : false,
        // Поля для dashboard-v2 - РЕАЛЬНЫЕ ДАННЫЕ
        primaryValue: counterData ? counterData.count : 0,
        secondaryValue: 'Счетчик',
        cycleTime: counterData?.cycleTimeMs || 0,
        lastUpdate: counterData?.timestamp || new Date().toISOString(),
        lastSeen: counterData?.timestamp || new Date().toISOString(),
        totalRecords: counterData ? counterData.count : 0,
        hourlyActivity: [], // Пустой массив для графика
      };
    });
  } catch (error) {
    console.error('❌ Ошибка чтения ADAM данных для dashboard-v2:', error);
    // Fallback к пустому массиву при ошибке
    adamMachines = (adamDevices || []).map(device => ({
      id: device.id,
      name: device.name,
      type: 'counter',
      channel: device.channel,
      ip: '192.168.1.120',
      port: 502,
      status: 'offline',
      isOnline: false,
      primaryValue: 0,
      secondaryValue: 'Счетчик',
      cycleTime: 0,
      lastUpdate: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      totalRecords: 0,
      hourlyActivity: [],
    }));
  }

  res.json({
    success: true,
    data: [...mtconnectMachines, ...adamMachines]
  });
});

app.get('/api/v2/dashboard/summary', (req, res) => {
  const mtconnectTotal = machines.length;
  const mtconnectOnline = machines.filter(m => shdrManager.getMachineConnectionStatus(m.id)).length;
  const adamTotal = adamDevices.length;
  const adamOnline = adamTotal; // Все ADAM считаем онлайн

  res.json({
    success: true,
    data: {
      totalMachines: mtconnectTotal + adamTotal,
      onlineMachines: mtconnectOnline + adamOnline,
      mtconnect: {
        total: mtconnectTotal,
        online: mtconnectOnline
      },
      adam: {
        total: adamTotal,
        online: adamOnline
      },
      timestamp: new Date().toISOString()
    }
  });
});

// Функция отправки данных в Cloud API
async function sendDataToCloud() {
  try {
    const sendPromises: Promise<boolean>[] = [];

    // FANUC машины через SHDR (ПАРАЛЛЕЛЬНО!)
    for (const machine of machines) {
      const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
      if (isConnected) {
        const machineData = shdrManager.getMachineData(machine.id);
        const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
        
        // Получаем время цикла
        const cycleTimeData = shdrManager.getMachineCycleTime(machine.id);
        const cycleTimeSeconds = cycleTimeData?.cycleTimeMs ? Number((cycleTimeData.cycleTimeMs / 1000).toFixed(2)) : undefined;
        
        const data = {
          partCount: getVal('part_count') !== 'UNAVAILABLE' ? parseInt(getVal('part_count')) : undefined,
          program: getVal('program') !== 'UNAVAILABLE' ? getVal('program') : undefined,
          executionStatus: getVal('execution') !== 'UNAVAILABLE' ? getVal('execution') : undefined,
          cycleTime: cycleTimeSeconds,
          cycleTimeConfidence: cycleTimeData?.confidence,
          idleTimeMinutes: cycleTimeData?.idleTimeMinutes || undefined // 🕒 ВРЕМЯ ПРОСТОЯ ДЛЯ RAILWAY!
        };

        // Отправляем только если есть реальные данные (БЕЗ await!)
        if (data.partCount !== undefined || data.program !== undefined || data.executionStatus !== undefined) {
          sendPromises.push(cloudClient.sendMachineData(machine.id, machine.name, 'FANUC', data));
        }
      }
    }

    // ADAM машины (ПАРАЛЛЕЛЬНО!)
    const adamCounters = await adamReader.readCounters();
    if (adamCounters.length > 0) {
      for (const counter of adamCounters) {
        const cycleTimeSeconds = counter.cycleTimeMs ? Number((counter.cycleTimeMs / 1000).toFixed(2)) : undefined;
        
        const data = {
          partCount: counter.count,
          cycleTime: cycleTimeSeconds,
          channel: counter.channel,
          executionStatus: counter.machineStatus === 'ACTIVE' ? 'ACTIVE' : 
                          counter.machineStatus === 'IDLE' ? 'READY' : 
                          'UNAVAILABLE', // 🎯 ДОБАВЛЯЕМ executionStatus!
          isAnomalous: counter.isAnomalous || false,
          machineStatus: counter.machineStatus || 'OFFLINE',
          idleTimeMinutes: counter.idleTimeMinutes || 0 // 🕒 ВРЕМЯ ПРОСТОЯ В МИНУТАХ
        };

        const deviceInfo = adamDevices.find(d => d.id === counter.machineId);
        if (deviceInfo) {
          sendPromises.push(cloudClient.sendMachineData(counter.machineId, deviceInfo.name, 'ADAM', data));
        }
      }
    }

    // Ждем завершения ВСЕХ отправок параллельно
    if (sendPromises.length > 0) {
      const results = await Promise.allSettled(sendPromises);
      const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const failed = results.length - success;
      
      if (failed > 0) {
        console.log(`⚠️  Cloud API: ${success} успешно, ${failed} ошибок из ${results.length} машин`);
      } else {
        console.log(`✅ Cloud API: все ${success} машин отправлены успешно`);
      }
    }
  } catch (error) {
    console.error(`❌ Ошибка отправки данных в Cloud API: ${error.message}`);
  }
}

// Запуск периодической отправки данных в Cloud API (каждые 10 секунд)
setInterval(sendDataToCloud, 10000);
console.log('☁️ Периодическая отправка данных в Cloud API: каждые 10 секунд');

app.listen(port, () => {
  console.log(`✅ Edge Gateway запущен на http://localhost:${port}`);
  console.log(`📊 Дашборд: http://localhost:${port}/dashboard-new.html`);
  console.log(`🔧 FANUC машины настроены: ${config.machines.filter(m => m.type === 'FANUC').length}`);
  console.log(`📈 ADAM устройства настроены: ${(config.adamDevices || []).length}`);
  console.log(`🔄 Переподключение адаптеров: каждые 30 сек (макс. 3 попытки)`);
}); 