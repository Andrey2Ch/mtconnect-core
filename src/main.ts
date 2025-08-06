import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { SHDRManager } from './shdr-client';
import { AdamReader } from './adam-reader';
import { CloudApiClient } from './cloud-client';
import { MachineStatesCache, MachineState } from './machine-states-cache';

const args = process.argv.slice(2);
const isDevMode = args.includes('-dev') || args.includes('--dev');

if (isDevMode) {
  console.log('DEV MODE: Verbose logging enabled');
}

global.DEV_MODE = isDevMode;

const app = express();
const port = 3555;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../apps/cloud-api/public')));

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { machines, adamDevices } = config;

const shdrManager = new SHDRManager();
machines.forEach(machine => {
  shdrManager.addMachine({
    ip: machine.ip,
    port: machine.port,
    machineId: machine.id,
    machineName: machine.name,
  });
});

const adamReader = new AdamReader();

const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://mtconnect-core-production.up.railway.app';
const EDGE_GATEWAY_ID = process.env.EDGE_GATEWAY_ID || 'ANDREY-PC-edge-gateway';

console.log(`Cloud API URL: ${CLOUD_API_URL}`);
console.log(`Edge Gateway ID: ${EDGE_GATEWAY_ID}`);
const cloudClient = new CloudApiClient(CLOUD_API_URL, EDGE_GATEWAY_ID);

const machineStatesCache = new MachineStatesCache();
const restoredStates = machineStatesCache.loadStates();
console.log(`Loaded ${restoredStates.size} states from cache.`);

const restoredStatesForCalculators = new Map<string, { idleTimeMinutes: number }>();
restoredStates.forEach((state, machineId) => {
  const restoredState = machineStatesCache.getRestoredState(machineId);
  if (restoredState) {
    restoredStatesForCalculators.set(machineId, { idleTimeMinutes: restoredState.idleTimeMinutes });
    console.log(`${machineId}: ${restoredState.idleTimeMinutes} min of idle time will be restored.`);
  }
});

shdrManager.setRestoredIdleTimesForAllMachines(restoredStatesForCalculators);
adamReader.setRestoredIdleTimesForAllMachines(restoredStatesForCalculators);

// --- API Endpoints ---
app.get('/api/machines', async (req, res) => {
  const mtconnectMachines = machines.map(machine => {
    const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
    const machineData = shdrManager.getMachineData(machine.id);
    const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
    
    const executionStatus = getVal('execution') !== 'UNAVAILABLE' ? getVal('execution') : undefined;
    const cycleTimeData = shdrManager.getMachineCycleTime(machine.id, executionStatus);
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
        idleTimeMinutes: cycleTimeData?.idleTimeMinutes || 0
      }
    };
  });

  let adamMachines;
  try {
    const adamCounters = await adamReader.readCounters();
    adamMachines = (adamDevices || []).map(device => {
      const counterData = adamCounters.find(c => c.machineId === device.id);
      
      let status = 'offline';
      let connectionStatus = 'offline';
      let executionStatus = 'UNAVAILABLE';
      let cycleTimeDisplay = 'N/A';
      
      const adamCycleData = counterData ? adamReader.getCycleTimeData(device.id) : null;
      
      if (counterData) {
        connectionStatus = 'active';
        
        if (adamCycleData?.cycleTimeMs) {
          cycleTimeDisplay = (adamCycleData.cycleTimeMs / 1000).toFixed(2);
        }
        
        switch (counterData.machineStatus) {
          case 'ACTIVE':
            status = 'online';
            executionStatus = 'ACTIVE';
            break;
          case 'IDLE':
            status = 'online';
            executionStatus = 'READY';
            break;
          default:
            status = 'offline';
            executionStatus = 'UNAVAILABLE';
        }
      }
      
      return {
        id: device.id,
        name: device.name,
        type: device.type,
        channel: device.channel,
        ip: '192.168.1.120',
        port: 502,
        status: status,
        connectionStatus: connectionStatus,
        data: {
          partCount: counterData ? counterData.count : 0,
          cycleTime: cycleTimeDisplay,
          confidence: adamCycleData?.confidence || counterData?.confidence || 'N/A',
          executionStatus: executionStatus,
          isAnomalous: adamCycleData?.isAnomalous || counterData?.isAnomalous || false,
          machineStatus: adamCycleData?.machineStatus || counterData?.machineStatus || 'OFFLINE',
          idleTimeMinutes: adamCycleData?.idleTimeMinutes || counterData?.idleTimeMinutes || 0
        }
      };
    });
  } catch (error) {
    console.error('Error reading ADAM data:', error);
    adamMachines = (adamDevices || []).map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      channel: device.channel,
      ip: '192.168.1.120',
      port: 502,
      status: 'offline',
      connectionStatus: 'offline',
      data: { partCount: 0, cycleTime: 'N/A', confidence: 'N/A', executionStatus: 'UNAVAILABLE', isAnomalous: false, machineStatus: 'OFFLINE' }
    }));
  }

  const allMachines = [...mtconnectMachines, ...adamMachines];
  allMachines.sort((a, b) => a.name.localeCompare(b.name));

  const mtconnectOnlineCount = mtconnectMachines.filter(m => m.status === 'online').length;
  const adamOnlineCount = adamMachines.filter(m => m.status === 'online').length;

  res.json({
    timestamp: new Date().toISOString(),
    summary: {
      total: allMachines.length,
      online: mtconnectOnlineCount + adamOnlineCount,
      mtconnect: { total: mtconnectMachines.length, online: mtconnectOnlineCount },
      adam: { total: adamMachines.length, online: adamOnlineCount }
    },
    machines: allMachines,
  });
});

