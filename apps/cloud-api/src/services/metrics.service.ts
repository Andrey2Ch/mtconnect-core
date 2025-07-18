import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private metrics = {
    httpRequests: 0,
    dataIngestionCount: 0,
    activeConnections: 0,
    activeMachines: 0,
    apiErrors: 0,
    databaseOperations: 0,
  };

  recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number) {
    this.metrics.httpRequests++;
    console.log('[METRICS] HTTP request recorded');
  }

  recordApiError(endpoint: string, errorType: string, statusCode: number) {
    this.metrics.apiErrors++;
    console.log('[METRICS] API error recorded');
  }

  recordDataIngestion(machineId: string, dataSize: number, successful: boolean) {
    this.metrics.dataIngestionCount++;
    console.log('[METRICS] Data ingestion recorded');
  }

  updateActiveMachines(count: number) {
    this.metrics.activeMachines = count;
    console.log('[METRICS] Active machines updated');
  }

  recordActiveMachine(machineId: string, isActive: boolean) {
    console.log('[METRICS] Machine activity recorded');
  }

  recordDatabaseOperation(operation: string, collection: string, duration: number, successful: boolean) {
    this.metrics.databaseOperations++;
    console.log('[METRICS] Database operation recorded');
  }

  incrementActiveConnections() {
    this.metrics.activeConnections++;
    console.log('[METRICS] Active connections incremented');
  }

  decrementActiveConnections() {
    this.metrics.activeConnections--;
    console.log('[METRICS] Active connections decremented');
  }

  setActiveConnections(count: number) {
    this.metrics.activeConnections = count;
    console.log('[METRICS] Active connections set');
  }

  recordMachineEvent(machineId: string, eventType: string) {
    console.log('[METRICS] Machine event recorded');
  }

  recordAdamDeviceStatus(deviceId: string, isOnline: boolean) {
    console.log('[METRICS] ADAM device status recorded');
  }

  createTimer() {
    const start = Date.now();
    return {
      end: () => Date.now() - start
    };
  }

  async getMetricsSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics
    };
  }
}
