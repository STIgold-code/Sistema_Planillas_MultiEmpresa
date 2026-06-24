// CRITICO: Sentry debe importarse ANTES que cualquier otro modulo
// para que la instrumentacion automatica tome efecto.
import './sentry/instrument';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // SEGURIDAD: Headers de seguridad con Helmet
  const isDev = process.env.NODE_ENV !== 'production';
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // En desarrollo, permitir scripts inline para Swagger UI
          scriptSrc: isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Necesario para cargar imágenes externas
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permitir carga cross-origin de archivos
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  );

  // SEGURIDAD: Los archivos estáticos se sirven a través del FilesController
  // con autenticación JWT. NO usar app.useStaticAssets() porque expone
  // archivos sin control de acceso.
  // Ver: /api/files/local/:key (protegido) y /api/files/public/:key (público)

  // Habilitar CORS para el frontend
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // Agregar URL del frontend en producción si está definida
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  // Agregar dominio de Railway automáticamente
  if (process.env.RAILWAY_SERVICE_FRONTEND_APP_URL) {
    const railwayFrontend = process.env.RAILWAY_SERVICE_FRONTEND_APP_URL;
    // Agregar con y sin https://
    if (!railwayFrontend.startsWith('http')) {
      allowedOrigins.push(`https://${railwayFrontend}`);
    } else {
      allowedOrigins.push(railwayFrontend);
    }
  }

  // URL adicional para Railway (dominio por defecto)
  if (process.env.FRONTEND_URL_RAILWAY) {
    allowedOrigins.push(process.env.FRONTEND_URL_RAILWAY);
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Empresa-Activa',
    ],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // Aumentar límite de body para importaciones masivas (ej: importar tareo Excel)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb' });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Validación global con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('RRHH-Ermir API')
      .setDescription(
        'API de gestión de Recursos Humanos con soporte multi-empresa. ' +
          'Incluye módulos de empleados, contratos, planillas, vacaciones, tareo y más.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Ingrese el token JWT',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Autenticación y gestión de sesiones')
      .addTag('users', 'Gestión de usuarios del sistema')
      .addTag('roles', 'Gestión de roles y permisos')
      .addTag('companies', 'Gestión de empresas')
      .addTag('empleados', 'Gestión de empleados')
      .addTag('contratos', 'Gestión de contratos laborales')
      .addTag('planillas', 'Gestión de planillas y nóminas')
      .addTag('vacaciones', 'Gestión de vacaciones')
      .addTag('tareo', 'Control de asistencia')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
    logger.log(
      `Swagger docs available at http://localhost:${process.env.PORT ?? 4001}/api/docs`,
    );
  }

  const port = process.env.PORT ?? 4001;
  await app.listen(port);
  logger.log(`Backend running on http://localhost:${port}/api`);
}
void bootstrap();
