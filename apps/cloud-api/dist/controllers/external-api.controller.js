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
exports.ExternalApiController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const machine_data_schema_1 = require("../schemas/machine-data.schema");
let ExternalApiController = class ExternalApiController {
    constructor(machineDataModel) {
        this.machineDataModel = machineDataModel;
        this.logger = new common_1.Logger('ExternalAPI');
    }
    async receiveData(payload) {
        try {
            const dataArray = Array.isArray(payload) ? payload : [payload];
            this.logger.log(`📡 Получены данные от Edge Gateway: ${dataArray.length} записей`);
            dataArray.forEach((item) => {
                this.logger.log(`🔧 ${item.metadata.machineId}: partCount=${item.data.partCount}, program=${item.data.program}, status=${item.data.executionStatus}`);
            });
            const savedRecords = await this.machineDataModel.insertMany(dataArray);
            this.logger.log(`💾 Сохранено в MongoDB: ${savedRecords.length} записей`);
            return {
                success: true,
                message: `Processed ${dataArray.length} machine data records`,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            this.logger.error(`❌ Ошибка обработки данных: ${error.message}`);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
};
exports.ExternalApiController = ExternalApiController;
__decorate([
    (0, common_1.Post)('/data'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExternalApiController.prototype, "receiveData", null);
exports.ExternalApiController = ExternalApiController = __decorate([
    (0, common_1.Controller)('api/ext'),
    __param(0, (0, mongoose_1.InjectModel)(machine_data_schema_1.MachineData.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ExternalApiController);
//# sourceMappingURL=external-api.controller.js.map