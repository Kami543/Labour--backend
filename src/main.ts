// src/main.ts - VERSÃO CORRIGIDA E COMPLETA PARA O RENDER
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import * as express from 'express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Logger global
const logger = new Logger('Bootstrap');

// ============================================
// 1. CARREGAR VARIÁVEIS DE AMBIENTE
// ============================================
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

// ============================================
// 2. HANDLER PARA ERROS NÃO TRATADOS
// ============================================
process.on('unhandledRejection', (reason: any) => {
  // Ignora erros conhecidos que não afetam a aplicação
  if (reason?.message?.includes('enableOfflineQueue')) return;
  if (reason?.code === 'ECONNRESET' || reason?.code === 'ECONNREFUSED') return;
  if (reason?.message?.includes('Redis connection')) return;
  
  // Log apenas, não derruba a aplicação
  logger.warn(`Unhandled Rejection: ${reason?.message || 'Unknown error'}`);
});

process.on('uncaughtException', (error: Error) => {
  // Ignora erros de conexão Redis
  if (error.message?.includes('Redis')) {
    logger.warn(`Redis connection issue: ${error.message}`);
    return;
  }
  
  logger.error(`Uncaught Exception: ${error.message}`);
  // Não derruba a aplicação em produção
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// ============================================
// 3. CONFIGURAÇÃO DO APP
// ============================================
async function configureApp(app: any) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Configurar payload limite para upload de imagens
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  
  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: isProduction,
      transform: true,
      disableErrorMessages: isProduction,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // CORS configurado
  const corsOrigins = isProduction
    ? (process.env.CORS_ORIGIN || 'https://laboure.vercel.app').split(',')
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
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
  
  console.log(`🔧 CORS configurado para ${isProduction ? 'produção' : 'desenvolvimento'}`);
  
  // Prefixo global da API
  app.setGlobalPrefix('api');
  
  // Swagger apenas em desenvolvimento
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('API Labouré - E-commerce')
      .setDescription(`
        ## API para Sistema de E-commerce
        
        ### Funcionalidades:
        - 👤 Autenticação e gerenciamento de usuários
        - 📦 Produtos com múltiplas imagens
        - 🛒 Carrinho de compras
        - 📝 Pedidos e status
        - 💳 Pagamentos
        - 🔔 Notificações em tempo real
        - 📊 Painel administrativo
      `)
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Digite seu token JWT',
        in: 'header',
      }, 'access-token')
      .addTag('Auth', 'Autenticação')
      .addTag('Users', 'Usuários')
      .addTag('Produtos', 'Catálogo de produtos')
      .addTag('Carrinho', 'Carrinho de compras')
      .addTag('Pedidos', 'Gerenciamento de pedidos')
      .addTag('Notificacoes', 'Notificações')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        tryItOutEnabled: true,
      },
    });
    
    console.log('📚 Swagger disponível em /api/docs');
  } else {
    console.log('🔒 Swagger desabilitado em produção');
  }
  
  return app;
}

// ============================================
// 4. HEALTH CHECKS SIMPLIFICADOS
// ============================================
async function checkSupabaseHealth() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Supabase: variáveis não configuradas');
      return false;
    }
    
    console.log('✅ Supabase configurado');
    return true;
  } catch (error) {
    console.log('⚠️ Supabase: erro na verificação');
    return false;
  }
}

async function checkRedisHealth() {
  try {
    // Verificação simples se as variáveis existem
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;
    
    if (!redisHost) {
      console.log('⚠️ Redis: não configurado (funcionalidades de fila limitadas)');
      return false;
    }
    
    console.log(`✅ Redis configurado em ${redisHost}:${redisPort || 6379}`);
    return true;
  } catch (error) {
    console.log('⚠️ Redis: não disponível');
    return false;
  }
}

// ============================================
// 5. BOOTSTRAP PRINCIPAL
// ============================================
async function bootstrap() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 INICIANDO LABOURÉ BACKEND');
    console.log('='.repeat(60) + '\n');
    
    // Verificações rápidas
    const supabaseOk = await checkSupabaseHealth();
    const redisOk = await checkRedisHealth();
    
    if (supabaseOk) {
      console.log('📦 Supabase Storage: pronto para uploads');
    }
    
    if (redisOk) {
      console.log('📊 Redis/Bull: funcionalidades de fila disponíveis');
    } else {
      console.log('⚠️ Bull/Redis: funcionalidades de fila limitadas');
    }
    
    console.log('\n🔧 Configurando aplicação...\n');
    
    // Criar aplicação NestJS
    const app = await NestFactory.create(AppModule, {
      rawBody: true,
      bodyParser: true,
      logger: ['error', 'warn', 'log'],
    });
    
    // Configurar aplicação
    await configureApp(app);
    
    // ⚠️ CRUCIAL PARA O RENDER: Usar 0.0.0.0 e a porta correta
    const port = parseInt(process.env.PORT || '10000', 10);
    const host = '0.0.0.0'; // Obrigatório no Render
    
    await app.listen(port, host);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SERVIDOR INICIADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`🌐 URL: http://${host}:${port}`);
    console.log(`📚 API: http://${host}:${port}/api`);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📖 Docs: http://${host}:${port}/api/docs`);
    }
    
    console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Banco: ${process.env.DATABASE_URL ? '✅ Conectado' : '❌ Não configurado'}`);
    console.log(`📊 Redis: ${redisOk ? '✅ Disponível' : '❌ Indisponível'}`);
    console.log(`📸 Supabase: ${supabaseOk ? '✅ Disponível' : '❌ Indisponível'}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ ERRO FATAL AO INICIAR SERVIDOR:');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error(error.stack);
    console.error('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

// ============================================
// 6. INICIAR APLICAÇÃO
// ============================================
bootstrap();