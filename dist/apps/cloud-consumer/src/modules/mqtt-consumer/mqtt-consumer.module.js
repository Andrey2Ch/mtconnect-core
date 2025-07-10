"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttConsumerModule = void 0;
const common_1 = require("@nestjs/common");
const mqtt_consumer_service_1 = require("./mqtt-consumer.service");
const data_storage_module_1 = require("../data-storage/data-storage.module");
let MqttConsumerModule = class MqttConsumerModule {
};
exports.MqttConsumerModule = MqttConsumerModule;
exports.MqttConsumerModule = MqttConsumerModule = __decorate([
    (0, common_1.Module)({
        imports: [data_storage_module_1.DataStorageModule],
        providers: [mqtt_consumer_service_1.MqttConsumerService],
        exports: [mqtt_consumer_service_1.MqttConsumerService],
    })
], MqttConsumerModule);
//# sourceMappingURL=mqtt-consumer.module.js.map