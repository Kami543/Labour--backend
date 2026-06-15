import { BadRequestException } from '@nestjs/common';

// Interface própria para o arquivo (compatível com o que o NestJS/Multer retorna)
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileValidationOptions {
  maxSize: number;
  allowedMimeTypes: string[];
  minSize?: number;
}

export class FileValidator {
  // MUDOU: Express.Multer.File → UploadedFile (ou pode usar 'any' para ser mais flexível)
  static validateFile(file: UploadedFile | any, options: FileValidationOptions): void {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    if (options.minSize && file.size < options.minSize) {
      throw new BadRequestException(
        `Arquivo muito pequeno. Mínimo: ${options.minSize / 1024}KB`,
      );
    }

    if (file.size > options.maxSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${options.maxSize / 1024 / 1024}MB`,
      );
    }

    if (!options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Permitidos: ${options.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  static generateSafeFileName(originalName: string): string {
    const extension = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${timestamp}-${random}.${extension}`;
  }
}