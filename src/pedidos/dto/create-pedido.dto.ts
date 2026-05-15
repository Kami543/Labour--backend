// src/modules/pedidos/dto/create-pedido.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsObject, Min, IsArray, ValidateNested, IsUUID, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePedidoItemDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsUUID()
  produtoId: string;

  @ApiProperty({ description: 'Quantidade', minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade: number;

  @ApiProperty({ description: 'Tamanho', required: false })
  @IsOptional()
  @IsString()
  tamanho?: string;

  @ApiProperty({ description: 'Cor', required: false })
  @IsOptional()
  @IsString()
  cor?: string;
}

export class CreatePedidoDto {
  @ApiProperty({ 
    description: 'Itens do pedido (opcional - se não enviar, usa o carrinho)',
    type: [CreatePedidoItemDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePedidoItemDto)
  itens?: CreatePedidoItemDto[];

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
    required: false
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ 
    description: 'Endereço de entrega',
    example: {
      rua: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000'
    }
  })
  @IsObject()
  enderecoEntrega: Record<string, any>;
}