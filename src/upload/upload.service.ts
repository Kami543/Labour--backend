// src/upload/upload.service.ts - sem tipagem do Express
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

export enum Buckets {
  PRODUTOS = 'produtos-imagens',
  AVATARS = 'avatars',
  BANNERS = 'banners',
}

export const BUCKET_CONFIGS = {
  [Buckets.PRODUTOS]: {
    public: true,
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  },
  [Buckets.AVATARS]: {
    public: true,
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [Buckets.BANNERS]: {
    public: true,
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

// Interface própria para o arquivo (não depende do Express)
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadResult {
  url: string;
  path: string;
  metadata: any;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadProductImage(
    file: UploadedFile,  // ← MUDOU: agora usa interface própria
    produtoId: string,
    options?: { isPrincipal?: boolean; ordem?: number }
  ): Promise<UploadResult> {
    this.validateFile(file, Buckets.PRODUTOS);

    const fileBuffer = file.buffer;
    const extension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${extension}`;
    const path = `${produtoId}/${fileName}`;

    const url = await this.supabaseService.uploadFile(
      Buckets.PRODUTOS,
      path,
      fileBuffer,
      file.mimetype,
    );

    return {
      url,
      path,
      metadata: {
        originalName: file.originalname,
        size: fileBuffer.length,
        mimetype: file.mimetype,
        produtoId,
        ...options,
      },
    };
  }

  async uploadMultipleProductImages(
    files: UploadedFile[],  // ← MUDOU
    produtoId: string,
  ): Promise<Array<{ url: string; path: string; ordem: number }>> {
    const uploadPromises = files.map((file, index) =>
      this.uploadProductImage(file, produtoId, { ordem: index }),
    );

    const results = await Promise.all(uploadPromises);
    return results.map((result, index) => ({
      url: result.url,
      path: result.path,
      ordem: index,
    }));
  }

  async deleteProductImage(produtoId: string, imagePath: string): Promise<void> {
    await this.supabaseService.deleteFile(Buckets.PRODUTOS, `${produtoId}/${imagePath}`);
  }

  async deleteAllProductImages(produtoId: string): Promise<void> {
    const files = await this.supabaseService.listFiles(Buckets.PRODUTOS, produtoId);
    const paths = files.map(file => `${produtoId}/${file}`);
    
    if (paths.length > 0) {
      await this.supabaseService.deleteFiles(Buckets.PRODUTOS, paths);
    }
  }

  private validateFile(file: UploadedFile, bucket: Buckets) {  // ← MUDOU
    const config = BUCKET_CONFIGS[bucket];
    
    if (!config.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Permitidos: ${config.allowedTypes.join(', ')}`,
      );
    }

    if (file.size > config.maxSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${config.maxSize / 1024 / 1024}MB`,
      );
    }
  }
}