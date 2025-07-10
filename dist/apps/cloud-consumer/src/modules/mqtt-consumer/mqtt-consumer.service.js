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
var MqttConsumerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttConsumerService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const data_storage_service_1 = require("../data-storage/data-storage.service");
const common_dto_1 = require("@mtconnect/common-dto");
let MqttConsumerService = MqttConsumerService_1 = class MqttConsumerService {
    dataStorageService;
    logger = new common_1.Logger(MqttConsumerService_1.name);
    constructor(dataStorageService) {
        this.dataStorageService = dataStorageService;
    }
    onModuleInit() {
        this.logger.log('MQTT Consumer Service initialized');
    }
    async handleMachineData(data) {
        try {
            this.logger.debug(`Received machine data from topic: ${JSON.stringify(data)}`);
            await this.dataStorageService.saveMachineData(data);
            this.logger.log(`Successfully processed machine data from gateway ${data.edgeGatewayId}`);
        }
        catch (error) {
            this.logger.error(`Failed to process machine data: ${error.message}`, error.stack);
        }
    }
    async handleAdamData(data) {
        try {
            this.logger.debug(`Received ADAM data: ${JSON.stringify(data)}`);
            await this.dataStorageService.saveAdamData(data);
            this.logger.log(`Successfully processed ADAM data for machine ${data.machineId}`);
        }
        catch (error) {
            this.logger.error(`Failed to process ADAM data: ${error.message}`, error.stack);
        }
    }
    async handleStatusMessage(data) {
        try {
            this.logger.debug(`Received status message: ${JSON.stringify(data)}`);
        }
        catch (error) {
            this.logger.error(`Failed to process status message: ${error.message}`, error.stack);
        }
    }
};
exports.MqttConsumerService = MqttConsumerService;
__decorate([
    (0, microservices_1.MessagePattern)('mtconnect/data/+'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_dto_1.EdgeGatewayDataDto]),
    __metadata("design:returntype", Promise)
], MqttConsumerService.prototype, "handleMachineData", null);
__decorate([
    (0, microservices_1.MessagePattern)('mtconnect/adam/+'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [common_dto_1.AdamDataDto]),
    __metadata("design:returntype", Promise)
], MqttConsumerService.prototype, "handleAdamData", null);
__decorate([
    (0, microservices_1.MessagePattern)('mtconnect/status/+'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MqttConsumerService.prototype, "handleStatusMessage", null);
exports.MqttConsumerService = MqttConsumerService = MqttConsumerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [data_storage_service_1.DataStorageService])
], MqttConsumerService);
//# sourceMappingURL=mqtt-consumer.service.js.map