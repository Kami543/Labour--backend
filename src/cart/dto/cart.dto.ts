// src/modules/cart/dto/add-to-cart.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, IsOptional, IsUUID } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID do produto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  produtoId: string;

  @ApiProperty({
    description: 'Quantidade do produto',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantidade: number;

  @ApiProperty({
    description: 'Tamanho do produto (opcional)',
    example: 'M',
    required: false,
  })
  @IsOptional()
  @IsString()
  tamanho?: string;

  @ApiProperty({
    description: 'Cor do produto (opcional)',
    example: 'Preto',
    required: false,
  })
  @IsOptional()
  @IsString()
  cor?: string;
}


export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Nova quantidade do produto',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantidade: number;
}