// ⚠️ IMPORTANTE: Handler de unhandledRejection deve ser a PRIMEIRA coisa
process.on('unhandledRejection', (reason: any) => {
  // Captura erros específicos do Redis e impede crash
  if (reason?.code === 'ECONNRESET' || 
      reason?.code === 'ECONNREFUSED' || 
      reason?.message?.includes('ECONNRESET') ||
      reason?.message?.includes('ECONNREFUSED')) {
    console.warn(`⚠️ Redis connection error suppressed: ${reason.code || reason.message}`);
    return;
  }
  
  // Log de outros erros não tratados
  console.error('❌ Unhandled rejection:', reason);
  
  // Opcional: logging em arquivo para debug
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const errorLog = `[${new Date().toISOString()}] ${reason?.stack || reason}\n`;
    fs.appendFileSync('unhandled-rejection.log', errorLog);
  }
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';

let cachedServer: any;

// Função para carregar .env
function loadEnvironment() {
  const isProdCommand = process.env.npm_lifecycle_event === 'start:prod' ||
                        process.argv.some(arg => arg.includes('dist/main')) ||
                        process.argv[1]?.includes('dist/main');
  
  const isDevCommand = process.env.npm_lifecycle_event === 'start:dev' ||
                       process.argv.some(arg => arg.includes('--watch')) ||
                       process.argv[1]?.includes('src/main');
  
  if (!process.env.NODE_ENV) {
    if (isProdCommand) {
      process.env.NODE_ENV = 'production';
    } else if (isDevCommand) {
      process.env.NODE_ENV = 'development';
    } else {
      process.env.NODE_ENV = 'development';
    }
  }
  
  const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
  const envPath = path.resolve(process.cwd(), envFile);
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Carregado configurações de ${envFile}`);
  } else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log(`⚠️ ${envFile} não encontrado, usando .env padrão`);
  } else {
    dotenv.config();
    console.log(`📝 Usando variáveis de ambiente do sistema`);
  }
  
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV?.toUpperCase() || 'DESENVOLVIMENTO'}`);
}

loadEnvironment();

async function configureApp(app: any) {
  const environment = process.env.NODE_ENV;
  const isProduction = environment === 'production';
  
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
  if (isProduction) {
    const corsOrigin = process.env.CORS_ORIGIN || 'https://laboure.vercel.app';
    app.enableCors({
      origin: corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    console.log(`🔒 CORS configurado para produção: ${corsOrigin}`);
  } else {
    app.enableCors({
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://aetxtjypdzwkniuvluwr.supabase.co',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    console.log('🔓 CORS configurado para desenvolvimento');
  }

  app.setGlobalPrefix('api');

  // Swagger apenas em desenvolvimento
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Documentação da API - Labouré')
      .setDescription(`
        ## Documentação da API para Sistema de E-commerce

        ### Funcionalidades:
        - Gerenciamento de usuários (autenticação, perfil)
        - Gerenciamento de produtos (operações CRUD) com **múltiplas imagens**
        - Upload de imagens via **Supabase Storage**
        - Operações de carrinho de compras
        - Processamento de pedidos
        - Integração de pagamento
        - Sistema de notificações
        - **Processamento assíncrono com Bull/Redis**
        
        ### Filas disponíveis:
        - 💳 **payment** - Processamento de pagamentos
        - 📧 **email** - Envio de emails
        - 🔔 **notification** - Notificações push
        - 🛡️ **fraud-check** - Análise antifraude
        - 📦 **order-processing** - Processamento de pedidos
        - 📊 **inventory** - Controle de estoque
        
        ### Upload de imagens:
        - Produtos suportam múltiplas imagens
        - Upload via Supabase Storage
        - Formatos: JPEG, PNG, WEBP
        - Tamanho máximo: 5MB por imagem
      `)
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Digite o token JWT',
        in: 'header',
      }, 'access-token')
      .addTag('Auth', 'Endpoints de autenticação')
      .addTag('Users', 'Gerenciamento de usuários')
      .addTag('Produtos', 'Catálogo de produtos (suporta múltiplas imagens)')
      .addTag('Upload', 'Upload de imagens para Supabase Storage')
      .addTag('Carrinho', 'Carrinho de compras')
      .addTag('Pedidos', 'Gerenciamento de pedidos')
      .addTag('Pagamento', 'Processamento de pagamento')
      .addTag('Notificacoes', 'Notificações do usuário')
      .addTag('Queue', 'Monitoramento de filas Bull')
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

// Health check para Bull/Redis
async function checkBullHealth() {
  const logger = new Logger('BullHealth');
  try {
    const Redis = require('ioredis');
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
    const isProduction = process.env.NODE_ENV === 'production';
    
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: redisPort,
      password: process.env.REDIS_PASSWORD,
      tls: isProduction ? { rejectUnauthorized: false } : undefined,
      retryStrategy: () => null,
      lazyConnect: true,
      connectTimeout: 5000,
    });
    
    await redis.connect();
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      logger.log('✅ Redis conectado - Bull operacional');
      await redis.quit();
      return true;
    }
  } catch (error: any) {
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      logger.warn(`⚠️ Redis não disponível: ${error.code}`);
    } else {
      logger.error(`❌ Redis/Bull health check falhou: ${error.message}`);
    }
    return false;
  }
  return false;
}

