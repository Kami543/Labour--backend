import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global() // Torna o módulo global para não precisar importar em toda parte
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}