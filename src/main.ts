import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { SHDRManager } from './shdr-client';

const app = express();
const port = 3333; // Временно меняем порт

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

app.get('/api/machines', (req, res) => {
  const mtconnectMachines = machines.map(machine => {
    const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
    const machineData = shdrManager.getMachineData(machine.id);
    const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
    
    return {
      id: machine.id,
      name: machine.name,
      ip: machine.ip,
      port: machine.port,
      type: machine.type,
      connectionStatus: isConnected ? 'active' : 'offline',
      execution: getVal('execution'),
      partCount: getVal('partCount'),
      program: getVal('program'),
    };
  });

  // ADAM машины (статические - пока без реального подключения)
  const adamMachines = (adamDevices || []).map(device => ({
    id: device.id,
    name: device.name,
    type: device.type,
    channel: device.channel,
    ip: '192.168.1.10', // ADAM-6050 контроллер IP
    port: 502, // Modbus TCP порт
    connectionStatus: 'active', // Предполагаем что подключены
    partCount: Math.floor(Math.random() * 1000), // Временные данные
  }));

  const summary = {
    total: machines.length + adamDevices.length,
    online: mtconnectMachines.filter(m => m.connectionStatus === 'active').length + adamMachines.length,
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
app.get('/api/v2/dashboard/machines', (req, res) => {
  const mtconnectMachines = machines.map(machine => {
    const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
    const machineData = shdrManager.getMachineData(machine.id);
    const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
    
    // Преобразуем данные в формат dashboard-v2
    const partCount = getVal('partCount');
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

  const adamMachines = (adamDevices || []).map(device => ({
    id: device.id,
    name: device.name,
    type: 'counter', // Dashboard ожидает 'counter' для ADAM машин
    channel: device.channel,
    ip: '192.168.1.10',
    port: 502,
    status: 'active',
    isOnline: true,
    // Поля для dashboard-v2
    primaryValue: Math.floor(Math.random() * 1000),
    secondaryValue: 'Счетчик',
    cycleTime: Math.floor(Math.random() * 30000),
    lastUpdate: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    totalRecords: Math.floor(Math.random() * 500),
    hourlyActivity: [], // Пустой массив для графика
  }));

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

app.listen(port, () => {
  console.log(`✅ Edge Gateway запущен на http://localhost:${port}`);
}); 