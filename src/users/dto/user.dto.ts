// user.dto.ts

import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export class CreateUserDto {
  @IsString({ message: 'Nome deve ser uma string' })
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString({ message: 'CPF deve ser uma string' })
  cpf: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  telefone?: string;

  @IsString({ message: 'Endereço deve ser uma string' })
  @IsOptional()
  endereco?: string;

  @IsString({ message: 'Cidade deve ser uma string' })
  @IsOptional()
  cidade?: string;

  @IsString({ message: 'Estado deve ser uma string' })
  @IsOptional()
  estado?: string;

  @IsString({ message: 'CEP deve ser uma string' })
  @IsOptional()
  cep?: string;

  @IsEnum(UserRole, { message: 'Role deve ser user ou admin' })
  @IsOptional()
  role?: UserRole;
}

export class UpdateUserDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  nome?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  senha?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  telefone?: string;

  @IsString({ message: 'Endereço deve ser uma string' })
  @IsOptional()
  endereco?: string;

  @IsString({ message: 'Cidade deve ser uma string' })
  @IsOptional()
  cidade?: string;

  @IsString({ message: 'Estado deve ser uma string' })
  @IsOptional()
  estado?: string;

  @IsString({ message: 'CEP deve ser uma string' })
  @IsOptional()
  cep?: string;

  @IsEnum(UserRole, { message: 'Role deve ser user ou admin' })
  @IsOptional()
  role?: UserRole;
}

export class UserResponseDto {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: any) {
    this.id = user.id;
    this.nome = user.nome;
    this.email = user.email;
    this.cpf = user.cpf;
    this.telefone = user.telefone;
    this.endereco = user.endereco;
    this.cidade = user.cidade;
    this.estado = user.estado;
    this.cep = user.cep;
    this.role = user.role;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}

export class UserDetailResponseDto extends UserResponseDto {
  pedidosTotal: number;
  carrinhoTotal: number;
  notificacoesNaoLidas: number;

  constructor(
    user: any,
    pedidosTotal: number = 0,
    carrinhoTotal: number = 0,
    notificacoesNaoLidas: number = 0,
  ) {
    super(user);
    this.pedidosTotal = pedidosTotal;
    this.carrinhoTotal = carrinhoTotal;
    this.notificacoesNaoLidas = notificacoesNaoLidas;
  }
}