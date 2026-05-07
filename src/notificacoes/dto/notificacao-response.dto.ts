// src/modules/notificacoes/dto/notificacao-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class NotificacaoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  titulo: string;

  @ApiProperty()
  mensagem: string;

  @ApiProperty()
  lida: boolean;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;
}