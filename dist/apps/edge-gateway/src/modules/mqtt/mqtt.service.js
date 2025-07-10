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
var MqttService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
let MqttService = MqttService_1 = class MqttService {
    mqttClient;
    logger = new common_1.Logger(MqttService_1.name);
    constructor(mqttClient) {
        this.mqttClient = mqttClient;
    }
    async publishMachineData(data) {
        try {
            const topic = `mtconnect/data/${data.edgeGatewayId}`;
            this.logger.debug(`Publishing to topic: ${topic}`, {
                edgeGatewayId: data.edgeGatewayId,
                machineCount: data.data.length,
            });
            await this.mqttClient.emit(topic, data).toPromise();
            this.logger.log(`Successfully published data for ${data.data.length} machines`);
        }
        catch (error) {
            this.logger.error('Failed to publish machine data', error);
            throw error;
        }
    }
    async publishHeartbeat(edgeGatewayId) {
        try {
            const topic = `mtconnect/heartbeat/${edgeGatewayId}`;
            const heartbeat = {
                edgeGatewayId,
                timestamp: new Date().toISOString(),
                status: 'alive',
            };
            await this.mqttClient.emit(topic, heartbeat).toPromise();
            this.logger.debug(`Heartbeat sent for ${edgeGatewayId}`);
        }
        catch (error) {
            this.logger.error('Failed to publish heartbeat', error);
        }
    }
};
exports.MqttService = MqttService;
exports.MqttService = MqttService = MqttService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MQTT_SERVICE')),
    __metadata("design:paramtypes", [microservices_1.ClientProxy])
], MqttService);
//# sourceMappingURL=mqtt.service.js.map