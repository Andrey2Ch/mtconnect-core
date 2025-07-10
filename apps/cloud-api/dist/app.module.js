"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const external_api_controller_1 = require("./controllers/external-api.controller");
const machine_data_schema_1 = require("./schemas/machine-data.schema");
const sanitization_service_1 = require("./services/sanitization.service");
const winston_logger_service_1 = require("./services/winston-logger.service");
const metrics_service_1 = require("./services/metrics.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI || "mongodb://localhost:27017/mtconnect"),
            mongoose_1.MongooseModule.forFeature([{ name: machine_data_schema_1.MachineData.name, schema: machine_data_schema_1.MachineDataSchema }])
        ],
        controllers: [app_controller_1.AppController, external_api_controller_1.ExternalApiController],
        providers: [app_service_1.AppService, sanitization_service_1.SanitizationService, winston_logger_service_1.WinstonLoggerService, metrics_service_1.MetricsService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map