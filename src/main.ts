import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import * as express from 'express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const logger = new Logger('Bootstrap');

function loadEnvironment() {
  const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
  const envPath = path.resolve(process.cwd(), envFile);
  const defaultEnvPath = path.resolve(process.cwd(), '.env');

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Carregado: ${envFile}`);
  } else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log(`⚠️ Usando .env padrão`);
  } else {
    dotenv.config();
    console.log(`📝 Usando variáveis do sistema`);
  }

  console.log(`🔧 Ambiente: ${process.env.NODE_ENV?.toUpperCase() || 'DESENVOLVIMENTO'}`);
}

loadEnvironment();

process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('enableOfflineQueue')) return;
  if (reason?.code === 'ECONNRESET' || reason?.code === 'ECONNREFUSED') return;
  if (reason?.message?.includes('Redis')) return;
  logger.warn(`Unhandled Rejection: ${reason?.message || 'Unknown error'}`);
});

process.on('uncaughtException', (error: Error) => {
  if (error.message?.includes('Redis')) {
    logger.warn(`Redis connection issue: ${error.message}`);
    return;
  }
  logger.error(`Uncaught Exception: ${error.message}`);
  if (process.env.NODE_ENV !== 'production') process.exit(1);
});

async function bootstrap() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 INICIANDO LABOURÉ BACKEND');
    console.log('='.repeat(60) + '\n');

    const isProduction = process.env.NODE_ENV === 'production';

    const app = await NestFactory.create(AppModule, {
      rawBody: true,
      bodyParser: true,
      logger: isProduction ? ['error', 'warn'] : ['error', 'warn', 'log'],
    });

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: isProduction,
        transform: true,
        disableErrorMessages: isProduction,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    const corsOrigins = isProduction
      ? (process.env.CORS_ORIGIN || 'https://laboure.vercel.app').split(',')
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:3000',
          'https://laboure.vercel.app',
        ];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    app.setGlobalPrefix('api/v1');

    if (!isProduction) {
      const config = new DocumentBuilder()
        .setTitle('API Labouré')
        .setDescription('API para Sistema de E-commerce Labouré')
        .setVersion('1.0')
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
          'access-token',
        )
        .addTag('Auth', 'Autenticação')
        .addTag('Users', 'Usuários')
        .addTag('Produtos', 'Catálogo de produtos')
        .addTag('Carrinho', 'Carrinho de compras')
        .addTag('Pedidos', 'Gerenciamento de pedidos')
        .addTag('Notificacoes', 'Notificações')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/v1/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          docExpansion: 'none',
          filter: true,
        },
      });

      console.log('📚 Swagger disponível em /api/v1/docs');
    }

    const port = parseInt(process.env.PORT || '10000', 10);
    await app.listen(port, '0.0.0.0');

    console.log('='.repeat(60));
    console.log(`✅ Servidor iniciado na porta ${port}`);
    console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Banco: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

bootstrap();