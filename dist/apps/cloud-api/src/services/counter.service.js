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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_counter_schema_1 = require("../schemas/machine-counter.schema");
let CounterService = class CounterService {
    constructor(counterModel) {
        this.counterModel = counterModel;
    }
    async create(dto) {
        return this.counterModel.create({ ...dto, timestamp: dto.timestamp ?? new Date() });
    }
    async find(machineId, from, to) {
        const filter = {};
        if (machineId)
            filter.machineId = machineId;
        if (from || to)
            filter.timestamp = {};
        if (from)
            filter.timestamp.$gte = from;
        if (to)
            filter.timestamp.$lte = to;
        return this.counterModel.find(filter).sort({ timestamp: -1 }).lean();
    }
};
exports.CounterService = CounterService;
exports.CounterService = CounterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(machine_counter_schema_1.MachineCounter.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], CounterService);
//# sourceMappingURL=counter.service.js.map