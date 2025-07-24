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
    timestamp;
    metadata;
    data;
    createdAt;
};
exports.MachineData = MachineData;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], MachineData.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            edgeGatewayId: { type: String, required: true, index: true },
            machineId: { type: String, required: true, index: true },
            machineName: { type: String, required: true },
            dataType: {
                type: String,
                enum: ['production', 'alarm', 'maintenance', 'performance', 'adam'],
                default: 'production',
                index: true
            },
            source: {
                type: String,
                enum: ['mtconnect', 'adam', 'manual', 'calculated'],
                default: 'mtconnect'
            },
        },
        required: true
    }),
    __metadata("design:type", Object)
], MachineData.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            partCount: Number,
            cycleTime: Number,
            executionStatus: {
                type: String,
                enum: ['ACTIVE', 'READY', 'STOPPED', 'UNAVAILABLE', 'INTERRUPTED', 'FEED_HOLD']
            },
            availability: {
                type: String,
                enum: ['AVAILABLE', 'UNAVAILABLE']
            },
            program: String,
            block: String,
            line: String,
            adamData: {
                digitalInputs: [Boolean],
                digitalOutputs: [Boolean],
                analogData: {
                    type: Object,
                    of: Number
                },
                connectionStatus: String,
            },
            alarmCode: String,
            alarmMessage: String,
            alarmSeverity: {
                type: String,
                enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
            },
            oeePercent: Number,
            utilizationPercent: Number,
            efficiencyPercent: Number,
            maintenanceType: {
                type: String,
                enum: ['preventive', 'corrective', 'predictive']
            },
            maintenanceDescription: String,
            downtime: Number,
            powerConsumption: Number,
            temperature: Number,
            vibration: Number,
            toolWearPercent: Number,
            qualityGrade: {
                type: String,
                enum: ['A', 'B', 'C', 'REJECT']
            },
            defectType: String,
            reworkRequired: Boolean,
            customData: Object,
        },
        required: true
    }),
    __metadata("design:type", Object)
], MachineData.prototype, "data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now, index: true }),
    __metadata("design:type", Date)
], MachineData.prototype, "createdAt", void 0);
exports.MachineData = MachineData = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'machine_data',
        timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'seconds',
            expireAfterSeconds: 90 * 24 * 60 * 60,
        }
    })
], MachineData);
exports.MachineDataSchema = mongoose_1.SchemaFactory.createForClass(MachineData);
exports.MachineDataSchema.index({
    'metadata.machineId': 1,
    timestamp: -1
});
exports.MachineDataSchema.index({
    'metadata.edgeGatewayId': 1,
    timestamp: -1
});
exports.MachineDataSchema.index({
    'metadata.dataType': 1,
    timestamp: -1
});
exports.MachineDataSchema.index({
    'metadata.machineId': 1,
    'metadata.dataType': 1,
    timestamp: -1
});
exports.MachineDataSchema.index({
    'data.alarmSeverity': 1,
    timestamp: -1
}, {
    sparse: true,
    partialFilterExpression: { 'metadata.dataType': 'alarm' }
});
exports.MachineDataSchema.index({
    'data.executionStatus': 1,
    'metadata.machineId': 1,
    timestamp: -1
}, {
    sparse: true,
    partialFilterExpression: { 'metadata.dataType': 'production' }
});
exports.MachineDataSchema.index({
    'data.qualityGrade': 1,
    'metadata.machineId': 1,
    timestamp: -1
}, {
    sparse: true,
    partialFilterExpression: { 'data.qualityGrade': { $exists: true } }
});
//# sourceMappingURL=machine-data.schema.js.map