import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './app/app.module';
import { seedDatabase } from './seed/seed';

// ──────────────────────────────────────────────────────────────
// Utilitário: Encontrar porta disponível
// ──────────────────────────────────────────────────────────────
async function encontrarPortaDisponivel(
  portaInicial: number,
  tentativasMaximas: number = 10,
): Promise<number> {
  const net = require('net');

  for (let i = 0; i < tentativasMaximas; i++) {
    const porta = portaInicial + i;

    const disponivel = await new Promise<boolean>((resolve) => {
      const servidor = net.createServer();

      servidor.once('error', () => resolve(false));
      servidor.once('listening', () => {
        servidor.close();
        resolve(true);
      });

      servidor.listen(porta);
    });

    if (disponivel) return porta;

    console.log(`⚠️  Porta ${porta} está ocupada, tentando ${porta + 1}...`);
  }

  throw new Error(
    `Não foi possível encontrar uma porta disponível após ${tentativasMaximas} tentativas`,
  );
}

// ──────────────────────────────────────────────────────────────
// Utilitário: Verificar se o banco já foi semeado
// ──────────────────────────────────────────────────────────────
async function isDatabaseSeeded(): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    return count > 0;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// ──────────────────────────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────────────────────────
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // OBRIGATÓRIO para verificação de assinatura HMAC do webhook MercadoPago.
    // Sem isso, req.rawBody fica undefined e a validação sempre falha.
    rawBody: true,
  });

  const logger = new Logger('Inicializacao');

  // Validação global
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

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Prefixo global da API
  app.setGlobalPrefix('api');

  // ──────────────────────────────────────────────────────────────
  // Swagger
  // ──────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Documentação da API')
    .setDescription(`
      ## Documentação da API para Sistema de E-commerce

      ### Funcionalidades:
      - Gerenciamento de usuários (autenticação, perfil)
      - Gerenciamento de produtos (operações CRUD)
      - Operações de carrinho de compras
      - Processamento de pedidos
      - Integração de pagamento
      - Sistema de notificações
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
    customSiteTitle: 'Documentação da API de E-commerce',
  });

  // ──────────────────────────────────────────────────────────────
  // Porta
  // ──────────────────────────────────────────────────────────────
  const portaDesejada = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const tentativasMaximas = parseInt(process.env.MAX_PORT_ATTEMPTS || '10');

  let PORTA: number;

  try {
    PORTA = await encontrarPortaDisponivel(portaDesejada, tentativasMaximas);
  } catch (erro) {
    logger.error(`❌ ${erro.message}`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────
  // Seed — apenas em desenvolvimento e somente se ainda não foi feito
  // ──────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    try {
      const jaFoiSemeado = await isDatabaseSeeded();

      if (jaFoiSemeado) {
        logger.log('🌱 Banco já foi semeado, pulando...');
      } else {
        await seedDatabase();
        logger.log('🌱 Banco de dados semeado com sucesso!');
      }
    } catch (erro) {
      logger.warn(`⚠️  Seed falhou (servidor continuará): ${erro.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Start
  // ──────────────────────────────────────────────────────────────
  await app.listen(PORTA);

  logger.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
  logger.log(`📚 Swagger disponível em http://localhost:${PORTA}/api/docs`);
  logger.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  logger.log(`📁 Prefixo da API: /api`);
  logger.log(`🔔 Webhook MercadoPago: http://localhost:${PORTA}/api/pagamento/webhook/mercadopago`);

  if (PORTA !== portaDesejada) {
    logger.warn(
      `⚠️  Porta ${portaDesejada} estava ocupada, usando porta ${PORTA} como fallback`,
    );
  }
}

bootstrap();