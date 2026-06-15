import { Injectable, Logger, NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UserDetailResponseDto } from './dto/user.dto';
import NodeCache from 'node-cache';

// Cache em memória (limpo automaticamente após 1 hora)
const cache = new NodeCache({ stdTTL: 3600 });

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log('Criando novo usuário...');

    try {
      const emailExists = await this.userRepository.emailExists(createUserDto.email);
      if (emailExists) {
        throw new ConflictException('Email já está cadastrado');
      }

      const cpfExists = await this.userRepository.cpfExists(createUserDto.cpf);
      if (cpfExists) {
        throw new ConflictException('CPF já está cadastrado');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.senha, 10);

      const user = await this.userRepository.create({
        nome: createUserDto.nome,
        email: createUserDto.email,
        cpf: createUserDto.cpf,
        senha: hashedPassword,
        endereco: createUserDto.endereco,
        role: createUserDto.role || 'USER',
      });

      this.logger.log(`Usuário criado com ID: ${user.id}`);
      return new UserResponseDto(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    this.logger.log('Buscando todos os usuários...');
    try {
      const result = await this.userRepository.findAll();
      return result.data.map((user) => new UserResponseDto(user));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findById(id: string): Promise<UserResponseDto> {
    this.logger.log(`Buscando usuário com ID: ${id}`);

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

  // NOVO: Buscar usuário pelo email (para notificações)
  async findByEmail(email: string): Promise<UserResponseDto | null> {
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

  // NOVO: Buscar usuário pelo CPF
  async findByCpf(cpf: string): Promise<UserResponseDto | null> {
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

  // NOVO: Buscar todos os admins (para notificações em massa)
  async findAllAdmins(): Promise<UserResponseDto[]> {
    this.logger.log('Buscando todos os administradores...');
    
    let admins = cache.get<any[]>('users:admins');
    if (!admins) {
      try {
        admins = await this.userRepository.findByRole('ADMIN');
        if (admins) {
          cache.set('users:admins', admins);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    return admins ? admins.map(admin => new UserResponseDto(admin)) : [];
  }

  // NOVO: Buscar todos os clientes (role USER)
  async findAllClients(): Promise<UserResponseDto[]> {
    this.logger.log('Buscando todos os clientes...');
    
    let clients = cache.get<any[]>('users:clients');
    if (!clients) {
      try {
        clients = await this.userRepository.findByRole('USER');
        if (clients) {
          cache.set('users:clients', clients);
        }
      } catch (error) {
        this.handlePrismaError(error);
      }
    }

    return clients ? clients.map(client => new UserResponseDto(client)) : [];
  }

  // NOVO: Buscar usuários por role (genérico)
  async findByRole(role: string): Promise<UserResponseDto[]> {
    this.logger.log(`Buscando usuários com role: ${role}`);
    
    try {
      const users = await this.userRepository.findByRole(role);
      return users.map(user => new UserResponseDto(user));
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findDetail(id: string): Promise<UserDetailResponseDto> {
    this.logger.log(`Buscando detalhes do usuário com ID: ${id}`);
    const userDto = await this.findById(id);

    try {
      const pedidosTotal = await this.userRepository.countPedidos(id);
      const carrinhoTotal = await this.userRepository.countCarrinho(id);
      const notificacoesNaoLidas = await this.userRepository.countNotificacoesNaoLidas(id);

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
    this.logger.log(`Atualizando usuário com ID: ${id}`);

    await this.findById(id);

    const updateData: any = {};

    if (updateUserDto.nome !== undefined) updateData.nome = updateUserDto.nome;
    if (updateUserDto.endereco !== undefined) updateData.endereco = updateUserDto.endereco;
    if (updateUserDto.role !== undefined) updateData.role = updateUserDto.role;

    if (updateUserDto.senha) {
      updateData.senha = await bcrypt.hash(updateUserDto.senha, 10);
    }

    if (updateUserDto.email !== undefined) {
      const emailExists = await this.userRepository.findByEmail(updateUserDto.email);
      if (emailExists && emailExists.id !== id) {
        throw new ConflictException('Email já está em uso');
      }
      updateData.email = updateUserDto.email;
      // Invalida cache do email
      cache.del(`user:email:${updateUserDto.email}`);
    }

    if (updateUserDto.cpf !== undefined) {
      const cpfExists = await this.userRepository.findByCpf(updateUserDto.cpf);
      if (cpfExists && cpfExists.id !== id) {
        throw new ConflictException('CPF já está em uso');
      }
      updateData.cpf = updateUserDto.cpf;
      // Invalida cache do CPF
      cache.del(`user:cpf:${updateUserDto.cpf}`);
    }

    try {
      const updatedUser = await this.userRepository.update(id, updateData);
      // Invalida todos os caches relacionados
      cache.del(`user:${id}`);
      cache.del('users:admins');
      cache.del('users:clients');
      this.logger.log(`Usuário com ID ${id} atualizado com sucesso`);
      return new UserResponseDto(updatedUser);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
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

  async getPedidos(userId: string) {
    await this.findById(userId);
    try {
      return this.userRepository.findPedidosByUserId(userId);
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

  async getNotificacoes(userId: string, lidas: boolean = false) {
    await this.findById(userId);
    try {
      return this.userRepository.findNotificacoesByUserId(userId, lidas);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // NOVO: Contar número de admins
  async countAdmins(): Promise<number> {
    try {
      return await this.userRepository.countByRole('ADMIN');
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // NOVO: Contar número de clientes
  async countClients(): Promise<number> {
    try {
      return await this.userRepository.countByRole('USER');
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // Centraliza o tratamento do erro P2024 (timeout da pool)
  private handlePrismaError(error: any): never {
    if (error?.code === 'P2024') {
      this.logger.error(`Timeout na conexão com o banco: ${error.message}`);
      throw new ServiceUnavailableException(
        'Serviço temporariamente ocupado. Por favor, tente novamente em alguns instantes.',
      );
    }
    throw error;
  }
}