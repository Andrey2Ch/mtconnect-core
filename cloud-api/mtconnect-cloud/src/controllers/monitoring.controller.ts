import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as os from 'os';

@Controller('api/monitoring')
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: WinstonLoggerService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Get('health')
  async getHealthCheck() {
    const startTime = Date.now();
    const timer = this.metricsService.createTimer();

    try {
      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        
        // System metrics
        system: {
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
            usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
          },
          cpu: {
            load_average: os.loadavg(),
            cpu_count: os.cpus().length,
          },
          platform: os.platform(),
          arch: os.arch(),
        },

        // Application health
        application: {
          node_version: process.version,
          pid: process.pid,
          memory_usage: process.memoryUsage(),
        },

        // Database health
        database: await this.getDatabaseHealth(),

        // Service status
        services: {
          api: 'healthy',
          logging: 'healthy', 
          metrics: 'healthy',
          authentication: 'healthy',
        },

        // Response time
        response_time_ms: Date.now() - startTime,
      };

      this.logger.log(`Health check completed - Response time: ${healthData.response_time_ms}ms, Memory usage: ${healthData.system.memory.usage_percent}%, Database: ${healthData.database.status}`, 'MonitoringController');

      return healthData;

    } catch (error) {
      const duration = timer.end();
      
      this.logger.error(`Health check failed: ${error.message}`, error.stack, 'MonitoringController');

      throw new HttpException({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('health/detailed')
  async getDetailedHealthCheck() {
    const basicHealth = await this.getHealthCheck();
    
    // Add more detailed information
    const detailedHealth = {
      ...basicHealth,
      
      // Database detailed stats
      database_detailed: await this.getDetailedDatabaseHealth(),
      
      // Environment variables (safe ones)
      environment_info: {
        node_env: process.env.NODE_ENV,
        port: process.env.PORT,
        mongodb_connected: this.mongoConnection.readyState === 1,
        has_mongodb_uri: !!process.env.MONGODB_URI,
      },

      // Application metrics snapshot
      metrics_summary: await this.metricsService.getMetricsSnapshot(),
      
      // Recent error summary (if any)
      errors: await this.getRecentErrors(),
    };

    return detailedHealth;
  }

  @Get('status')
  async getSimpleStatus() {
    try {
      const isDbConnected = this.mongoConnection.readyState === 1;
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

      return {
        status: isDbConnected ? 'ok' : 'degraded',
        database: isDbConnected ? 'connected' : 'disconnected',
        memory_usage_percent: memoryUsagePercent,
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async getDatabaseHealth() {
    try {
      const dbStatus = this.mongoConnection.readyState;
      const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting', 
        3: 'disconnecting',
      };

      const stats = await this.mongoConnection.db.stats();
      
      return {
        status: dbStates[dbStatus] || 'unknown',
        ready_state: dbStatus,
        name: this.mongoConnection.name,
        host: this.mongoConnection.host,
        port: this.mongoConnection.port,
        collections: stats.collections,
        data_size: stats.dataSize,
        storage_size: stats.storageSize,
        index_size: stats.indexSize,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private async getDetailedDatabaseHealth() {
    try {
      const admin = this.mongoConnection.db.admin();
      const [serverStatus, dbStats] = await Promise.all([
        admin.serverStatus(),
        this.mongoConnection.db.stats(),
      ]);

      return {
        server: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          memory: serverStatus.mem,
          network: serverStatus.network,
        },
        database: {
          collections: dbStats.collections,
          documents: dbStats.objects,
          data_size: dbStats.dataSize,
          storage_size: dbStats.storageSize,
          indexes: dbStats.indexes,
          index_size: dbStats.indexSize,
          average_object_size: dbStats.avgObjSize,
        },
      };
    } catch (error) {
      return {
        error: error.message,
        basic_stats: await this.getDatabaseHealth(),
      };
    }
  }

  private async getRecentErrors(): Promise<any> {
    // This would integrate with your logging system
    // For now, return a placeholder
    return {
      last_24h: 0,
      last_hour: 0,
      most_recent: null,
      note: 'Error tracking would be implemented with log analysis',
    };
  }

  @Get('metrics/summary')
  async getMetricsSummary() {
    try {
      const summary = await this.metricsService.getMetricsSnapshot();
      
      return {
        ...summary,
        system_info: {
          memory_usage: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
          uptime: process.uptime(),
        },
        note: 'Full Prometheus metrics available at /api/monitoring/metrics',
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics summary: ${error.message}`, error.stack, 'MonitoringController');
      
      throw new HttpException({
        status: 'error',
        message: 'Failed to retrieve metrics summary',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 