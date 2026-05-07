import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPagamento, GatewayPagamento } from '@prisma/client';

export class ProcessarPagamentoDto {
  @ApiProperty({ description: 'ID do pedido a ser pago' })
  @IsUUID()
  pedidoId: string;

  @ApiProperty({ enum: TipoPagamento })
  @IsEnum(TipoPagamento)
  tipoPagamento: TipoPagamento;

  @ApiProperty({ enum: GatewayPagamento })
  @IsEnum(GatewayPagamento)
  gateway: GatewayPagamento;

  @ApiPropertyOptional({ description: 'ID do método de pagamento salvo' })
  @IsOptional()
  @IsUUID()
  metodoPagamentoId?: string;

  @ApiPropertyOptional({ description: 'Token avulso do cartão (se não usar método salvo)' })
  @ValidateIf((o) => o.tipoPagamento === TipoPagamento.CARTAO_CREDITO || o.tipoPagamento === TipoPagamento.CARTAO_DEBITO)
  @IsOptional()
  @IsString()
  cardToken?: string;

  @ApiPropertyOptional({ description: 'Número de parcelas (cartão crédito)', minimum: 1, maximum: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  parcelas?: number;

  @ApiPropertyOptional({ description: 'Minutos até expirar o PIX (padrão: 30)', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  pixExpiracaoMinutos?: number;

  @ApiPropertyOptional({ description: 'Dias até expirar o boleto (padrão: 3)', default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  boletoExpiracaoDias?: number;

  @ApiPropertyOptional({ description: 'Device fingerprint para anti-fraude' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({ description: 'IP do cliente (preenchido pelo servidor)' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}