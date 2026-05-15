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

// 🔥 FUNÇÃO PARA CARREGAR O .env CORRETO BASEADO NO AMBIENTE
function loadEnvironment() {
  // Detecta ambiente pelo comando ou NODE_ENV existente
  const isProdCommand = process.env.npm_lifecycle_event === 'start:prod' ||
                        process.argv.some(arg => arg.includes('dist/main')) ||
                        process.argv[1]?.includes('dist/main');
  
  const isDevCommand = process.env.npm_lifecycle_event === 'start:dev' ||
                       process.argv.some(arg => arg.includes('--watch')) ||
                       process.argv[1]?.includes('src/main');
  
  // Define o ambiente baseado no comando, se não estiver definido
  if (!process.env.NODE_ENV) {
    if (isProdCommand) {
      process.env.NODE_ENV = 'production';
    } else if (isDevCommand) {
      process.env.NODE_ENV = 'development';
    } else {
      process.env.NODE_ENV = 'development'; // fallback
    }
  }
  
  // Tenta carregar o arquivo .env específico do ambiente
  const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
  const envPath = path.resolve(process.cwd(), envFile);
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  
  // Carrega o arquivo específico se existir
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Carregado configurações de ${envFile}`);
  } 
  // Fallback para .env padrão
  else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log(`⚠️  ${envFile} não encontrado, usando .env padrão`);
  }
  else {
    console.log(`⚠️  Nenhum arquivo .env encontrado, usando variáveis do sistema`);
  }
  
  // Valida variáveis essenciais
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET não definido! Use um valor seguro em produção.');
  }
  
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV?.toUpperCase() || 'DESENVOLVIMENTO'}`);
}

// Carrega as variáveis ANTES de qualquer coisa
loadEnvironment();

// Configuração da aplicação (reutilizável)
async function configureApp(app: any) {
  const environment = process.env.NODE_ENV;
  const isProduction = environment === 'production';
  
  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: isProduction, // Mais restrito em produção
      transform: true,
      disableErrorMessages: isProduction, // Esconde detalhes de erro em produção
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 🔥 CONFIGURAÇÃO CORS CORRIGIDA
  if (isProduction) {
    // Produção: apenas domínios específicos
    const corsOrigin = process.env.CORS_ORIGIN || 'https://laboure.vercel.app';
    app.enableCors({
      origin: corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    console.log(`🔒 CORS configurado para produção: ${corsOrigin}`);
  } else {
    // 🔓 Desenvolvimento: configuração completa para localhost
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
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    console.log('🔓 CORS configurado para desenvolvimento:');
    console.log('   - http://localhost:5173');
    console.log('   - http://localhost:3000');
    console.log('   - http://127.0.0.1:5173');
  }

  // Prefixo global da API
  app.setGlobalPrefix('api');

  // Swagger APENAS em desenvolvimento (NÃO em produção)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Documentação da API - Labouré')
      .setDescription(`
        ## Documentação da API para Sistema de E-commerce

        ### Funcionalidades:
        - Gerenciamento de usuários (autenticação, perfil)
        - Gerenciamento de produtos (operações CRUD)
        - Operações de carrinho de compras
        - Processamento de pedidos
        - Integração de pagamento
        - Sistema de notificações
        
        ### Ambientes:
        - 🔧 **Atual:** DESENVOLVIMENTO
        - 🚀 **Produção:** Disponível em produção sem Swagger
      `)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Digite o token JWT',
          in: 'header',
        },
        'access-token',
      )
      .addTag('Auth', 'Endpoints de autenticação - Login, Registro, Sair')
      .addTag('Users', 'Gerenciamento de usuários - Perfil, Atualizar, Deletar')
      .addTag('Produtos', 'Catálogo de produtos - Listar, Buscar, Detalhes')
      .addTag('Carrinho', 'Carrinho de compras - Adicionar, Remover, Finalizar')
      .addTag('Pedidos', 'Gerenciamento de pedidos - Criar, Rastrear, Cancelar')
      .addTag('Pagamento', 'Processamento de pagamento - PIX, Boleto, Cartão')
      .addTag('Notificacoes', 'Notificações do usuário - Ler, Deletar')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      },
      customCss: `
        .swagger-ui .topbar { background-color: #1e3a8a; }
        .swagger-ui .topbar .download-url-wrapper .select-label select { border-color: #1e3a8a; }
        .swagger-ui .info .title { color: #1e3a8a; }
        .swagger-ui .btn.authorize { border-color: #1e3a8a; color: #1e3a8a; }
        .swagger-ui .btn.authorize svg { fill: #1e3a8a; }
      `,
      customSiteTitle: 'Documentação da API - Labouré',
    });
    
    console.log('📚 Swagger disponível em /api/docs');
  } else {
    console.log('🔒 Swagger desabilitado em produção');
  }

  return app;
}

// Handler para Vercel (serverless)
export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, adapter, {
      rawBody: true, // Importante para webhook do MercadoPago
    });
    
    await configureApp(app);
    await app.init();
    cachedServer = expressApp;
    console.log('✅ Serverless handler inicializado');
  }
  
  cachedServer(req, res);
}

// Bootstrap para desenvolvimento local
async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Importante para webhook do MercadoPago
  });
  
  await configureApp(app);
  
  const portaDesejada = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  await app.listen(portaDesejada);
  
  const logger = new Logger('Inicializacao');
  logger.log(`🚀 Servidor rodando em http://localhost:${portaDesejada}`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📚 Swagger disponível em http://localhost:${portaDesejada}/api/docs`);
  }
  
  logger.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  logger.log(`📦 Banco de dados: ${process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'}`);
  logger.log(`🔓 CORS configurado para desenvolvimento`);
}

// Executa local apenas se não estiver no Vercel
if (process.env.VERCEL !== '1') {
  bootstrapLocal();
}