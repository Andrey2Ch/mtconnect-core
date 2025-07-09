import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Статические файлы для дашборда
  const publicPath = path.join(__dirname, '..', 'public');
  app.use('/static', express.static(publicPath));
  
  // Security Headers with Helmet
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isHttps = process.env.FORCE_HTTPS === 'true' || !isDevelopment;
  
  app.use(helmet({
    // Content Security Policy - настроено для дашборда
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      },
    },
    
    // Cross-Origin Embedder Policy - disabled for API compatibility
    crossOriginEmbedderPolicy: false,
    
    // HSTS - only enable for HTTPS in production
    hsts: isHttps ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false,
    
    // No sniff - prevent MIME type sniffing
    noSniff: true,
    
    // X-Frame-Options - prevent clickjacking
    frameguard: { action: 'deny' },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // Referrer Policy
    referrerPolicy: { policy: 'no-referrer' },
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Origin Agent Cluster
    originAgentCluster: true,
  }));

  // CORS Configuration
  const allowedOrigins = isDevelopment 
    ? [
        'http://localhost:3000',    // React dev server
        'http://localhost:5173',   // Vite dev server
        'http://localhost:8080',   // Vue dev server
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080'
      ]
    : [
        process.env.FRONTEND_URL || 'https://mtconnect-dashboard.com',
        process.env.ADDITIONAL_ORIGIN_1,
        process.env.ADDITIONAL_ORIGIN_2
      ].filter(Boolean); // Remove undefined values

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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
    credentials: true, // Allow cookies and auth headers
    preflightContinue: false,
    optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 204
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      forbidUnknownValues: true, // Throw error for unknown values
      skipMissingProperties: false, // Validate missing properties
      validationError: {
        target: false, // Don't expose target object in error
        value: false, // Don't expose value in error
      },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map(error => ({
          field: error.property,
          value: error.value,
          issues: Object.values(error.constraints || {}),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
          statusCode: 400,
        });
      },
    })
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 MTConnect Cloud API running on port ${port}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  Security: Helmet configured for API protection`);
  console.log(`🔒 HTTPS: ${isHttps ? 'Enabled (HSTS active)' : 'Development mode (HSTS disabled)'}`);
  console.log(`🌐 CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);
}

bootstrap();
