import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface AdamCounterData {
  channel: number;
  machineId: string;
  count: number;
  timestamp: string;
  cycleTimeMs?: number;
  partsInCycle?: number;
  confidence?: string;
}

interface AdamMachine {
  id: string;
  name: string;
  channel: number;
  ip: string;
  port: number;
  type: string;
  status: string;
  count?: number;
  lastUpdate?: string;
  confidence?: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MTConnect Cloud API',
      version: '1.0.0'
    };
  }

  @Get('/dashboard')
  getDashboard() {
    return { 
      message: 'MTConnect Cloud Dashboard API',
      endpoints: {
        '/machines': 'Список всех станков',
        '/health': 'Статус API',
        '/dashboard/index.html': 'Веб-интерфейс'
      }
    };
  }

  @Get('/machines')
  async getMachines() {
    try {
      // Читаем конфигурацию MTConnect машин
      const configPaths = [
        path.join(__dirname, '..', '..', '..', 'src', 'config.json'),
        path.join(__dirname, '..', '..', '..', '..', 'src', 'config.json'),
        path.join(process.cwd(), 'src', 'config.json'),
        path.join(process.cwd(), 'config.json')
      ];

      let configPath = '';
      for (const testPath of configPaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          break;
        }
      }

      if (!configPath) {
        throw new Error('Конфигурационный файл не найден');
      }

      console.log(`📁 Используем config.json из: ${configPath}`);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Получаем данные MTConnect машин
      const mtconnectMachines = await Promise.all(
        config.machines.map(async (machine: any) => {
          try {
            console.log(`📡 Получаю данные от ${machine.name} (${machine.mtconnectAgentUrl})`);
            const response = await axios.get(`${machine.mtconnectAgentUrl}/current`, { timeout: 5000 });
            console.log(`✅ ${machine.name} - статус: online`);
            
            return {
              id: machine.id,
              name: machine.name,
              ip: machine.ip,
              port: machine.port,
              type: machine.type,
              status: 'online',
              agentUrl: machine.mtconnectAgentUrl,
              uuid: machine.uuid,
              spindles: machine.spindles,
              axes: machine.axes,
              source: 'MTConnect Agent'
            };
          } catch (error) {
            console.log(`❌ ${machine.name} - статус: offline (${error.message})`);
            return {
              id: machine.id,
              name: machine.name,
              ip: machine.ip,
              port: machine.port,
              type: machine.type,
              status: 'offline',
              agentUrl: machine.mtconnectAgentUrl,
              uuid: machine.uuid,
              spindles: machine.spindles,
              axes: machine.axes,
              source: 'MTConnect Agent',
              error: error.message
            };
          }
        })
      );

      // Получаем данные ADAM-6050 машин
      const adamMachines = await this.getAdamMachines();

      const result = {
        timestamp: new Date().toISOString(),
        summary: {
          total: mtconnectMachines.length + adamMachines.length,
          mtconnect: {
            total: mtconnectMachines.length,
            online: mtconnectMachines.filter(m => m.status === 'online').length,
            offline: mtconnectMachines.filter(m => m.status === 'offline').length
          },
          adam: {
            total: adamMachines.length,
            online: adamMachines.filter(m => m.status === 'online').length,
            offline: adamMachines.filter(m => m.status === 'offline').length
          }
        },
        machines: {
          mtconnect: mtconnectMachines,
          adam: adamMachines
        }
      };

      return result;
    } catch (error) {
      console.error('❌ Ошибка получения данных машин:', error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        summary: {
          total: 0,
          mtconnect: { total: 0, online: 0, offline: 0 },
          adam: { total: 0, online: 0, offline: 0 }
        },
        machines: {
          mtconnect: [],
          adam: []
        }
      };
    }
  }

  private async getAdamMachines(): Promise<AdamMachine[]> {
    const adamIP = '192.168.1.120';
    const adamPort = 502;
    
    // Mapping каналов на станки (из adam-reader.ts)
    const channelMapping = new Map([
      [0, 'SR-22'],   // DI0
      [1, 'SB-16'],   // DI1
      [2, 'BT-38'],   // DI2
      [3, 'K-162'],   // DI3
      [4, 'K-163'],   // DI4
      [5, 'L-20'],    // DI5
      [6, 'K-16'],    // DI6
      [8, 'SR-20'],   // DI8
      [9, 'SR-32'],   // DI9
      [11, 'SR-24']   // DI11
    ]);

    try {
      console.log(`📡 Подключаюсь к ADAM-6050 (${adamIP}:${adamPort})`);
      
      // Простая проверка подключения к ADAM-6050
      const adamTest = await this.testAdamConnection(adamIP, adamPort);
      
      if (adamTest.connected) {
        console.log(`✅ ADAM-6050 - статус: online`);
        
        // Если есть данные счетчиков, используем их
        const machines: AdamMachine[] = [];
        
        if (adamTest.counters && adamTest.counters.length > 0) {
          adamTest.counters.forEach(counter => {
            machines.push({
              id: counter.machineId,
              name: counter.machineId,
              channel: counter.channel,
              ip: adamIP,
              port: adamPort,
              type: 'ADAM-6050 Counter',
              status: 'online',
              count: counter.count,
              lastUpdate: counter.timestamp,
              confidence: counter.confidence
            });
          });
        } else {
          // Если нет данных счетчиков, создаем базовый список
          channelMapping.forEach((machineId, channel) => {
            machines.push({
              id: machineId,
              name: machineId,
              channel: channel,
              ip: adamIP,
              port: adamPort,
              type: 'ADAM-6050 Counter',
              status: 'online'
            });
          });
        }
        
        return machines;
      } else {
        console.log(`❌ ADAM-6050 - статус: offline (${adamTest.error})`);
        
        // Возвращаем список машин со статусом offline
        const machines: AdamMachine[] = [];
        channelMapping.forEach((machineId, channel) => {
          machines.push({
            id: machineId,
            name: machineId,
            channel: channel,
            ip: adamIP,
            port: adamPort,
            type: 'ADAM-6050 Counter',
            status: 'offline'
          });
        });
        
        return machines;
      }
    } catch (error) {
      console.error('❌ Ошибка подключения к ADAM-6050:', error);
      
      // Возвращаем список машин со статусом offline
      const machines: AdamMachine[] = [];
      const channelMapping = new Map([
        [0, 'SR-22'], [1, 'SB-16'], [2, 'BT-38'], [3, 'K-162'], [4, 'K-163'],
        [5, 'L-20'], [6, 'K-16'], [8, 'SR-20'], [9, 'SR-32'], [11, 'SR-24']
      ]);
      
      channelMapping.forEach((machineId, channel) => {
        machines.push({
          id: machineId,
          name: machineId,
          channel: channel,
          ip: adamIP,
          port: adamPort,
          type: 'ADAM-6050 Counter',
          status: 'offline'
        });
      });
      
      return machines;
    }
  }

  private async testAdamConnection(ip: string, port: number): Promise<{ connected: boolean, error?: string, counters?: AdamCounterData[] }> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ connected: false, error: 'Timeout' });
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ connected: true });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ connected: false, error: err.message });
      });

      socket.connect(port, ip);
    });
  }
}
