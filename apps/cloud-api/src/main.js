"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
async function bootstrap() {
    const logger = new common_1.Logger('CloudAPI');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'), {
        prefix: '/dashboard/',
    });
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'));
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 Cloud API running on port ${port}`);
    logger.log(`📊 Dashboard: http://localhost:${port}/dashboard/index.html`);
    logger.log(`🆕 NEW Dashboard: http://localhost:${port}/dashboard-new.html`);
    logger.log(`📡 API Health: http://localhost:${port}/health`);
}
bootstrap();
//# sourceMappingURL=main.js.map