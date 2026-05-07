// src/modules/pedidos/dto/update-pedido-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusPedido } from '@prisma/client';

export class UpdatePedidoStatusDto {
  @ApiProperty({ 
    description: 'Novo status do pedido',
    enum: StatusPedido,
    example: 'enviado'
  })
  @IsEnum(StatusPedido)
  status: StatusPedido;

  @ApiProperty({ 
    description: 'Código de rastreio (obrigatório quando status for enviado)',
    example: 'BR123456789',
    required: false
  })
  @IsOptional()
  @IsString()
  codigoRastreio?: string;
}