import { IsEnum, IsOptional, IsString, IsBoolean, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPagamento } from '@prisma/client';

export class CreateMetodoPagamentoDto {
  @ApiProperty({ enum: TipoPagamento })
  @IsEnum(TipoPagamento)
  tipo: TipoPagamento;

  @ApiPropertyOptional({ description: 'Token do cartão (via tokenização no frontend)' })
  @IsOptional()
  @IsString()
  tokenCard?: string;

  @ApiPropertyOptional({ description: 'Provedor do token: stripe | mercadopago' })
  @IsOptional()
  @IsString()
  tokenProvider?: string;

  @ApiPropertyOptional({ description: 'Últimos 4 dígitos do cartão' })
  @IsOptional()
  @IsString()
  ultimosDigitos?: string;

  @ApiPropertyOptional({ description: 'Chave PIX (CPF, CNPJ, e-mail, telefone ou aleatória)' })
  @ValidateIf((o) => o.tipo === TipoPagamento.PIX)
  @IsOptional()
  @IsString()
  pixKey?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  pagamentoDefault?: boolean;

  @ApiPropertyOptional({ description: 'Device fingerprint para anti-fraude' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}