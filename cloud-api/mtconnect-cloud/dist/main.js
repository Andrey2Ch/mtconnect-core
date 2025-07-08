"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const helmet_1 = require("helmet");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isHttps = process.env.FORCE_HTTPS === 'true' || !isDevelopment;
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        hsts: isHttps ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        } : false,
        noSniff: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        referrerPolicy: { policy: 'no-referrer' },
        dnsPrefetchControl: { allow: false },
        originAgentCluster: true,
    }));
    const allowedOrigins = isDevelopment
        ? [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:8080'
        ]
        : [
            process.env.FRONTEND_URL || 'https://mtconnect-dashboard.com',
            process.env.ADDITIONAL_ORIGIN_1,
            process.env.ADDITIONAL_ORIGIN_2
        ].filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not allowed by CORS policy`));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-API-Key',
            'X-Requested-With',
            'Accept',
            'Origin'
        ],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        skipMissingProperties: false,
        validationError: {
            target: false,
            value: false,
        },
        exceptionFactory: (errors) => {
            const formattedErrors = errors.map(error => ({
                field: error.property,
                value: error.value,
                issues: Object.values(error.constraints || {}),
            }));
            return new common_1.BadRequestException({
                message: 'Validation failed',
                errors: formattedErrors,
                statusCode: 400,
            });
        },
    }));
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 MTConnect Cloud API running on port ${port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛡️  Security: Helmet configured for API protection`);
    console.log(`🔒 HTTPS: ${isHttps ? 'Enabled (HSTS active)' : 'Development mode (HSTS disabled)'}`);
    console.log(`🌐 CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);
}
bootstrap();
//# sourceMappingURL=main.js.map