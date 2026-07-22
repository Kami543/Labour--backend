// src/main.ts
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
  console.log(`📂 Diretório atual: ${process.cwd()}`);
  
  // Verifica se há arquivos .env
  try {
    const files = fs.readdirSync(process.cwd());
    console.log(`📂 Arquivos encontrados: ${files.filter(f => f.includes('.env')).join(', ') || 'Nenhum .env'}`);
  } catch (e) {
    console.log('Não foi possível listar arquivos');
  }

  // Carrega .env se existir (prioridade: .env.prod > .env)
  const envFiles = ['.env.prod', '.env'];
  for (const envFile of envFiles) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`✅ Carregado: ${envFile}`);
      break;
    }
  }

  console.log(`🔧 Ambiente: ${process.env.NODE_ENV?.toUpperCase() || 'DESENVOLVIMENTO'}`);
  console.log(`🔌 Porta: ${process.env.PORT || '10000'}`);
  console.log(`🗄️ DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
  console.log(`📦 REDIS_HOST: ${process.env.REDIS_HOST ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
  console.log(`📦 REDIS_URL: ${process.env.REDIS_URL ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
}

// Carrega ambiente ANTES de qualquer outra coisa
loadEnvironment();

// Tratamento de erros mais robusto
process.on('unhandledRejection', (reason: any) => {
  const message = reason?.message || 'Unknown error';
  const code = reason?.code || '';
  
  // Ignora erros de Redis/Bull em produção
  if (message.includes('Redis') || message.includes('Bull') || 
      code === 'ECONNRESET' || code === 'ECONNREFUSED') {
    logger.warn(`⚠️ Erro de conexão ignorado: ${message}`);
    return;
  }
  
  logger.error(`❌ Unhandled Rejection: ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(reason);
  }
});

process.on('uncaughtException', (error: Error) => {
  const message = error.message || '';
  
  // Ignora erros de Redis em produção
  if (message.includes('Redis') || message.includes('Bull')) {
    logger.warn(`⚠️ Erro de Redis ignorado: ${message}`);
    return;
  }
  
  logger.error(`❌ Uncaught Exception: ${message}`);
  logger.error(error.stack);
  
  // Em produção, NÃO derruba o processo
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

async function bootstrap() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 INICIANDO LABOURÉ BACKEND');
    console.log('='.repeat(60) + '\n');

    const isProduction = process.env.NODE_ENV === 'production';
    const port = parseInt(process.env.PORT || '10000', 10);

    console.log(`📌 Configurações:`);
    console.log(`  - Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
    console.log(`  - Porta: ${port}`);
    console.log(`  - Database: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
    console.log(`  - Redis: ${process.env.REDIS_HOST ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
    console.log(`  - Upstash: ${process.env.REDIS_URL?.includes('upstash') ? '✅' : '❌'}`);

    // Cria a aplicação com tratamento de erro
    console.log('🔄 Criando aplicação NestJS...');
    const app = await NestFactory.create(AppModule, {
      rawBody: true,
      bodyParser: true,
      logger: isProduction ? ['error', 'warn'] : ['error', 'warn', 'log', 'debug'],
    });
    console.log('✅ Aplicação criada');

    // Middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Validação
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: isProduction,
        transform: true,
        disableErrorMessages: isProduction,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // CORS
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

    // Swagger apenas em desenvolvimento
    if (!isProduction) {
      console.log('📚 Configurando Swagger...');
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
      console.log('✅ Swagger disponível em /api/v1/docs');
    }

    // Inicia o servidor
    console.log(`🚀 Iniciando servidor na porta ${port}...`);
    await app.listen(port, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log(`✅ Servidor iniciado na porta ${port}`);
      console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Banco: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`📦 Redis: ${process.env.REDIS_HOST ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`🌐 URL: http://localhost:${port}`);
      console.log('='.repeat(60) + '\n');
    });

  } catch (error: any) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error(error.stack);
    
    // Em produção, tenta manter o processo vivo
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Tentando manter o processo vivo mesmo com erro...');
      // Aguarda 10 segundos e tenta reiniciar
      setTimeout(() => {
        console.log('🔄 Reiniciando aplicação...');
        bootstrap();
      }, 10000);
    } else {
      process.exit(1);
    }
  }
}

// Inicia a aplicação
bootstrap().catch((error) => {
  console.error('❌ Falha no bootstrap:', error);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});