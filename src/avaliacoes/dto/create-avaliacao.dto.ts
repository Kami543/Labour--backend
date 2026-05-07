// src/modules/avaliacoes/dto/create-avaliacao.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Max, IsUUID } from 'class-validator';

export class CreateAvaliacaoDto {
  @ApiProperty({ 
    description: 'ID do produto',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  produtoId: string;

  @ApiProperty({ 
    description: 'Nota de 1 a 5',
    example: 5,
    minimum: 1,
    maximum: 5
  })
  @IsInt()
  @Min(1)
  @Max(5)
  nota: number;

  @ApiProperty({ 
    description: 'Título da avaliação',
    example: 'Excelente produto!',
    required: false
  })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiProperty({ 
    description: 'Comentário da avaliação',
    example: 'Adorei a camiseta, muito confortável.',
    required: false
  })
  @IsOptional()
  @IsString()
  comentario?: string;
}