// src/modules/avaliacoes/dto/update-avaliacao.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateAvaliacaoDto {
  @ApiProperty({ 
    description: 'Nota de 1 a 5',
    example: 4,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  nota?: number;

  @ApiProperty({ 
    description: 'Título da avaliação',
    example: 'Muito bom!',
    required: false
  })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiProperty({ 
    description: 'Comentário da avaliação',
    example: 'Produto de qualidade, mas demorou a chegar.',
    required: false
  })
  @IsOptional()
  @IsString()
  comentario?: string;
}