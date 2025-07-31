"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MachineDataIngestController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MachineDataIngestController = exports.MachineDataIngestDto = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
class MachineDataIngestDto {
    timestamp;
    machineId;
    source;
    dataType;
    triggerReason;
    data;
}
exports.MachineDataIngestDto = MachineDataIngestDto;
let MachineDataIngestController = MachineDataIngestController_1 = class MachineDataIngestController {
    machineDataModel;
    logger = new common_1.Logger(MachineDataIngestController_1.name);
    constructor(machineDataModel) {
        this.machineDataModel = machineDataModel;
    }
    async ingestMachineData(payload) {
        try {
            this.logger.log(`📥 Получены данные от ${payload.machineId}: ${payload.triggerReason}`);
            if (!payload.machineId || !payload.source || !payload.timestamp) {
                this.logger.error('❌ Некорректные данные: отсутствуют обязательные поля');
                return {
                    success: false,
                    error: 'Отсутствуют обязательные поля: machineId, source, timestamp'
                };
            }
            const dataType = payload.source === 'adam' ? 'adam' : 'production';
            const validExecutionStatuses = ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'];
            const executionStatus = validExecutionStatuses.includes(payload.data.execution)
                ? payload.data.execution
                : 'UNAVAILABLE';
            const documentToSave = {
                timestamp: new Date(payload.timestamp),
                metadata: {
                    edgeGatewayId: 'edge-gateway-1',
                    machineId: payload.machineId,
                    machineName: payload.machineId,
                    source: payload.source,
                    dataType: dataType
                },
                data: {
                    partCount: typeof payload.data.partCount === 'string' ?
                        (isNaN(Number(payload.data.partCount)) ? 0 : Number(payload.data.partCount)) :
                        payload.data.partCount,
                    program: payload.data.program,
                    cycleTime: payload.data.cycleTime,
                    executionStatus: executionStatus,
                    availability: payload.data.availability,
                    adamData: payload.data.adamData,
                    idleTimeMinutes: payload.data.idleTimeMinutes || 0,
                    customData: {
                        triggerReason: payload.triggerReason,
                        originalDataType: payload.dataType,
                        cycleConfidence: payload.data.cycleConfidence
                    }
                }
            };
            const savedDocument = await this.machineDataModel.create(documentToSave);
            this.logger.log(`✅ Данные сохранены для ${payload.machineId}, ID: ${savedDocument._id}`);
            return {
                success: true,
                message: 'Данные успешно сохранены',
                documentId: savedDocument._id,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error(`❌ Ошибка сохранения данных для ${payload.machineId}:`, error.message);
            return {
                success: false,
                error: 'Внутренняя ошибка сервера',
                details: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    async ingestBatchMachineData(payloads) {
        try {
            this.logger.log(`📥 Получен пакет данных, размер: ${payloads.length}`);
            if (!Array.isArray(payloads) || payloads.length === 0) {
                return {
                    success: false,
                    error: 'Пустой или некорректный пакет данных'
                };
            }
            const documentsToSave = payloads.map(payload => {
                const dataType = payload.source === 'adam' ? 'adam' : 'production';
                const validExecutionStatuses = ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'];
                const executionStatus = validExecutionStatuses.includes(payload.data.execution)
                    ? payload.data.execution
                    : 'UNAVAILABLE';
                return {
                    timestamp: new Date(payload.timestamp),
                    metadata: {
                        edgeGatewayId: 'edge-gateway-1',
                        machineId: payload.machineId,
                        machineName: payload.machineId,
                        source: payload.source,
                        dataType: dataType
                    },
                    data: {
                        partCount: typeof payload.data.partCount === 'string' ?
                            (isNaN(Number(payload.data.partCount)) ? 0 : Number(payload.data.partCount)) :
                            payload.data.partCount,
                        program: payload.data.program,
                        cycleTime: payload.data.cycleTime,
                        executionStatus: executionStatus,
                        availability: payload.data.availability,
                        adamData: payload.data.adamData,
                        idleTimeMinutes: payload.data.idleTimeMinutes || 0,
                        customData: {
                            triggerReason: payload.triggerReason,
                            originalDataType: payload.dataType,
                            cycleConfidence: payload.data.cycleConfidence
                        }
                    }
                };
            });
            const savedDocuments = await this.machineDataModel.insertMany(documentsToSave);
            this.logger.log(`✅ Пакет данных сохранен: ${savedDocuments.length} записей`);
            return {
                success: true,
                message: `Пакет данных успешно сохранен: ${savedDocuments.length} записей`,
                savedCount: savedDocuments.length,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error(`❌ Ошибка сохранения пакета данных:`, error.message);
            return {
                success: false,
                error: 'Внутренняя ошибка сервера при сохранении пакета',
                details: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
};
exports.MachineDataIngestController = MachineDataIngestController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [MachineDataIngestDto]),
    __metadata("design:returntype", Promise)
], MachineDataIngestController.prototype, "ingestMachineData", null);
__decorate([
    (0, common_1.Post)('ingest/batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], MachineDataIngestController.prototype, "ingestBatchMachineData", null);
exports.MachineDataIngestController = MachineDataIngestController = MachineDataIngestController_1 = __decorate([
    (0, common_1.Controller)('api/v1/machine-data'),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], MachineDataIngestController);
//# sourceMappingURL=machine-data-ingest.controller.js.map