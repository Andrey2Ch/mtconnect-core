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
exports.EdgeGatewayDataDto = exports.MachineDataItemDto = exports.MachineDataValueDto = exports.AdamDataDto = exports.AvailabilityStatus = exports.ExecutionStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var ExecutionStatus;
(function (ExecutionStatus) {
    ExecutionStatus["ACTIVE"] = "ACTIVE";
    ExecutionStatus["STOPPED"] = "STOPPED";
    ExecutionStatus["INTERRUPTED"] = "INTERRUPTED";
    ExecutionStatus["READY"] = "READY";
    ExecutionStatus["UNAVAILABLE"] = "UNAVAILABLE";
})(ExecutionStatus || (exports.ExecutionStatus = ExecutionStatus = {}));
var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["AVAILABLE"] = "AVAILABLE";
    AvailabilityStatus["UNAVAILABLE"] = "UNAVAILABLE";
})(AvailabilityStatus || (exports.AvailabilityStatus = AvailabilityStatus = {}));
class AdamDataDto {
    digitalInputs;
    digitalOutputs;
    analogData;
}
exports.AdamDataDto = AdamDataDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'ADAM digital inputs must be an object' }),
    __metadata("design:type", Object)
], AdamDataDto.prototype, "digitalInputs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'ADAM digital outputs must be an object' }),
    __metadata("design:type", Object)
], AdamDataDto.prototype, "digitalOutputs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'ADAM analog data must be an object' }),
    __metadata("design:type", Object)
], AdamDataDto.prototype, "analogData", void 0);
class MachineDataValueDto {
    partCount;
    cycleTime;
    executionStatus;
    availability;
    program;
    block;
    line;
    adamData;
}
exports.MachineDataValueDto = MachineDataValueDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Part count must be a valid number' }),
    (0, class_validator_1.Min)(0, { message: 'Part count cannot be negative' }),
    (0, class_validator_1.Max)(999999, { message: 'Part count cannot exceed 999,999' }),
    (0, class_transformer_1.Transform)(({ value }) => Math.floor(Number(value)), { toClassOnly: true }),
    __metadata("design:type", Number)
], MachineDataValueDto.prototype, "partCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Cycle time must be a valid number' }),
    (0, class_validator_1.Min)(0, { message: 'Cycle time cannot be negative' }),
    (0, class_validator_1.Max)(86400, { message: 'Cycle time cannot exceed 24 hours (86400 seconds)' }),
    (0, class_transformer_1.Transform)(({ value }) => Math.round(Number(value) * 100) / 100, { toClassOnly: true }),
    __metadata("design:type", Number)
], MachineDataValueDto.prototype, "cycleTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ExecutionStatus, {
        message: `Execution status must be one of: ${Object.values(ExecutionStatus).join(', ')}`
    }),
    (0, class_transformer_1.Transform)(({ value }) => value?.toUpperCase(), { toClassOnly: true }),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "executionStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AvailabilityStatus, {
        message: `Availability must be one of: ${Object.values(AvailabilityStatus).join(', ')}`
    }),
    (0, class_transformer_1.Transform)(({ value }) => value?.toUpperCase(), { toClassOnly: true }),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "availability", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Program must be a valid string' }),
    (0, class_validator_1.Length)(0, 255, { message: 'Program name cannot exceed 255 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim(), { toClassOnly: true }),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "program", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Block must be a valid string' }),
    (0, class_validator_1.Length)(0, 100, { message: 'Block cannot exceed 100 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim(), { toClassOnly: true }),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "block", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Line must be a valid string' }),
    (0, class_validator_1.Length)(0, 100, { message: 'Line cannot exceed 100 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim(), { toClassOnly: true }),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "line", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ message: 'ADAM data must be a valid object structure' }),
    (0, class_transformer_1.Type)(() => AdamDataDto),
    __metadata("design:type", AdamDataDto)
], MachineDataValueDto.prototype, "adamData", void 0);
class MachineDataItemDto {
    machineId;
    machineName;
    timestamp;
    data;
}
exports.MachineDataItemDto = MachineDataItemDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Machine ID must be a valid string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Machine ID cannot be empty' }),
    (0, class_validator_1.Length)(1, 50, { message: 'Machine ID must be between 1 and 50 characters' }),
    __metadata("design:type", String)
], MachineDataItemDto.prototype, "machineId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Machine name must be a valid string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Machine name cannot be empty' }),
    (0, class_validator_1.Length)(1, 100, { message: 'Machine name must be between 1 and 100 characters' }),
    __metadata("design:type", String)
], MachineDataItemDto.prototype, "machineName", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Timestamp must be a valid ISO date string' }),
    (0, class_transformer_1.Transform)(({ value }) => new Date(value).toISOString(), { toClassOnly: true }),
    __metadata("design:type", String)
], MachineDataItemDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ message: 'Machine data must be a valid object' }),
    (0, class_transformer_1.Type)(() => MachineDataValueDto),
    __metadata("design:type", MachineDataValueDto)
], MachineDataItemDto.prototype, "data", void 0);
class EdgeGatewayDataDto {
    edgeGatewayId;
    timestamp;
    data;
}
exports.EdgeGatewayDataDto = EdgeGatewayDataDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Edge Gateway ID must be a valid string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Edge Gateway ID cannot be empty' }),
    (0, class_validator_1.Length)(1, 50, { message: 'Edge Gateway ID must be between 1 and 50 characters' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]+$/, { message: 'Edge Gateway ID can only contain letters, numbers, hyphens, and underscores' }),
    __metadata("design:type", String)
], EdgeGatewayDataDto.prototype, "edgeGatewayId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Timestamp must be a valid ISO date string' }),
    (0, class_transformer_1.Transform)(({ value }) => new Date(value).toISOString(), { toClassOnly: true }),
    __metadata("design:type", String)
], EdgeGatewayDataDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Data must be an array of machine data items' }),
    (0, class_validator_1.ValidateNested)({ each: true, message: 'Each data item must be a valid machine data object' }),
    (0, class_transformer_1.Type)(() => MachineDataItemDto),
    (0, class_transformer_1.Transform)(({ value }) => Array.isArray(value) ? value : [], { toClassOnly: true }),
    __metadata("design:type", Array)
], EdgeGatewayDataDto.prototype, "data", void 0);
//# sourceMappingURL=edge-gateway-data.dto.js.map