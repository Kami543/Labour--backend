import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { seedDatabase } from './seed/seed'; // Importar a função de seed

async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  const net = require('net');
  
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    
    try {
      const isAvailable = await new Promise<boolean>((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            resolve(false);
          } else {
            resolve(false);
          }
        });
        
        server.once('listening', () => {
          server.close();
          resolve(true);
        });
        
        server.listen(port);
      });
      
      if (isAvailable) {
        return port;
      }
      
      console.log(`⚠️ Porta ${port} está ocupada, tentando ${port + 1}...`);
    } catch (error) {
      console.log(`⚠️ Erro ao verificar porta ${port}: ${error.message}`);
    }
  }
  
  throw new Error(`Não foi possível encontrar uma porta disponível após ${maxAttempts} tentativas`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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

  // Prefix de API
  app.setGlobalPrefix('api');

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API Documentation for User and Product')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Users', 'Endpoints de usuários')
    .addTag('Products', 'Endpoints de produtos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const desiredPort = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const maxAttempts = parseInt(process.env.MAX_PORT_ATTEMPTS || '10');
  
  let PORT: number;
  
  try {
    PORT = await findAvailablePort(desiredPort, maxAttempts);
  } catch (error) {
    logger.error(`❌ ${error.message}`);
    process.exit(1);
  }

  // Executar o seed do banco de dados
  try {
    await seedDatabase();
    logger.log('🌱 Database seeded successfully!');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }

  await app.listen(PORT);

  logger.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  logger.log(`📚 Swagger disponível em http://localhost:${PORT}/api/docs`);
  logger.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📁 API prefix: /api`);
  
  if (PORT !== desiredPort) {
    logger.warn(`⚠️ Porta ${desiredPort} estava ocupada, usando porta ${PORT} como fallback`);
  }
}

bootstrap();
