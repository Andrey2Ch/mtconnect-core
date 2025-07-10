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
exports.AggregatedDataSchema = exports.AggregatedData = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let AggregatedData = class AggregatedData {
    timestamp;
    metadata;
    aggregatedData;
    createdAt;
    lastUpdated;
};
exports.AggregatedData = AggregatedData;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], AggregatedData.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            machineId: { type: String, required: true, index: true },
            machineName: { type: String, required: true },
            edgeGatewayId: { type: String, required: true },
            aggregationPeriod: {
                type: String,
                enum: ['hour', 'day', 'week', 'month'],
                required: true,
                index: true
            },
            periodStart: { type: Date, required: true },
            periodEnd: { type: Date, required: true },
        },
        required: true
    }),
    __metadata("design:type", Object)
], AggregatedData.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            production: {
                totalParts: { type: Number, default: 0 },
                goodParts: { type: Number, default: 0 },
                rejectedParts: { type: Number, default: 0 },
                avgCycleTime: Number,
                minCycleTime: Number,
                maxCycleTime: Number,
                totalCycles: { type: Number, default: 0 },
                qualityRate: Number,
            },
            time: {
                totalTimeMinutes: { type: Number, default: 0 },
                activeTimeMinutes: { type: Number, default: 0 },
                idleTimeMinutes: { type: Number, default: 0 },
                downtimeMinutes: { type: Number, default: 0 },
                utilizationPercent: Number,
                efficiencyPercent: Number,
                oeePercent: Number,
            },
            executionStats: {
                activeMinutes: { type: Number, default: 0 },
                readyMinutes: { type: Number, default: 0 },
                stoppedMinutes: { type: Number, default: 0 },
                unavailableMinutes: { type: Number, default: 0 },
                interruptedMinutes: { type: Number, default: 0 },
                feedHoldMinutes: { type: Number, default: 0 },
            },
            alarms: {
                totalAlarms: { type: Number, default: 0 },
                criticalAlarms: { type: Number, default: 0 },
                errorAlarms: { type: Number, default: 0 },
                warningAlarms: { type: Number, default: 0 },
                infoAlarms: { type: Number, default: 0 },
                avgResolutionTimeMinutes: Number,
                mostFrequentAlarmCode: String,
                mostFrequentAlarmCount: Number,
            },
            adam: {
                totalReadings: { type: Number, default: 0 },
                connectionUptime: Number,
                avgDigitalInputsActive: [Number],
                avgDigitalOutputsActive: [Number],
                inputChangeCount: [Number],
                outputChangeCount: [Number],
            },
            maintenance: {
                preventiveMaintenanceMinutes: { type: Number, default: 0 },
                correctiveMaintenanceMinutes: { type: Number, default: 0 },
                predictiveMaintenanceMinutes: { type: Number, default: 0 },
                totalMaintenanceEvents: { type: Number, default: 0 },
                mtbf: Number,
                mttr: Number,
            },
            conditions: {
                avgPowerConsumption: Number,
                maxPowerConsumption: Number,
                minPowerConsumption: Number,
                totalEnergyConsumed: Number,
                avgTemperature: Number,
                maxTemperature: Number,
                minTemperature: Number,
                avgVibration: Number,
                maxVibration: Number,
                toolWearProgression: Number,
            },
            programs: {
                uniquePrograms: [String],
                mostUsedProgram: String,
                mostUsedProgramRuntime: Number,
                programSwitches: Number,
                avgProgramRuntime: Number,
            },
            quality: {
                gradeACount: { type: Number, default: 0 },
                gradeBCount: { type: Number, default: 0 },
                gradeCCount: { type: Number, default: 0 },
                rejectCount: { type: Number, default: 0 },
                reworkCount: { type: Number, default: 0 },
                defectTypes: [{
                        type: String,
                        count: Number
                    }],
                firstPassYield: Number,
            }
        },
        required: true
    }),
    __metadata("design:type", Object)
], AggregatedData.prototype, "aggregatedData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now, index: true }),
    __metadata("design:type", Date)
], AggregatedData.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AggregatedData.prototype, "lastUpdated", void 0);
exports.AggregatedData = AggregatedData = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'aggregated_data',
        timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'hours',
            expireAfterSeconds: 365 * 24 * 60 * 60,
        }
    })
], AggregatedData);
exports.AggregatedDataSchema = mongoose_1.SchemaFactory.createForClass(AggregatedData);
exports.AggregatedDataSchema.index({
    'metadata.machineId': 1,
    'metadata.aggregationPeriod': 1,
    timestamp: -1
});
exports.AggregatedDataSchema.index({
    'metadata.edgeGatewayId': 1,
    'metadata.aggregationPeriod': 1,
    timestamp: -1
});
exports.AggregatedDataSchema.index({
    'metadata.aggregationPeriod': 1,
    'metadata.periodStart': 1,
    'metadata.periodEnd': 1
});
exports.AggregatedDataSchema.index({
    'metadata.machineId': 1,
    'metadata.aggregationPeriod': 1,
    'metadata.periodStart': 1
}, { unique: true });
exports.AggregatedDataSchema.index({
    'aggregatedData.production.totalParts': -1,
    'metadata.aggregationPeriod': 1
});
exports.AggregatedDataSchema.index({
    'aggregatedData.time.oeePercent': -1,
    'metadata.aggregationPeriod': 1
});
exports.AggregatedDataSchema.index({
    'aggregatedData.alarms.totalAlarms': -1,
    timestamp: -1
}, {
    partialFilterExpression: { 'aggregatedData.alarms.totalAlarms': { $gt: 0 } }
});
//# sourceMappingURL=aggregated-data.schema.js.map