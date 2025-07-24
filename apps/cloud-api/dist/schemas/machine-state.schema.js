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
exports.MachineStateSchema = exports.MachineState = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let MachineState = class MachineState {
    machineId;
    machineName;
    edgeGatewayId;
    executionStatus;
    availability;
    partCount;
    lastCycleTime;
    averageCycleTime;
    totalCycleCount;
    currentProgram;
    currentBlock;
    currentLine;
    adamData;
    activeAlarms;
    performance;
    lastDataUpdate;
    lastStatusChange;
    connectionLostAt;
    isOnline;
};
exports.MachineState = MachineState;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], MachineState.prototype, "machineId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineState.prototype, "machineName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MachineState.prototype, "edgeGatewayId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD'],
        default: 'UNAVAILABLE',
        index: true,
    }),
    __metadata("design:type", String)
], MachineState.prototype, "executionStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['AVAILABLE', 'UNAVAILABLE'],
        default: 'UNAVAILABLE',
        index: true,
    }),
    __metadata("design:type", String)
], MachineState.prototype, "availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], MachineState.prototype, "partCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], MachineState.prototype, "lastCycleTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], MachineState.prototype, "averageCycleTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], MachineState.prototype, "totalCycleCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], MachineState.prototype, "currentProgram", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], MachineState.prototype, "currentBlock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], MachineState.prototype, "currentLine", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            digitalInputs: [Boolean],
            digitalOutputs: [Boolean],
            connectionStatus: String,
            lastAdamUpdate: Date,
        },
    }),
    __metadata("design:type", Object)
], MachineState.prototype, "adamData", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                code: String,
                message: String,
                severity: { type: String, enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] },
                timestamp: Date,
                acknowledged: { type: Boolean, default: false },
            }],
        default: [],
    }),
    __metadata("design:type", Array)
], MachineState.prototype, "activeAlarms", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            utilizationPercent: Number,
            efficiencyPercent: Number,
            oeePercent: Number,
            plannedProductionTime: Number,
            actualProductionTime: Number,
            downtimeMinutes: Number,
        },
    }),
    __metadata("design:type", Object)
], MachineState.prototype, "performance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], MachineState.prototype, "lastDataUpdate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], MachineState.prototype, "lastStatusChange", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MachineState.prototype, "connectionLostAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true, index: true }),
    __metadata("design:type", Boolean)
], MachineState.prototype, "isOnline", void 0);
exports.MachineState = MachineState = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'machine_states',
        timestamps: true,
    })
], MachineState);
exports.MachineStateSchema = mongoose_1.SchemaFactory.createForClass(MachineState);
exports.MachineStateSchema.index({ machineId: 1 });
exports.MachineStateSchema.index({ executionStatus: 1, availability: 1 });
exports.MachineStateSchema.index({ isOnline: 1, lastDataUpdate: -1 });
exports.MachineStateSchema.index({ edgeGatewayId: 1, isOnline: 1 });
exports.MachineStateSchema.index({ 'activeAlarms.severity': 1 }, { sparse: true });
exports.MachineStateSchema.index({ lastDataUpdate: 1 }, {
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { isOnline: false }
});
//# sourceMappingURL=machine-state.schema.js.map