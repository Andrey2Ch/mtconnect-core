import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Generate unique request ID
    const requestId = uuidv4();
    
    // Add request ID to request object for later use
    (request as any).requestId = requestId;

    // Extract request metadata
    const requestData = {
      method: request.method,
      url: request.url,
      ip: this.getClientIp(request),
      userAgent: request.get('User-Agent'),
      body: this.sanitizeBody(request.body),
      query: request.query,
      headers: this.sanitizeHeaders(request.headers),
      requestId
    };

    // Log incoming request
    this.logger.logApiRequest(requestData);

    return next.handle().pipe(
      tap((responseBody) => {
        const responseTime = Date.now() - startTime;
        
        // Log successful response
        this.logger.logApiResponse({
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          responseTime,
          contentLength: response.get('Content-Length') ? 
            parseInt(response.get('Content-Length') as string) : undefined,
          requestId
        });

        // Log performance if request took longer than threshold
        if (responseTime > 1000) { // 1 second threshold
          this.logger.logPerformance({
            operation: `${request.method} ${request.url}`,
            duration: responseTime,
            details: {
              requestId,
              statusCode: response.statusCode,
              userAgent: request.get('User-Agent'),
              ip: this.getClientIp(request)
            }
          });
        }

        // Log data ingestion events specifically
        if (request.url.includes('/api/ext/data') && request.method === 'POST') {
          const body = responseBody || {};
          this.logger.logDataIngestion({
            edgeGatewayId: request.body?.edgeGatewayId || 'unknown',
            machineCount: request.body?.data?.length || 0,
            recordsProcessed: body.recordsProcessed || 0,
            processingTimeMs: responseTime,
            success: response.statusCode < 400,
            errors: response.statusCode >= 400 ? [body] : undefined
          });
        }
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        
        // Log API error
        this.logger.logApiError({
          method: request.method,
          url: request.url,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...error
          },
          statusCode: error.status || 500,
          responseTime,
          requestId
        });

        // Log security events for suspicious activities
        if (error.status === 401 || error.status === 403) {
          this.logger.logSecurity({
            event: 'unauthorized_access',
            ip: this.getClientIp(request),
            userAgent: request.get('User-Agent'),
            details: {
              url: request.url,
              method: request.method,
              error: error.message,
              requestId
            },
            severity: 'medium'
          });
        }

        // Rate limiting violations
        if (error.status === 429) {
          this.logger.logSecurity({
            event: 'rate_limit_exceeded',
            ip: this.getClientIp(request),
            userAgent: request.get('User-Agent'),
            details: {
              url: request.url,
              method: request.method,
              requestId
            },
            severity: 'low'
          });
        }

        // Re-throw the error
        throw error;
      })
    );
  }

  private getClientIp(request: Request): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      (request.connection as any)?.socket?.remoteAddress ||
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      'unknown'
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(body));
    
    // Remove sensitive fields
    this.removeSensitiveFields(sanitized, [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'api_key',
      'apiKey'
    ]);

    // Limit size to prevent huge logs
    const bodyString = JSON.stringify(sanitized);
    if (bodyString.length > 5000) {
      return { 
        _truncated: true, 
        _originalSize: bodyString.length,
        _preview: bodyString.substring(0, 1000) + '...'
      };
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token'
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private removeSensitiveFields(obj: any, sensitiveFields: string[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          this.removeSensitiveFields(obj[key], sensitiveFields);
        }
      }
    }
  }
} 