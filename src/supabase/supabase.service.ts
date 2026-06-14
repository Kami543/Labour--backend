import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import ws from 'ws';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('⚠️ Supabase não configurado - upload de imagens desabilitado');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: ws as any,
      },
    });

    this.logger.log('✅ Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      this.logger.error(`Batch delete failed: ${error.message}`);
      throw error;
    }
  }

  async getFileUrl(bucket: string, path: string): Promise<string> {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  async moveFile(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      this.logger.error(`Move failed: ${error.message}`);
      throw error;
    }
  }

  async listFiles(bucket: string, path?: string): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(path || '');

    if (error) {
      this.logger.error(`List failed: ${error.message}`);
      throw error;
    }

    return data.map(file => file.name);
  }

  async createBucket(bucket: string, isPublic: boolean = true): Promise<void> {
    const { error } = await this.supabase.storage.createBucket(bucket, {
      public: isPublic,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    });

    if (error && !error.message.includes('already exists')) {
      this.logger.error(`Bucket creation failed: ${error.message}`);
      throw error;
    }
  }
}
