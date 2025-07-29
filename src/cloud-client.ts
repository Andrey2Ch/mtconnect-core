import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

interface CloudApiPayload {
  timestamp: string;
  metadata: {
    edgeGatewayId: string;
    machineId: string;
    machineName: string;
    machineType: string;
  };
  data: {
    partCount?: number;
    program?: string;
    cycleTime?: number;
    cycleTimeConfidence?: string;
    executionStatus?: string;
    [key: string]: any;
  };
}

export class CloudApiClient {
  private cloudApiUrl: string;
  private edgeGatewayId: string;

  constructor(cloudApiUrl: string = 'http://localhost:3001', edgeGatewayId: string = 'edge-gateway-1') {
    this.cloudApiUrl = cloudApiUrl;
    this.edgeGatewayId = edgeGatewayId;
  }

  async sendMachineData(machineId: string, machineName: string, machineType: string, data: any): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const payload: CloudApiPayload = {
          timestamp: new Date().toISOString(),
          metadata: {
            edgeGatewayId: this.edgeGatewayId,
            machineId,
            machineName,
            machineType
          },
          data
        };

        const jsonData = JSON.stringify(payload);
        const url = new URL(`${this.cloudApiUrl}/api/ext/data`);
        
        const options = {
          hostname: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
          }
        };

        const req = http.request(options, (res) => {
          const statusCode = res.statusCode || 0;
          if (statusCode >= 200 && statusCode < 300) {
            console.log(`☁️ Данные отправлены в Cloud API: ${machineId}`);
            resolve(true);
          } else {
            console.error(`❌ Ошибка отправки в Cloud API: ${statusCode}`);
            resolve(false);
          }
        });

        // Устанавливаем таймаут правильно
        req.setTimeout(5000, () => {
          console.error(`❌ Таймаут отправки в Cloud API: ${machineId}`);
          req.destroy();
          resolve(false);
        });

        req.on('error', (error) => {
          console.error(`❌ Сетевая ошибка отправки в Cloud API: ${error.message}`);
          resolve(false);
        });

        req.write(jsonData);
        req.end();
      } catch (error) {
        console.error(`❌ Ошибка формирования запроса: ${error.message}`);
        resolve(false);
      }
    });
  }

  async sendBatchData(machineDataArray: CloudApiPayload[]): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const jsonData = JSON.stringify(machineDataArray);
        const url = new URL(`${this.cloudApiUrl}/api/ext/data`);
        
        const options = {
          hostname: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
          }
        };

        const req = http.request(options, (res) => {
          const statusCode = res.statusCode || 0;
          if (statusCode >= 200 && statusCode < 300) {
            console.log(`☁️ Batch данные отправлены в Cloud API: ${machineDataArray.length} записей`);
            resolve(true);
          } else {
            console.error(`❌ Ошибка batch отправки в Cloud API: ${statusCode}`);
            resolve(false);
          }
        });

        // Устанавливаем таймаут правильно
        req.setTimeout(10000, () => {
          console.error(`❌ Таймаут batch отправки в Cloud API`);
          req.destroy();
          resolve(false);
        });

        req.on('error', (error) => {
          console.error(`❌ Сетевая ошибка batch отправки в Cloud API: ${error.message}`);
          resolve(false);
        });

        req.write(jsonData);
        req.end();
      } catch (error) {
        console.error(`❌ Ошибка формирования batch запроса: ${error.message}`);
        resolve(false);
      }
    });
  }
} 