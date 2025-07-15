import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ExternalApiController } from "./controllers/external-api.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { AnalyticsController } from './controllers/analytics.controller';
import { EdgeDataController } from "./edge-data/edge-data.controller";
import { MachineData, MachineDataSchema } from "./schemas/machine-data.schema";
import { SanitizationService } from "./services/sanitization.service";
import { WinstonLoggerService } from "./services/winston-logger.service";
import { MetricsService } from "./services/metrics.service";
import { MachineStateService } from './services/machine-state.service';
import { CycleAnalysisService } from './services/cycle-analysis.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || "mongodb://localhost:27017/mtconnect"),
    MongooseModule.forFeature([{ name: MachineData.name, schema: MachineDataSchema }])
  ],
  controllers: [AppController, ExternalApiController, DashboardController, AnalyticsController, EdgeDataController],
  providers: [
    AppService,
    SanitizationService,
    WinstonLoggerService,
    MetricsService,
    CycleAnalysisService,
    MachineStateService
  ],
  exports: [CycleAnalysisService, MachineStateService]
})
export class AppModule {}
