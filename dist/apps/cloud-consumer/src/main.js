"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('CloudConsumer');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    app.connectMicroservice({
        transport: microservices_1.Transport.MQTT,
        options: {
            url: mqttUrl,
            subscribeOptions: {
                qos: 1,
            },
        },
    });
    await app.startAllMicroservices();
    const port = process.env.PORT || 3002;
    await app.listen(port);
    logger.log(`Cloud Consumer is running on port ${port}`);
    logger.log(`MQTT broker: ${mqttUrl}`);
    logger.log(`MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/mtconnect'}`);
}
bootstrap().catch((error) => {
    console.error('Failed to start Cloud Consumer:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map