"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Включаем валидацию
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    // Включаем CORS для внешних API
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: false,
    });
    // Railway использует переменную PORT
    const port = process.env.PORT || 3000;
    console.log(`🚀 MTConnect Cloud API запущен на порту ${port}`);
    console.log(`📊 Health Check: http://localhost:${port}/api/ext/health`);
    console.log(`📡 Data Endpoint: http://localhost:${port}/api/ext/data`);
    await app.listen(port);
}
bootstrap();
