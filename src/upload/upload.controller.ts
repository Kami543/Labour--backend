// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post('product/:produtoId')
  @ApiOperation({ summary: 'Upload de imagem de produto' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'produtoId', description: 'ID do produto' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @UploadedFile() file: any,  // ← MUDOU: any em vez de Express.Multer.File
    @Param('produtoId') produtoId: string,
  ) {
    this.logger.log(`Upload de imagem para produto ${produtoId}`);
    
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const result = await this.uploadService.uploadProductImage(file, produtoId);
    return {
      success: true,
      ...result,
    };
  }

  @Post('product/:produtoId/multiple')
  @ApiOperation({ summary: 'Upload múltiplo de imagens' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'produtoId', description: 'ID do produto' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleProductImages(
    @UploadedFiles() files: any[],  // ← MUDOU: any[]
    @Param('produtoId') produtoId: string,
  ) {
    this.logger.log(`Upload múltiplo de ${files?.length || 0} imagens para produto ${produtoId}`);
    
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const results = await this.uploadService.uploadMultipleProductImages(files, produtoId);
    return {
      success: true,
      count: results.length,
      images: results,
    };
  }

  @Delete('product/:produtoId/:imagePath')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar imagem de produto' })
  @ApiParam({ name: 'produtoId', description: 'ID do produto' })
  @ApiParam({ name: 'imagePath', description: 'Caminho da imagem' })
  async deleteProductImage(
    @Param('produtoId') produtoId: string,
    @Param('imagePath') imagePath: string,
  ) {
    this.logger.log(`Deletando imagem ${imagePath} do produto ${produtoId}`);
    await this.uploadService.deleteProductImage(produtoId, imagePath);
    return {
      success: true,
      message: 'Imagem deletada com sucesso',
    };
  }
}