async function sendDataToCloud() {
  try {
    const sendPromises: Promise<boolean>[] = [];
    const currentStates = new Map<string, MachineState>();

    for (const machine of machines) {
      const isConnected = shdrManager.getMachineConnectionStatus(machine.id);
      if (isConnected) {
        const machineData = shdrManager.getMachineData(machine.id);
        const getVal = (key: string) => machineData?.get(key)?.value || 'UNAVAILABLE';
        
        const executionStatus = getVal('execution') !== 'UNAVAILABLE' ? getVal('execution') : undefined;
        const cycleTimeData = shdrManager.getMachineCycleTime(machine.id, executionStatus);
        const cycleTimeSeconds = cycleTimeData?.cycleTimeMs ? Number((cycleTimeData.cycleTimeMs / 1000).toFixed(2)) : undefined;
        
        const data = {
          partCount: getVal('part_count') !== 'UNAVAILABLE' ? parseInt(getVal('part_count')) : undefined,
          program: getVal('program') !== 'UNAVAILABLE' ? getVal('program') : undefined,
          executionStatus: getVal('execution') !== 'UNAVAILABLE' ? getVal('execution') : undefined,
          cycleTime: cycleTimeSeconds,
          cycleTimeConfidence: cycleTimeData?.confidence,
          idleTimeMinutes: cycleTimeData?.idleTimeMinutes ?? undefined
        };

        const isActive = data.executionStatus === 'ACTIVE' && cycleTimeData?.machineStatus === 'ACTIVE';
        const lastActiveTime = isActive ? new Date().toISOString() : 
          (restoredStates.get(machine.id)?.lastActiveTime || new Date().toISOString());
        
        currentStates.set(machine.id, {
          machineId: machine.id,
          idleTimeMinutes: data.idleTimeMinutes || 0,
          lastActiveTime: lastActiveTime,
          timestamp: new Date().toISOString()
        });

        if (data.partCount !== undefined || data.program !== undefined || data.executionStatus !== undefined) {
          sendPromises.push(cloudClient.sendMachineData(machine.id, machine.name, 'FANUC', data));
        }
      }
    }

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
                          'UNAVAILABLE',
          isAnomalous: counter.isAnomalous || false,
          machineStatus: counter.machineStatus || 'OFFLINE',
          idleTimeMinutes: counter.idleTimeMinutes || 0
        };

        const isActive = counter.machineStatus === 'ACTIVE';
        const lastActiveTime = isActive ? new Date().toISOString() : 
          (restoredStates.get(counter.machineId)?.lastActiveTime || new Date().toISOString());
        
        currentStates.set(counter.machineId, {
          machineId: counter.machineId,
          idleTimeMinutes: counter.idleTimeMinutes || 0,
          lastActiveTime: lastActiveTime,
          timestamp: new Date().toISOString()
        });

        const deviceInfo = adamDevices.find(d => d.id === counter.machineId);
        if (deviceInfo) {
          sendPromises.push(cloudClient.sendMachineData(counter.machineId, deviceInfo.name, 'ADAM', data));
        }
      }
    }

    if (sendPromises.length > 0) {
      const results = await Promise.allSettled(sendPromises);
      const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const failed = results.length - success;
      
      if (failed > 0) {
        console.log(`Cloud API: ${success} successful, ${failed} failed of ${results.length} machines`);
      } else {
        console.log(`Cloud API: All ${success} machines sent successfully`);
      }
    }

    if (currentStates.size > 0) {
      currentStates.forEach((state, machineId) => {
        machineStatesCache.updateMachineState(machineId, {
          idleTimeMinutes: state.idleTimeMinutes,
          lastActiveTime: state.lastActiveTime
        });
      });
    }

  } catch (error) {
    console.error(`Error sending data to Cloud API: ${error.message}`);
  }
}

async function checkApiAvailability() {
  try {
    const response = await fetch(CLOUD_API_URL);
    if (response.ok) {
      console.log('Cloud API is available.');
      return true;
    } else {
      console.error(`Cloud API is not available. Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Failed to connect to Cloud API:', error.message);
    return false;
  }
}

async function startServer() {
  await checkApiAvailability();
  
  setInterval(sendDataToCloud, 10000);
  console.log('Periodic data sending to Cloud API started: every 10 seconds');

  setInterval(() => {
    try {
      const allStates = machineStatesCache.getAllStates();
      machineStatesCache.saveStates(allStates);
    } catch (error) {
      console.error('Error saving states cache:', error.message);
    }
  }, 30000);
  console.log('Periodic states cache saving started: every 30 seconds');

  app.listen(port, () => {
    console.log(`Edge Gateway running at http://localhost:${port}`);
    console.log(`Dashboard: http://localhost:${port}/dashboard-new.html`);
    console.log(`FANUC machines configured: ${config.machines.filter(m => m.type === 'FANUC').length}`);
    console.log(`ADAM devices configured: ${(config.adamDevices || []).length}`);
    console.log(`Adapter reconnect interval: 30 sec (max 3 attempts)`);
  });
}

startServer();
