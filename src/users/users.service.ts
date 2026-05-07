
import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UserDetailResponseDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log('Criando novo usuário...');
    
    const emailExists = await this.userRepository.emailExists(createUserDto.email);
    if (emailExists) {
      this.logger.error(`Email ${createUserDto.email} já está cadastrado`);
      throw new ConflictException('Email já está cadastrado');
    }

    const cpfExists = await this.userRepository.cpfExists(createUserDto.cpf);
    if (cpfExists) {
      this.logger.error(`CPF ${createUserDto.cpf} já está cadastrado`);
      throw new ConflictException('CPF já está cadastrado');
    }

    const senhaHasheada = await bcrypt.hash(createUserDto.senha, 10);

    const user = await this.userRepository.create({
      nome: createUserDto.nome,
      email: createUserDto.email,
      cpf: createUserDto.cpf,
      senha: senhaHasheada,
      telefone: createUserDto.telefone,
      endereco: createUserDto.endereco,
      cidade: createUserDto.cidade,
      estado: createUserDto.estado,
      cep: createUserDto.cep,
      role: createUserDto.role,
    });

    this.logger.log(`Usuário criado com ID: ${user.id}`);
    return new UserResponseDto(user);
  }

  async findAll() {
    this.logger.log('Buscando todos os usuários...');
    const result = await this.userRepository.findAll();
    return result.data.map(user => new UserResponseDto(user));
  }

  async findById(id: string): Promise<UserResponseDto> {
    this.logger.log(`Buscando usuário com ID: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      this.logger.error(`Usuário com ID ${id} não encontrado`);
      throw new NotFoundException('Usuário não encontrado');
    }
    return new UserResponseDto(user);
  }

  async findDetail(id: string): Promise<UserDetailResponseDto> {
    this.logger.log(`Buscando detalhes do usuário com ID: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      this.logger.error(`Usuário com ID ${id} não encontrado`);
      throw new NotFoundException('Usuário não encontrado');
    }

    const pedidosTotal = await this.userRepository.countPedidos(id);
    const carrinhoTotal = await this.userRepository.countCarrinho(id);
    const notificacoesNaoLidas = await this.userRepository.countNotificacoesNaoLidas(id);

    return new UserDetailResponseDto(user, pedidosTotal, carrinhoTotal, notificacoesNaoLidas);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Atualizando usuário com ID: ${id}`);
    
    const user = await this.userRepository.findById(id);
    if (!user) {
      this.logger.error(`Usuário com ID ${id} não encontrado`);
      throw new NotFoundException('Usuário não encontrado');
    }

    const updateData: any = {};

    if (updateUserDto.nome !== undefined) updateData.nome = updateUserDto.nome;
    if (updateUserDto.telefone !== undefined) updateData.telefone = updateUserDto.telefone;
    if (updateUserDto.endereco !== undefined) updateData.endereco = updateUserDto.endereco;
    if (updateUserDto.cidade !== undefined) updateData.cidade = updateUserDto.cidade;
    if (updateUserDto.estado !== undefined) updateData.estado = updateUserDto.estado;
    if (updateUserDto.cep !== undefined) updateData.cep = updateUserDto.cep;
    if (updateUserDto.role !== undefined) updateData.role = updateUserDto.role;

    if (updateUserDto.senha) {
      updateData.senha = await bcrypt.hash(updateUserDto.senha, 10);
    }

    if (updateUserDto.email !== undefined) {
      const emailExists = await this.userRepository.findByEmail(updateUserDto.email);
      if (emailExists && emailExists.id !== id) {
        this.logger.error(`Email ${updateUserDto.email} já está em uso`);
        throw new ConflictException('Email já está em uso');
      }
      updateData.email = updateUserDto.email;
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    this.logger.log(`Usuário com ID ${id} atualizado com sucesso`);
    return new UserResponseDto(updatedUser);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deletando usuário com ID: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      this.logger.error(`Usuário com ID ${id} não encontrado`);
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.userRepository.delete(id);
    this.logger.log(`Usuário com ID ${id} deletado com sucesso`);
  }

  async getPedidos(userId: string) {
    this.logger.log(`Buscando pedidos do usuário ${userId}...`);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.userRepository.findPedidosByUserId(userId);
  }

  async getCarrinho(userId: string) {
    this.logger.log(`Buscando carrinho do usuário ${userId}...`);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.userRepository.findCarrinhoByUserId(userId);
  }

  async getNotificacoes(userId: string, lidas: boolean = false) {
    this.logger.log(`Buscando notificações do usuário ${userId}...`);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.userRepository.findNotificacoesByUserId(userId, lidas);
  }
}