import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  buckets: {
    produtos: process.env.SUPABASE_BUCKET_PRODUTOS || 'produtos-imagens',
    avatars: process.env.SUPABASE_BUCKET_AVATARS || 'avatars',
    banners: process.env.SUPABASE_BUCKET_BANNERS || 'banners',
  },
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/jpg').split(','),
  },
}));