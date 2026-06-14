export function slugify(text: string): string {
    if (!text) return '';
    
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/[^\w\-]+/g, '') // Remove caracteres especiais
      .replace(/\-\-+/g, '-') // Remove múltiplos hífens
      .replace(/^-+/, '') // Remove hífens do início
      .replace(/-+$/, ''); // Remove hífens do final
  }