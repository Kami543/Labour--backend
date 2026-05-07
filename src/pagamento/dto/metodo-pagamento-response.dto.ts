// src/modules/pagamento/dto/metodo-pagamento-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MetodoPagamentoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  ultimosDigitos?: string;

  @ApiProperty()
  pagamentoDefault: boolean;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;
}