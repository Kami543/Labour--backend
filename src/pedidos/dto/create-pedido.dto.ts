// src/modules/pedidos/dto/create-pedido.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePedidoDto {
  @ApiProperty({ 
    description: 'Valor do frete',
    example: 10.00,
    required: false,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  frete?: number;

  @ApiProperty({ 
    description: 'Valor do imposto',
    example: 5.00,
    required: false,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  imposto?: number;

  @ApiProperty({ 
    description: 'Observações do pedido',
    example: 'Entregar após as 18h',
    required: false
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ 
    description: 'Endereço de entrega (JSON)',
    example: {
      rua: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000'
    },
    required: false
  })
  @IsOptional()
  @IsObject()
  enderecoEntrega?: any;
}