"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const throttler_1 = require("@nestjs/throttler");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
const sanitization_service_1 = require("../services/sanitization.service");
const winston_logger_service_1 = require("../services/winston-logger.service");
const path = __importStar(require("path"));
let DashboardController = class DashboardController {
    machineDataModel;
    logger;
    sanitizationService;
    constructor(machineDataModel, logger, sanitizationService) {
        this.machineDataModel = machineDataModel;
        this.logger = logger;
        this.sanitizationService = sanitizationService;
    }
    async serveDashboard(res) {
        try {
            const dashboardPath = path.join(__dirname, '../../public/dashboard-new.html');
            return res.sendFile(dashboardPath);
        }
        catch (error) {
            this.logger.error(`Failed to serve dashboard: ${error.message}`, error.stack, 'DashboardController');
            throw new common_1.InternalServerErrorException('Dashboard unavailable');
        }
    }
    async getMachines() {
        try {
            this.logger.log('Fetching machine list', 'DashboardController');
            const machines = await this.machineDataModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        machineName: { $last: '$metadata.machineName' },
                        lastSeen: { $max: '$timestamp' },
                        totalRecords: { $sum: 1 },
                        lastStatus: { $last: '$data.executionStatus' },
                        lastPartCount: { $last: '$data.partCount' },
                        lastCycleTime: { $last: '$data.cycleTime' },
                        lastProgram: { $last: '$data.program' },
                        lastAdamData: { $last: '$data.adamData' },
                        lastAdamCount: { $last: '$data.adamData.analogData.count' },
                        lastAdamCycleTime: { $last: '$data.adamData.analogData.cycleTimeMs' },
                        lastAdamConfidence: { $last: '$data.adamData.analogData.confidence' },
                        lastIdleTimeMinutes: { $last: '$data.idleTimeMinutes' }
                    }
                },
                {
                    $project: {
                        machineId: '$_id',
                        machineName: 1,
                        lastSeen: 1,
                        totalRecords: 1,
                        lastStatus: 1,
                        lastPartCount: 1,
                        lastCycleTime: 1,
                        lastProgram: 1,
                        lastAdamData: 1,
                        lastAdamCount: 1,
                        lastAdamCycleTime: 1,
                        lastAdamConfidence: 1,
                        lastIdleTimeMinutes: 1,
                        isAdamMachine: {
                            $cond: {
                                if: { $ne: ['$lastAdamData', null] },
                                then: true,
                                else: false
                            }
                        },
                        _id: 0
                    }
                },
                { $sort: { machineId: 1 } }
            ]);
            return {
                status: 'success',
                count: machines.length,
                machines: machines
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch machines: ${error.message}`, error.stack, 'DashboardController');
            throw new common_1.InternalServerErrorException('Failed to fetch machine list');
        }
    }
    async getMachineData(machineId, hours) {
        try {
            const sanitizedMachineId = this.sanitizationService.sanitizeText(machineId, 100);
            if (!sanitizedMachineId) {
                throw new common_1.BadRequestException('Invalid machine ID');
            }
            const hoursNum = parseInt(hours || '24', 10);
            if (hoursNum < 1 || hoursNum > 168) {
                throw new common_1.BadRequestException('Hours must be between 1 and 168');
            }
            const fromDate = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
            this.logger.log(`Fetching data for machine ${sanitizedMachineId} for ${hoursNum} hours`, 'DashboardController');
            const data = await this.machineDataModel.find({
                'metadata.machineId': sanitizedMachineId,
                timestamp: { $gte: fromDate }
            })
                .select('timestamp data metadata.machineName')
                .sort({ timestamp: -1 })
                .limit(1000)
                .lean();
            if (data.length === 0) {
                throw new common_1.NotFoundException(`No data found for machine ${sanitizedMachineId}`);
            }
            const processedData = data.map(record => ({
                timestamp: record.timestamp,
                machineName: record.metadata.machineName,
                partCount: record.data?.partCount || 0,
                cycleTime: record.data?.cycleTime || 0,
                executionStatus: record.data?.executionStatus || 'UNAVAILABLE',
                availability: record.data?.availability || 'UNAVAILABLE',
                program: record.data?.program || '',
                block: record.data?.block || '',
                line: record.data?.line || '',
                adamData: record.data?.adamData || {}
            }));
            return {
                status: 'success',
                machineId: sanitizedMachineId,
                recordCount: processedData.length,
                hoursRequested: hoursNum,
                data: processedData
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch machine data: ${error.message}`, error.stack, 'DashboardController');
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to fetch machine data');
        }
    }
    async getSystemStatus() {
        try {
            this.logger.log('Fetching system status', 'DashboardController');
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const [recentRecords, dailyRecords, machineCount] = await Promise.all([
                this.machineDataModel.countDocuments({ timestamp: { $gte: oneHourAgo } }),
                this.machineDataModel.countDocuments({ timestamp: { $gte: oneDayAgo } }),
                this.machineDataModel.distinct('metadata.machineId', { timestamp: { $gte: oneDayAgo } })
            ]);
            const activeMachines = await this.machineDataModel.distinct('metadata.machineId', {
                timestamp: { $gte: oneHourAgo }
            });
            const lastRecords = await this.machineDataModel.aggregate([
                {
                    $match: { timestamp: { $gte: oneDayAgo } }
                },
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        lastRecord: { $first: '$$ROOT' }
                    }
                }
            ]);
            const machineStatuses = lastRecords.map(item => ({
                machineId: item._id,
                machineName: item.lastRecord.metadata.machineName,
                lastSeen: item.lastRecord.timestamp,
                status: item.lastRecord.data?.executionStatus || 'UNAVAILABLE',
                isActive: activeMachines.includes(item._id)
            }));
            return {
                status: 'success',
                timestamp: now,
                summary: {
                    totalMachines: machineCount.length,
                    activeMachines: activeMachines.length,
                    recentRecords: recentRecords,
                    dailyRecords: dailyRecords
                },
                machines: machineStatuses
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch system status: ${error.message}`, error.stack, 'DashboardController');
            throw new common_1.InternalServerErrorException('Failed to fetch system status');
        }
    }
    async dashboardHealth() {
        try {
            const dbCheck = await this.machineDataModel.findOne().limit(1);
            return {
                status: 'healthy',
                timestamp: new Date(),
                database: dbCheck ? 'connected' : 'empty'
            };
        }
        catch (error) {
            this.logger.error(`Dashboard health check failed: ${error.message}`, error.stack, 'DashboardController');
            throw new common_1.InternalServerErrorException('Health check failed');
        }
    }
    async getCurrentMTConnectData(res) {
        try {
            this.logger.log('Serving current MTConnect data', 'DashboardController');
            const recentData = await this.machineDataModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
                    }
                },
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latestRecord: { $first: '$$ROOT' }
                    }
                }
            ]);
            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MTConnectStreams xmlns="urn:mtconnect.org:MTConnectStreams:2.0" 
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xsi:schemaLocation="urn:mtconnect.org:MTConnectStreams:2.0 http://schemas.mtconnect.org/schemas/MTConnectStreams_2.0.xsd">
  <Header creationTime="${new Date().toISOString()}" sender="MTConnect Cloud API" instanceId="1" version="2.0.0.0" bufferSize="131072"/>
  <Streams>`;
            for (const item of recentData) {
                const record = item.latestRecord;
                const machineId = record.metadata.machineId;
                const machineName = record.metadata.machineName || machineId;
                xml += `
    <DeviceStream name="${machineName}" uuid="${machineId}" id="${machineId}">
      <ComponentStream component="Path" name="path" componentId="pth" id="pth">
        <Events>
          <Execution dataItemId="execution" timestamp="${record.timestamp.toISOString()}">${record.data?.executionStatus || 'UNAVAILABLE'}</Execution>
          <Program dataItemId="program" timestamp="${record.timestamp.toISOString()}">${record.data?.program || ''}</Program>
          <Block dataItemId="block" timestamp="${record.timestamp.toISOString()}">${record.data?.block || ''}</Block>
          <Line dataItemId="line" timestamp="${record.timestamp.toISOString()}">${record.data?.line || ''}</Line>
        </Events>
        <Samples>
          <PartCount dataItemId="partcount" timestamp="${record.timestamp.toISOString()}">${record.data?.partCount || 0}</PartCount>
          <CycleTime dataItemId="cycletime" timestamp="${record.timestamp.toISOString()}">${record.data?.cycleTime || 0}</CycleTime>
        </Samples>
      </ComponentStream>
    </DeviceStream>`;
            }
            xml += `
  </Streams>
</MTConnectStreams>`;
            res.set('Content-Type', 'application/xml');
            return res.send(xml);
        }
        catch (error) {
            this.logger.error(`Failed to serve current data: ${error.message}`, error.stack, 'DashboardController');
            throw new common_1.InternalServerErrorException('Failed to serve current data');
        }
    }
    async getAdamCounters() {
        try {
            this.logger.log('Serving Adam counters data', 'DashboardController');
            const adamData = await this.machineDataModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
                        'data.adamData': { $exists: true, $ne: null }
                    }
                },
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latestRecord: { $first: '$$ROOT' }
                    }
                }
            ]);
            const counters = adamData.map(item => {
                const record = item.latestRecord;
                const adam = record.data.adamData || {};
                return {
                    machineId: record.metadata.machineId,
                    count: adam.partCount || record.data.partCount || 0,
                    cycleTimeMs: (adam.cycleTime || record.data.cycleTime || 0) * 1000,
                    timestamp: record.timestamp
                };
            });
            return {
                status: 'success',
                counters: counters
            };
        }
        catch (error) {
            this.logger.error(`Failed to serve Adam counters: ${error.message}`, error.stack, 'DashboardController');
            return {
                error: error.message
            };
        }
    }
    async getStatus() {
        try {
            this.logger.log('Serving status data', 'DashboardController');
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
            const machines = await this.machineDataModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
                    }
                },
                {
                    $sort: { timestamp: -1 }
                },
                {
                    $group: {
                        _id: '$metadata.machineId',
                        latestRecord: { $first: '$$ROOT' }
                    }
                }
            ]);
            const mtconnectAgents = machines.map(item => {
                const record = item.latestRecord;
                const isRecent = record.timestamp >= oneMinuteAgo;
                return {
                    id: record.metadata.machineId,
                    name: record.metadata.machineName || record.metadata.machineId,
                    status: isRecent ? 'OK' : 'TIMEOUT',
                    lastSeen: record.timestamp,
                    error: isRecent ? null : 'No recent data'
                };
            });
            return {
                status: 'OK',
                timestamp: new Date(),
                mtconnectAgents: mtconnectAgents,
                totalAgents: mtconnectAgents.length,
                onlineAgents: mtconnectAgents.filter(a => a.status === 'OK').length
            };
        }
        catch (error) {
            this.logger.error(`Failed to serve status: ${error.message}`, error.stack, 'DashboardController');
            throw new common_1.InternalServerErrorException('Failed to serve status');
        }
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('/'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "serveDashboard", null);
__decorate([
    (0, common_1.Get)('api/dashboard/machines'),
    (0, throttler_1.Throttle)({ short: { limit: 100, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getMachines", null);
__decorate([
    (0, common_1.Get)('api/dashboard/data/:machineId'),
    (0, throttler_1.Throttle)({ short: { limit: 200, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('machineId')),
    __param(1, (0, common_1.Query)('hours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getMachineData", null);
__decorate([
    (0, common_1.Get)('api/dashboard/status'),
    (0, throttler_1.Throttle)({ short: { limit: 50, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSystemStatus", null);
__decorate([
    (0, common_1.Get)('api/dashboard/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "dashboardHealth", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, throttler_1.Throttle)({ short: { limit: 100, ttl: 60000 } }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getCurrentMTConnectData", null);
__decorate([
    (0, common_1.Get)('api/adam/counters'),
    (0, throttler_1.Throttle)({ short: { limit: 100, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getAdamCounters", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, throttler_1.Throttle)({ short: { limit: 50, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getStatus", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)(),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        winston_logger_service_1.WinstonLoggerService,
        sanitization_service_1.SanitizationService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map