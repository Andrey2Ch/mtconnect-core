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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdamDataSchema = exports.AdamData = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let AdamData = class AdamData {
    deviceId;
    deviceName;
    timestamp;
    deviceType;
    digitalInputs;
    digitalOutputs;
    analogInputs;
    analogOutputs;
    temperature;
    humidity;
    status;
    additionalData;
    source;
};
exports.AdamData = AdamData;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], AdamData.prototype, "deviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AdamData.prototype, "deviceName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], AdamData.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AdamData.prototype, "deviceType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdamData.prototype, "digitalInputs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdamData.prototype, "digitalOutputs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdamData.prototype, "analogInputs", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdamData.prototype, "analogOutputs", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AdamData.prototype, "temperature", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AdamData.prototype, "humidity", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AdamData.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AdamData.prototype, "additionalData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'adam' }),
    __metadata("design:type", String)
], AdamData.prototype, "source", void 0);
exports.AdamData = AdamData = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AdamData);
exports.AdamDataSchema = mongoose_1.SchemaFactory.createForClass(AdamData);
exports.AdamDataSchema.index({ deviceId: 1, timestamp: -1 });
//# sourceMappingURL=adam-data.schema.js.map