import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { WinstonLoggerService } from '../services/winston-logger.service';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: WinstonLoggerService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private getClientIp;
    private sanitizeBody;
    private sanitizeHeaders;
    private removeSensitiveFields;
}
