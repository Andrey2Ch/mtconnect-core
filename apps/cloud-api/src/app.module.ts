import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ExternalApiController } from "./controllers/external-api.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { MachineData, MachineDataSchema } from "./schemas/machine-data.schema";
import { SanitizationService } from "./services/sanitization.service";
import { WinstonLoggerService } from "./services/winston-logger.service";
import { MetricsService } from "./services/metrics.service";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || "mongodb://localhost:27017/mtconnect"),
    MongooseModule.forFeature([{ name: MachineData.name, schema: MachineDataSchema }])
  ],
  controllers: [AppController, ExternalApiController, DashboardController],
  providers: [AppService, SanitizationService, WinstonLoggerService, MetricsService],
})
export class AppModule {}
