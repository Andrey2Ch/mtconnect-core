"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('EdgeGateway');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    app.connectMicroservice({
        transport: microservices_1.Transport.MQTT,
        options: {
            url: mqttUrl,
        },
    });
    await app.startAllMicroservices();
    const port = process.env.PORT || 3001;
    await app.listen(port);
    logger.log(`Edge Gateway is running on port ${port}`);
    logger.log(`MQTT broker: ${mqttUrl}`);
}
bootstrap().catch((error) => {
    console.error('Failed to start Edge Gateway:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map