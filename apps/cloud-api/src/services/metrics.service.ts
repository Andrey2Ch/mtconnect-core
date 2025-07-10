import { Injectable } from '@nestjs/common';
import { 
  InjectMetric, 
  makeCounterProvider, 
  makeHistogramProvider, 
  makeGaugeProvider 
} from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total') 
    public httpRequestsTotal: Counter<string>,
    
    @InjectMetric('http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,
    
    @InjectMetric('active_connections')
    public activeConnections: Gauge<string>,
    
    @InjectMetric('data_ingestion_total')
    public dataIngestionTotal: Counter<string>,
    
    @InjectMetric('data_ingestion_volume_bytes')
    public dataIngestionVolume: Counter<string>,
    
    @InjectMetric('active_machines')
    public activeMachines: Gauge<string>,
    
    @InjectMetric('api_errors_total')
    public apiErrorsTotal: Counter<string>,
    
    @InjectMetric('database_operations_total')
    public databaseOperationsTotal: Counter<string>,
    
    @InjectMetric('database_operation_duration_seconds')
    public databaseOperationDuration: Histogram<string>,
  ) {}

  // HTTP Request Metrics
  recordHttpRequest(method: string, endpoint: string, statusCode: number, duration: number) {
    const labels = { method, endpoint, status_code: statusCode.toString() };
    
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
  }

  recordApiError(endpoint: string, errorType: string, statusCode: number) {
    this.apiErrorsTotal.inc({
      endpoint,
      error_type: errorType,
      status_code: statusCode.toString()
    });
  }

  // Data Ingestion Metrics
  recordDataIngestion(machineId: string, dataSize: number, successful: boolean) {
    const labels = { 
      machine_id: machineId, 
      status: successful ? 'success' : 'failed' 
    };
    
    this.dataIngestionTotal.inc(labels);
    
    if (successful && dataSize > 0) {
      this.dataIngestionVolume.inc({ machine_id: machineId }, dataSize);
    }
  }

  // Machine Metrics
  updateActiveMachines(count: number) {
    this.activeMachines.set(count);
  }

  recordActiveMachine(machineId: string, isActive: boolean) {
    this.activeMachines.set({ machine_id: machineId }, isActive ? 1 : 0);
  }

  // Database Metrics
  recordDatabaseOperation(operation: string, collection: string, duration: number, successful: boolean) {
    const labels = { 
      operation, 
      collection, 
      status: successful ? 'success' : 'failed' 
    };
    
    this.databaseOperationsTotal.inc(labels);
    this.databaseOperationDuration.observe(labels, duration / 1000);
  }

  // Connection Metrics
  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  // Business Logic Metrics
  recordMachineEvent(machineId: string, eventType: string) {
    // Custom counter for machine events
    this.dataIngestionTotal.inc({
      machine_id: machineId,
      event_type: eventType,
      status: 'event'
    });
  }

  recordAdamDeviceStatus(deviceId: string, isOnline: boolean) {
    this.activeMachines.set({ 
      device_id: deviceId, 
      type: 'adam',
      status: isOnline ? 'online' : 'offline' 
    }, isOnline ? 1 : 0);
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
      metrics: {
        // These would be collected from the actual metric registries
        // For now, returning structure for health endpoint
        http_requests_total: 'See /metrics endpoint',
        active_connections: 'See /metrics endpoint',
        data_ingestion_rate: 'See /metrics endpoint',
        error_rate: 'See /metrics endpoint',
      }
    };
  }
}

// Metric providers for dependency injection
export const metricsProviders = [
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'endpoint', 'status_code'],
  }),
  
  makeHistogramProvider({
    name: 'http_request_duration_seconds', 
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'endpoint', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  }),
  
  makeGaugeProvider({
    name: 'active_connections',
    help: 'Number of active connections',
    labelNames: ['connection_type'],
  }),
  
  makeCounterProvider({
    name: 'data_ingestion_total',
    help: 'Total number of data ingestion events',
    labelNames: ['machine_id', 'status', 'event_type'],
  }),
  
  makeCounterProvider({
    name: 'data_ingestion_volume_bytes',
    help: 'Total volume of ingested data in bytes',
    labelNames: ['machine_id'],
  }),
  
  makeGaugeProvider({
    name: 'active_machines',
    help: 'Number of active machines',
    labelNames: ['machine_id', 'device_id', 'type', 'status'],
  }),
  
  makeCounterProvider({
    name: 'api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['endpoint', 'error_type', 'status_code'],
  }),
  
  makeCounterProvider({
    name: 'database_operations_total',
    help: 'Total number of database operations',
    labelNames: ['operation', 'collection', 'status'],
  }),
  
  makeHistogramProvider({
    name: 'database_operation_duration_seconds',
    help: 'Database operation duration in seconds',
    labelNames: ['operation', 'collection', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  }),
]; 