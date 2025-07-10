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
exports.MachineDataSchema = exports.MachineData = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let MachineData = class MachineData {
    machineId;
    machineName;
    timestamp;
    status;
    program;
    mode;
    spindle;
    feeds;
    axes;
    toolData;
    additionalData;
    source;
};
exports.MachineData = MachineData;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MachineData.prototype, "machineId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineData.prototype, "machineName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], MachineData.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineData.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MachineData.prototype, "program", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MachineData.prototype, "mode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Object)
], MachineData.prototype, "spindle", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Object)
], MachineData.prototype, "feeds", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Object)
], MachineData.prototype, "axes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Object)
], MachineData.prototype, "toolData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], MachineData.prototype, "additionalData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'mtconnect' }),
    __metadata("design:type", String)
], MachineData.prototype, "source", void 0);
exports.MachineData = MachineData = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MachineData);
exports.MachineDataSchema = mongoose_1.SchemaFactory.createForClass(MachineData);
exports.MachineDataSchema.index({ machineId: 1, timestamp: -1 });
//# sourceMappingURL=machine-data.schema.js.map