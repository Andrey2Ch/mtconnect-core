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
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const external_api_controller_1 = require("./controllers/external-api.controller");
const monitoring_controller_1 = require("./controllers/monitoring.controller");
const test_database_controller_1 = require("./controllers/test-database.controller");
const data_processing_service_1 = require("./services/data-processing.service");
const data_events_gateway_1 = require("./gateways/data-events.gateway");
const alerting_service_1 = require("./services/alerting.service");
const machine_data_schema_1 = require("./schemas/machine-data.schema");
const machine_configuration_schema_1 = require("./schemas/machine-configuration.schema");
const machine_state_schema_1 = require("./schemas/machine-state.schema");
const aggregated_data_schema_1 = require("./schemas/aggregated-data.schema");
const sanitization_service_1 = require("./services/sanitization.service");
const winston_logger_service_1 = require("./services/winston-logger.service");
const metrics_service_1 = require("./services/metrics.service");
const logging_interceptor_1 = require("./interceptors/logging.interceptor");
const metrics_interceptor_1 = require("./interceptors/metrics.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect', {
                maxPoolSize: 50,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
                retryWrites: true,
                writeConcern: { w: 'majority' },
            }),
            mongoose_1.MongooseModule.forFeature([
                { name: machine_data_schema_1.MachineData.name, schema: machine_data_schema_1.MachineDataSchema },
                { name: machine_configuration_schema_1.MachineConfiguration.name, schema: machine_configuration_schema_1.MachineConfigurationSchema },
                { name: machine_state_schema_1.MachineState.name, schema: machine_state_schema_1.MachineStateSchema },
                { name: aggregated_data_schema_1.AggregatedData.name, schema: aggregated_data_schema_1.AggregatedDataSchema },
            ]),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 20,
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            nestjs_prometheus_1.PrometheusModule.register({
                path: '/api/monitoring/metrics',
                defaultMetrics: {
                    enabled: true,
                    config: {
                        prefix: 'mtconnect_cloud_',
                    },
                },
            }),
        ],
        controllers: [
            external_api_controller_1.ExternalApiController,
            monitoring_controller_1.MonitoringController,
            test_database_controller_1.TestDatabaseController,
        ],
        providers: [
            core_1.Reflector,
            sanitization_service_1.SanitizationService,
            winston_logger_service_1.WinstonLoggerService,
            metrics_service_1.MetricsService,
            data_processing_service_1.DataProcessingService,
            data_events_gateway_1.DataEventsGateway,
            alerting_service_1.AlertingService,
            ...metrics_service_1.metricsProviders,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: metrics_interceptor_1.MetricsInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map