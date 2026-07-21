import { IsString, IsEmail, IsOptional, IsEnum, MinLength, ValidateNested, IsObject, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// DTO para o objeto endereço (armazenado como JSON no banco)
export class EnderecoDto {
  @IsString({ message: 'Rua é obrigatória' })
  rua: string;

  @IsString({ message: 'Número é obrigatório' })
  numero: string;

  @IsOptional()
  @IsString({ message: 'Complemento deve ser texto' })
  complemento?: string;

  @IsString({ message: 'Cidade é obrigatória' })
  cidade: string;

  @IsString({ message: 'Estado é obrigatório' })
  estado: string;

  @IsString({ message: 'CEP é obrigatório' })
  cep: string;
}

// DTO para criação de usuário
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

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsObject({ message: 'Endereço deve ser um objeto válido' })
  endereco: EnderecoDto;

  @IsEnum(UserRole, { message: 'Role deve ser USER ou ADMIN' })
  @IsOptional()
  role?: UserRole;
}

// DTO para atualização de usuário (todos os campos opcionais)
export class UpdateUserDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  nome?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsOptional()
  cpf?: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  senha?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsObject({ message: 'Endereço deve ser um objeto válido' })
  @IsOptional()
  endereco?: EnderecoDto;

  @IsEnum(UserRole, { message: 'Role deve ser USER ou ADMIN' })
  @IsOptional()
  role?: UserRole;
}

// ============================================
// ⭐ NOVAS CLASSES ADICIONADAS ABAIXO ⭐
// ============================================

// DTO de resposta básica (sem estatísticas)
export class UserResponseDto {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  role: UserRole;
  endereco: EnderecoDto;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: any) {
    this.id = user.id;
    this.nome = user.nome;
    this.email = user.email;
    this.cpf = user.cpf;
    this.role = user.role;
    // Converte o JSON do Prisma para o objeto EnderecoDto
    this.endereco = typeof user.endereco === 'string' 
      ? JSON.parse(user.endereco) 
      : user.endereco as EnderecoDto;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}

// DTO de resposta com estatísticas adicionais (para detalhes do usuário)
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