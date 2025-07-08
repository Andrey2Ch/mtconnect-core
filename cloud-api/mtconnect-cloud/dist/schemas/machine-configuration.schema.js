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
exports.MachineConfigurationSchema = exports.MachineConfiguration = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let MachineConfiguration = class MachineConfiguration {
};
exports.MachineConfiguration = MachineConfiguration;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], MachineConfiguration.prototype, "machineId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineConfiguration.prototype, "machineName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineConfiguration.prototype, "manufacturer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineConfiguration.prototype, "model", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineConfiguration.prototype, "serialNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            ip: String,
            port: Number,
            mtconnectAgentUrl: String,
            adamIp: String,
            adamPort: Number,
        },
        required: true,
    }),
    __metadata("design:type", Object)
], MachineConfiguration.prototype, "networkConfig", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            dataRetentionDays: { type: Number, default: 30 },
            pollingIntervalMs: { type: Number, default: 5000 },
            enabledDataItems: [String],
            customAttributes: Object,
        },
        default: {},
    }),
    __metadata("design:type", Object)
], MachineConfiguration.prototype, "settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            latitude: Number,
            longitude: Number,
            building: String,
            floor: String,
            line: String,
            cell: String,
        },
    }),
    __metadata("design:type", Object)
], MachineConfiguration.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], MachineConfiguration.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], MachineConfiguration.prototype, "lastConfigUpdate", void 0);
exports.MachineConfiguration = MachineConfiguration = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'machine_configurations',
        timestamps: true,
    })
], MachineConfiguration);
exports.MachineConfigurationSchema = mongoose_1.SchemaFactory.createForClass(MachineConfiguration);
exports.MachineConfigurationSchema.index({ machineId: 1 });
exports.MachineConfigurationSchema.index({ isActive: 1 });
exports.MachineConfigurationSchema.index({ 'location.building': 1, 'location.line': 1 });
exports.MachineConfigurationSchema.index({ manufacturer: 1, model: 1 });
//# sourceMappingURL=machine-configuration.schema.js.map