// Health check para Supabase
async function checkSupabaseHealth() {
  const logger = new Logger('SupabaseHealth');
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('⚠️ Supabase não configurado - variáveis de ambiente faltando');
      return false;
    }
    
    logger.log('✅ Supabase configurado');
    return true;
  } catch (error: any) {
    logger.error(`❌ Supabase health check falhou: ${error.message}`);
    return false;
  }
}

// Handler para Vercel
export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, adapter, {
      rawBody: true,
    });
    
    await configureApp(app);
    await app.init();
    cachedServer = expressApp;
    console.log('✅ Serverless handler inicializado');
  }
  
  cachedServer(req, res);
}

// Bootstrap local com Bull e Supabase
async function bootstrapLocal() {
  const logger = new Logger('Bootstrap');
  
  console.log('\n🚀 Iniciando aplicação Labouré...\n');
  
  // Verificar Redis/Bull
  const bullHealthy = await checkBullHealth();
  if (!bullHealthy) {
    logger.warn('⚠️ Bull/Redis não disponível - funcionalidades de fila limitadas');
    console.log('   Verifique se o Redis está rodando: docker compose up -d redis\n');
  } else {
    logger.log('🚀 Bull/Redis inicializado e pronto para processar filas');
  }
  
  // Verificar Supabase
  const supabaseHealthy = await checkSupabaseHealth();
  if (!supabaseHealthy) {
    logger.warn('⚠️ Supabase não configurado - upload de imagens desabilitado');
    console.log('   Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env\n');
  } else {
    logger.log('📦 Supabase Storage inicializado e pronto para uploads');
  }
  
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });
  
  // Configurar limite de payload para upload de imagens
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  
  await configureApp(app);
  
  // Dashboard Bull (opcional em desenvolvimento)
  if (process.env.NODE_ENV !== 'production' && bullHealthy) {
    try {
      const { createBullBoard } = require('@bull-board/api');
      const { BullAdapter } = require('@bull-board/api/bullAdapter');
      const { ExpressAdapter } = require('@bull-board/express');
      
      const serverAdapter = new ExpressAdapter();
      const queues: any[] = [];
      
      const queueNames = ['payment', 'notification', 'email', 'fraud-check', 'order-processing', 'inventory'];
      
      for (const queueName of queueNames) {
        try {
          let queue = null;
          try {
            const { getQueueToken } = require('@nestjs/bull');
            queue = app.get(getQueueToken(queueName));
          } catch (err) {
            const bullModule = require('@nestjs/bull');
            queue = app.get(bullModule.getQueueToken(queueName));
          }
          
          if (queue) {
            queues.push(new BullAdapter(queue));
            console.log(`   📋 Fila "${queueName}" registrada no dashboard`);
          }
        } catch (error) {
          if (process.env.DEBUG === 'true') {
            console.log(`   ⚠️ Fila "${queueName}" não disponível: ${error.message}`);
          }
        }
      }
      
      if (queues.length > 0) {
        createBullBoard({
          queues,
          serverAdapter,
        });
        
        serverAdapter.setBasePath('/admin/queues');
        app.use('/admin/queues', serverAdapter.getRouter());
        logger.log(`📊 Bull Dashboard disponível em /admin/queues (${queues.length} filas)`);
      } else {
        logger.warn('⚠️ Nenhuma fila encontrada para o dashboard');
      }
    } catch (error: any) {
      logger.warn(`⚠️ Não foi possível carregar Bull Dashboard: ${error.message}`);
    }
  }
  
  const portaDesejada = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  await app.listen(portaDesejada);
  
  console.log('\n' + '='.repeat(60));
  logger.log(`🚀 Servidor rodando em http://localhost:${portaDesejada}`);
  logger.log(`📚 Swagger disponível em http://localhost:${portaDesejada}/api/docs`);
  if (process.env.NODE_ENV !== 'production' && bullHealthy) {
    logger.log(`📊 Bull Dashboard em http://localhost:${portaDesejada}/admin/queues`);
  }
  if (supabaseHealthy) {
    logger.log(`📦 Supabase Storage disponível para uploads`);
  }
  console.log('='.repeat(60));
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  console.log(`📦 Banco de dados: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🔄 Bull/Redis: ${bullHealthy ? '✅ Ativo' : '❌ Inativo'}`);
  console.log(`📦 Supabase: ${supabaseHealthy ? '✅ Ativo' : '❌ Inativo'}`);
  
  if (bullHealthy) {
    console.log(`📊 Filas disponíveis: payment, notification, email, fraud-check, order-processing, inventory`);
    console.log(`💡 Dica: Acesse /admin/queues para monitorar as filas`);
  }
  
  if (supabaseHealthy) {
    console.log(`📸 Upload de imagens: Bucket 'produtos-imagens' disponível`);
    console.log(`💡 Dica: Use endpoint POST /api/upload/product/:produtoId para fazer upload`);
  }
  console.log('='.repeat(60) + '\n');
}

// Executa local apenas se não estiver no Vercel
if (process.env.VERCEL !== '1') {
  bootstrapLocal().catch(error => {
    console.error('❌ Erro fatal ao iniciar aplicação:', error);
    process.exit(1);
  });
}