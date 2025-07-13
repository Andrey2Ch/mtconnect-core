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
exports.EdgeGatewayDataDto = exports.MachineDataItemDto = exports.MachineDataValueDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class MachineDataValueDto {
}
exports.MachineDataValueDto = MachineDataValueDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MachineDataValueDto.prototype, "partCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MachineDataValueDto.prototype, "cycleTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "executionStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "availability", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "program", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "block", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataValueDto.prototype, "line", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], MachineDataValueDto.prototype, "adamData", void 0);
class MachineDataItemDto {
}
exports.MachineDataItemDto = MachineDataItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataItemDto.prototype, "machineId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MachineDataItemDto.prototype, "machineName", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MachineDataItemDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MachineDataValueDto),
    __metadata("design:type", MachineDataValueDto)
], MachineDataItemDto.prototype, "data", void 0);
class EdgeGatewayDataDto {
}
exports.EdgeGatewayDataDto = EdgeGatewayDataDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EdgeGatewayDataDto.prototype, "edgeGatewayId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EdgeGatewayDataDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MachineDataItemDto),
    __metadata("design:type", Array)
], EdgeGatewayDataDto.prototype, "data", void 0);
//# sourceMappingURL=edge-gateway-data.dto.js.map