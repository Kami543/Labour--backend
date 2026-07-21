// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { UserRepository } from './users.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // <-- Importa PrismaModule
  controllers: [UserController],
  providers: [
    UserService, 
    UserRepository,
    // PrismaService removido - vem do PrismaModule
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}