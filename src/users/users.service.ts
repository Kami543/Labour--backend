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
        endereco: createUserDto.endereco,    // objeto JSON conforme schema
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

    // Tenta buscar do cache
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

  async findDetail(id: string): Promise<UserDetailResponseDto> {
    this.logger.log(`Buscando detalhes do usuário com ID: ${id}`);
    const userDto = await this.findById(id); // já usa cache e valida existência

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

    // Valida existência (já usa cache)
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
    }

    // Se o CPF for passado na atualização, valida
    if (updateUserDto.cpf !== undefined) {
      const cpfExists = await this.userRepository.findByCpf(updateUserDto.cpf);
      if (cpfExists && cpfExists.id !== id) {
        throw new ConflictException('CPF já está em uso');
      }
      updateData.cpf = updateUserDto.cpf;
    }

    try {
      const updatedUser = await this.userRepository.update(id, updateData);
      // Invalida o cache após atualização
      cache.del(`user:${id}`);
      this.logger.log(`Usuário com ID ${id} atualizado com sucesso`);
      return new UserResponseDto(updatedUser);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deletando usuário com ID: ${id}`);
    await this.findById(id); // valida existência

    try {
      await this.userRepository.delete(id);
      cache.del(`user:${id}`);
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