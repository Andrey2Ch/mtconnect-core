import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, ip } = request;
    const endpoint = this.normalizeEndpoint(url);

    // Track active connections
    this.metricsService.incrementActiveConnections();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Record successful HTTP request
        this.metricsService.recordHttpRequest(method, endpoint, statusCode, duration);

        // Record data ingestion metrics for specific endpoints
        if (endpoint === '/api/ext/data' && method === 'POST' && statusCode < 400) {
          this.recordDataIngestionMetrics(request, data);
        }

        // Track machine events
        if (endpoint === '/api/ext/event' && method === 'POST' && statusCode < 400) {
          this.recordMachineEventMetrics(request);
        }

        // Decrement active connections
        this.metricsService.decrementActiveConnections();
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;
        const errorType = this.getErrorType(error);

        // Record failed HTTP request
        this.metricsService.recordHttpRequest(method, endpoint, statusCode, duration);

        // Record API error
        this.metricsService.recordApiError(endpoint, errorType, statusCode);

        // Special handling for data ingestion failures
        if (endpoint === '/api/ext/data' && method === 'POST') {
          this.recordFailedDataIngestion(request, errorType);
        }

        // Decrement active connections
        this.metricsService.decrementActiveConnections();

        return throwError(() => error);
      }),
    );
  }

  private normalizeEndpoint(url: string): string {
    // Normalize URL to group similar endpoints
    // Example: /api/ext/machines/123/cycle-time -> /api/ext/machines/:id/cycle-time
    return url
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\?.*$/, '') // Remove query parameters
      .split('/').slice(0, 5).join('/'); // Limit depth for grouping
  }

  private getErrorType(error: any): string {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      
      if (status >= 400 && status < 500) {
        return 'client_error';
      } else if (status >= 500) {
        return 'server_error';
      }
    }

    if (error.name === 'ValidationError') {
      return 'validation_error';
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return 'database_error';
    }

    if (error.name === 'TimeoutError') {
      return 'timeout_error';
    }

    return 'unknown_error';
  }

  private recordDataIngestionMetrics(request: Request, responseData: any) {
    try {
      const { machineId, machineName } = request.body || {};
      const dataSize = this.calculateDataSize(request.body);

      if (machineId) {
        this.metricsService.recordDataIngestion(machineId, dataSize, true);
        this.metricsService.recordActiveMachine(machineId, true);
      }

      // Update ADAM device status if present
      if (request.body?.adamData) {
        this.metricsService.recordAdamDeviceStatus(
          machineId || 'unknown',
          true
        );
      }
    } catch (error) {
      // Silent fail for metrics collection
      console.warn('Failed to record data ingestion metrics:', error.message);
    }
  }

  private recordMachineEventMetrics(request: Request) {
    try {
      const { machineId, eventType } = request.body || {};
      
      if (machineId && eventType) {
        this.metricsService.recordMachineEvent(machineId, eventType);
      }
    } catch (error) {
      console.warn('Failed to record machine event metrics:', error.message);
    }
  }

  private recordFailedDataIngestion(request: Request, errorType: string) {
    try {
      const { machineId } = request.body || {};
      const dataSize = this.calculateDataSize(request.body);

      if (machineId) {
        this.metricsService.recordDataIngestion(machineId, dataSize, false);
      }
    } catch (error) {
      console.warn('Failed to record failed data ingestion metrics:', error.message);
    }
  }

  private calculateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }
} 