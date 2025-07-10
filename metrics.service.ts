import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  // Simple metrics implementation without Prometheus
  private metrics = {
    httpRequests: 0,
    dataIngestionCount: 0,
    activeConnections: 0,
    activeMachines: 0,
    apiErrors: 0,
    databaseOperations: 0,
  };

  // HTTP Request Metrics
  recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number) {
    this.metrics.httpRequests++;
    console.log([METRICS] HTTP {method} {endpoint} {statusCode} ({duration}ms));
  }

  recordApiError(endpoint: string, errorType: string, statusCode: number) {
    this.metrics.apiErrors++;
    console.log([METRICS] API Error: {endpoint} {errorType} {statusCode});
  }

  // Data Ingestion Metrics
  recordDataIngestion(machineId: string, dataSize: number, successful: boolean) {
    this.metrics.dataIngestionCount++;
    console.log([METRICS] Data ingestion: {machineId} {dataSize} bytes {successful ? 'SUCCESS' : 'FAILED'});
  }

  // Machine Metrics
  updateActiveMachines(count: number) {
    this.metrics.activeMachines = count;
    console.log([METRICS] Active machines: {count});
  }

  recordActiveMachine(machineId: string, isActive: boolean) {
    console.log([METRICS] Machine {machineId} {isActive ? 'ACTIVE' : 'INACTIVE'});
  }

  // Database Metrics
  recordDatabaseOperation(operation: string, collection: string, duration: number, successful: boolean) {
    this.metrics.databaseOperations++;
    console.log([METRICS] DB {operation} {collection} ({duration}ms) {successful ? 'SUCCESS' : 'FAILED'});
  }

  // Connection Metrics
  incrementActiveConnections() {
    this.metrics.activeConnections++;
    console.log([METRICS] Active connections: {this.metrics.activeConnections});
  }

  decrementActiveConnections() {
    this.metrics.activeConnections--;
    console.log([METRICS] Active connections: {this.metrics.activeConnections});
  }

  setActiveConnections(count: number) {
    this.metrics.activeConnections = count;
    console.log([METRICS] Active connections: {count});
  }

  // Business Logic Metrics
  recordMachineEvent(machineId: string, eventType: string) {
    console.log([METRICS] Machine event: {machineId} {eventType});
  }

  recordAdamDeviceStatus(deviceId: string, isOnline: boolean) {
    console.log([METRICS] ADAM device {deviceId} {isOnline ? 'ONLINE' : 'OFFLINE'});
  }

  // Performance monitoring helper
  createTimer() {
    const start = Date.now();
    return {
      end: () => Date.now() - start
    };
  }

  // Get current metrics snapshot (for health checks)
  async getMetricsSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics
    };
  }
}
