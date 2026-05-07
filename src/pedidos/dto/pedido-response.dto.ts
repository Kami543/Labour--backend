// src/modules/pedidos/dto/pedido-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PedidoItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  quantidade: number;

  @ApiProperty()
  precoUnitario: number;

  @ApiProperty()
  tamanho?: string;

  @ApiProperty()
  cor?: string;

  @ApiProperty()
  produtoId: string;
}

export class PedidoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  numero: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  frete: number;

  @ApiProperty()
  imposto: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  enderecoEntrega: any;

  @ApiProperty()
  dataPagamento?: Date;

  @ApiProperty()
  dataEnvio?: Date;

  @ApiProperty()
  dataEntrega?: Date;

  @ApiProperty()
  codigoRastreio?: string;

  @ApiProperty()
  observacoes?: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [PedidoItemResponseDto] })
  itens: PedidoItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}