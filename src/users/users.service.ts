// src/users/users.service.ts - VERSÃO CORRIGIDA
import { Injectable, Logger, NotFoundException, ConflictException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UserDetailResponseDto } from './dto/user.dto';
import NodeCache from 'node-cache';

// Cache em memória (limpo automaticamente após 1 hora)
const cache = new NodeCache({ stdTTL: 3600, maxKeys: 200 });

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log('Criando novo usuário...');

    try {
      // ✅ Usa exists em vez de buscar objeto completo
      const emailExists = await this.userRepository.exists({ email: createUserDto.email });
      if (emailExists) {
        throw new ConflictException('Email já está cadastrado');
      }

      const cpfExists = await this.userRepository.exists({ cpf: createUserDto.cpf });
      if (cpfExists) {
        throw new ConflictException('CPF já está cadastrado');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.senha, 10);

      const user = await this.userRepository.create({
        nome: createUserDto.nome,
        email: createUserDto.email,
        cpf: createUserDto.cpf,
        senha: hashedPassword,
        endereco: createUserDto.endereco || '',
        role: createUserDto.role || 'USER',
      });

      this.logger.log(`Usuário criado com ID: ${user.id}`);
      
      // ✅ Invalida caches relacionados
      cache.del('users:clients');
      cache.del('users:admins');
      
      return new UserResponseDto(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // ✅ findAll COM PAGINAÇÃO
  async findAll(page: number = 1, limit: number = 10): Promise<{ data: UserResponseDto[]; total: number; page: number; totalPages: number }> {
    this.logger.log(`Buscando todos os usuários - Página ${page}`);
    
    try {
      const safeLimit = Math.min(Math.max(1, limit), 50);
      const safePage = Math.max(1, page);
      
      const result = await this.userRepository.findAll({
        page: safePage,
        limit: safeLimit
      });
      
      return {
        data: result.data.map((user) => new UserResponseDto(user)),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findById(id: string): Promise<UserResponseDto> {
    this.logger.log(`Buscando usuário com ID: ${id}`);

    // ✅ Valida ID
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }

    let user = cache.get<any>(`user:${id}`);
    if (!user) {
      try {
        user = await this.userRepository.findById(id);
        if (user) {
          cache.set(`user:${id}`, user);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return new UserResponseDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    if (!email || email.trim().length === 0) {
      throw new BadRequestException('Email inválido');
    }
    
    this.logger.log(`Buscando usuário com email: ${email}`);
    
    let user = cache.get<any>(`user:email:${email}`);
    if (!user) {
      try {
        user = await this.userRepository.findByEmail(email);
        if (user) {
          cache.set(`user:email:${email}`, user);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    return user ? new UserResponseDto(user) : null;
  }

  async findByCpf(cpf: string): Promise<UserResponseDto | null> {
    if (!cpf || cpf.trim().length === 0) {
      throw new BadRequestException('CPF inválido');
    }
    
    this.logger.log(`Buscando usuário com CPF: ${cpf}`);
    
    let user = cache.get<any>(`user:cpf:${cpf}`);
    if (!user) {
      try {
        user = await this.userRepository.findByCpf(cpf);
        if (user) {
          cache.set(`user:cpf:${cpf}`, user);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    return user ? new UserResponseDto(user) : null;
  }

  // ✅ SEM ARGUMENTO - retorna todos os admins (com limite interno)
  async findAllAdmins(limit: number = 100): Promise<UserResponseDto[]> {
    this.logger.log('Buscando todos os administradores...');
    
    let admins = cache.get<any[]>('users:admins');
    if (!admins) {
      try {
        const safeLimit = Math.min(limit, 100);
        admins = await this.userRepository.findByRole('ADMIN', safeLimit);
        if (admins) {
          cache.set('users:admins', admins);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    return admins ? admins.map(admin => new UserResponseDto(admin)) : [];
  }

  // ✅ findAllClients SEM ARGUMENTO (ou com opcional)
  async findAllClients(limit?: number): Promise<UserResponseDto[]> {
    this.logger.log('Buscando todos os clientes...');
    
    let clients = cache.get<any[]>('users:clients');
    if (!clients) {
      try {
        const safeLimit = limit ? Math.min(limit, 200) : 200;
        clients = await this.userRepository.findByRole('USER', safeLimit);
        if (clients) {
          cache.set('users:clients', clients);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    return clients ? clients.map(client => new UserResponseDto(client)) : [];
  }

  async findByRole(role: string, limit: number = 100): Promise<UserResponseDto[]> {
    this.logger.log(`Buscando usuários com role: ${role}`);
    
    try {
      const safeLimit = Math.min(limit, 200);
      const users = await this.userRepository.findByRole(role, safeLimit);
      return users.map(user => new UserResponseDto(user));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findDetail(id: string): Promise<UserDetailResponseDto> {
    this.logger.log(`Buscando detalhes do usuário com ID: ${id}`);
    const userDto = await this.findById(id);

    try {
      const [pedidosTotal, carrinhoTotal, notificacoesNaoLidas] = await Promise.all([
        this.userRepository.countPedidos(id).catch(() => 0),
        this.userRepository.countCarrinho(id).catch(() => 0),
        this.userRepository.countNotificacoesNaoLidas(id).catch(() => 0),
      ]);

      return new UserDetailResponseDto(
        userDto,
        pedidosTotal,
        carrinhoTotal,
        notificacoesNaoLidas,
      );
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Atualizando usuário com ID: ${id}`);

    const user = await this.findById(id);

    const updateData: any = {};

    if (updateUserDto.nome !== undefined) updateData.nome = updateUserDto.nome;
    if (updateUserDto.endereco !== undefined) updateData.endereco = updateUserDto.endereco;
    if (updateUserDto.role !== undefined) updateData.role = updateUserDto.role;

    if (updateUserDto.senha) {
      updateData.senha = await bcrypt.hash(updateUserDto.senha, 10);
    }

    if (updateUserDto.email !== undefined && updateUserDto.email !== user.email) {
      const emailExists = await this.userRepository.exists({ email: updateUserDto.email });
      if (emailExists) {
        throw new ConflictException('Email já está em uso');
      }
      updateData.email = updateUserDto.email;
      cache.del(`user:email:${user.email}`);
    }

    if (updateUserDto.cpf !== undefined && updateUserDto.cpf !== user.cpf) {
      const cpfExists = await this.userRepository.exists({ cpf: updateUserDto.cpf });
      if (cpfExists) {
        throw new ConflictException('CPF já está em uso');
      }
      updateData.cpf = updateUserDto.cpf;
      cache.del(`user:cpf:${user.cpf}`);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Nenhum dado válido para atualização');
    }

    try {
      const updatedUser = await this.userRepository.update(id, updateData);
      
      // Invalida todos os caches relacionados
      cache.del(`user:${id}`);
      cache.del(`user:email:${updateUserDto.email || user.email}`);
      cache.del(`user:cpf:${updateUserDto.cpf || user.cpf}`);
      cache.del('users:admins');
      cache.del('users:clients');
      
      this.logger.log(`Usuário com ID ${id} atualizado com sucesso`);
      return new UserResponseDto(updatedUser);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Deletando usuário com ID: ${id}`);
    const user = await this.findById(id);
    
    // Invalida caches antes de deletar
    cache.del(`user:${id}`);
    if (user.email) cache.del(`user:email:${user.email}`);
    cache.del('users:admins');
    cache.del('users:clients');

    try {
      await this.userRepository.delete(id);
      this.logger.log(`Usuário com ID ${id} deletado com sucesso`);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getPedidos(userId: string, page: number = 1, limit: number = 10) {
    await this.findById(userId);
    try {
      return this.userRepository.findPedidosByUserId(userId, page, limit);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getCarrinho(userId: string) {
    await this.findById(userId);
    try {
      return this.userRepository.findCarrinhoByUserId(userId);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getNotificacoes(userId: string, lidas: boolean = false, page: number = 1, limit: number = 20) {
    await this.findById(userId);
    try {
      return this.userRepository.findNotificacoesByUserId(userId, lidas, page, limit);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async countAdmins(): Promise<number> {
    try {
      return await this.userRepository.countByRole('ADMIN');
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async countClients(): Promise<number> {
    try {
      return await this.userRepository.countByRole('USER');
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // ✅ Método auxiliar para validar ID
  private isValidId(id: string): boolean {
    return id && /^[a-fA-F0-9]{24}$|^\d+$/.test(id);
  }

  // Centraliza o tratamento do erro
  private handlePrismaError(error: any): never {
    if (error?.code === 'P2024') {
      this.logger.error(`Timeout na conexão com o banco: ${error.message}`);
      throw new ServiceUnavailableException(
        'Serviço temporariamente ocupado. Por favor, tente novamente em alguns instantes.',
      );
    }
    // ✅ Se já é uma exceção Nest, relança
    if (error instanceof NotFoundException || 
        error instanceof ConflictException || 
        error instanceof BadRequestException) {
      throw error;
    }
    throw error;
  }
}