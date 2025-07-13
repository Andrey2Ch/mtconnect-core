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
};
exports.MachineData = MachineData;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], MachineData.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            edgeGatewayId: String,
            machineId: String,
            machineName: String,
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
            executionStatus: String,
            availability: String,
            program: String,
            block: String,
            line: String,
            adamData: Object,
        },
        required: true
    }),
    __metadata("design:type", Object)
], MachineData.prototype, "data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], MachineData.prototype, "createdAt", void 0);
exports.MachineData = MachineData = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'machine_data',
        timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'seconds'
        }
    })
], MachineData);
exports.MachineDataSchema = mongoose_1.SchemaFactory.createForClass(MachineData);
//# sourceMappingURL=machine-data.schema.js.map