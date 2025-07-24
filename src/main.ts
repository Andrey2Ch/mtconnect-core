import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { SHDRManager } from './shdr-client';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

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
    const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE'; // ✅ ИСПРАВЛЕНО: было 'N/A'
    
    return {
      id: machine.id,
      name: machine.name,
      connectionStatus: isConnected ? 'active' : 'inactive',
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

app.listen(port, () => {
  console.log(`✅ Edge Gateway запущен на http://localhost:${port}`);
}); 