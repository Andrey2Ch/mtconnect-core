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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterController = void 0;
const common_1 = require("@nestjs/common");
const counter_service_1 = require("../services/counter.service");
const machine_counter_dto_1 = require("../dto/machine-counter.dto");
let CounterController = class CounterController {
    constructor(counterService) {
        this.counterService = counterService;
    }
    async create(dto) {
        return this.counterService.create(dto);
    }
    async list(machineId, from, to) {
        return this.counterService.find(machineId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
    }
};
exports.CounterController = CounterController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [machine_counter_dto_1.MachineCounterDto]),
    __metadata("design:returntype", Promise)
], CounterController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('machineId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CounterController.prototype, "list", null);
exports.CounterController = CounterController = __decorate([
    (0, common_1.Controller)('counters'),
    __metadata("design:paramtypes", [counter_service_1.CounterService])
], CounterController);
//# sourceMappingURL=counter.controller.js.map