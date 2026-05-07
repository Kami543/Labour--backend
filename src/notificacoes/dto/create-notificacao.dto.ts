// src/modules/notificacoes/dto/create-notificacao.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { TipoNotificacao } from '@prisma/client';

export class CreateNotificacaoDto {
  @ApiProperty({ 
    description: 'Tipo da notificação',
    enum: TipoNotificacao,
    example: 'promo'
  })
  @IsEnum(TipoNotificacao)
  tipo: TipoNotificacao;

  @ApiProperty({ 
    description: 'Título da notificação',
    example: 'Promoção Imperdível!'
  })
  @IsString()
  titulo: string;

  @ApiProperty({ 
    description: 'Mensagem da notificação',
    example: 'Confira nossos novos produtos com 20% OFF!'
  })
  @IsString()
  mensagem: string;
}