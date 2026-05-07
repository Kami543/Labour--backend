// src/seed/seed.ts
import { PrismaClient, TipoPagamento } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function findOrCreateProduto(nome: string, createData: any) {
  // Tenta encontrar o produto pelo nome
  const existingProduto = await prisma.produto.findFirst({
    where: { nome: nome }
  });
  
  if (existingProduto) {
    // Se existe, atualiza
    return await prisma.produto.update({
      where: { id: existingProduto.id },
      data: createData
    });
  }
  
  // Se não existe, cria (o UUID será gerado automaticamente)
  return await prisma.produto.create({
    data: createData
  });
}

export async function seedDatabase() {
  console.log('🌱 Iniciando seeding...');

  const hashedPassword = await bcrypt.hash("password123", 10);

  // ========================================
  // USUÁRIOS
  // ========================================
  
  const user1 = await prisma.user.upsert({
    where: { email: "joao.silva@example.com" },
    update: {},
    create: {
      nome: "João Silva",
      email: "joao.silva@example.com",
      cpf: "111.111.111-11",
      role: "USER",
      endereco: {
        rua: "Rua das Flores",
        numero: "123",
        complemento: "Apto 101",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01000-000",
      },
      senha: hashedPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "maria.souza@example.com" },
    update: {},
    create: {
      nome: "Maria Souza",
      email: "maria.souza@example.com",
      cpf: "222.222.222-22",
      role: "USER",
      endereco: {
        rua: "Avenida Paulista",
        numero: "1578",
        complemento: "Conj 500",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01310-200",
      },
      senha: hashedPassword,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@example.com",
      cpf: "333.333.333-33",
      role: "ADMIN",
      endereco: {
        rua: "Rua Admin",
        numero: "1",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01000-000",
      },
      senha: hashedPassword,
    },
  });

  console.log('✅ Usuários criados:', { user1: user1.email, user2: user2.email, admin: admin.email });

  // ========================================
  // PRODUTOS
  // ========================================

  const produto1 = await findOrCreateProduto("Camiseta Masculina Básica", {
    nome: "Camiseta Masculina Básica",
    slug: "camiseta-masculina-basica",
    descricao: "Camiseta de algodão 100% de alta qualidade, ideal para uso diário. Confortável e durável.",
    preco: 59.90,
    imagem: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
    categoria: "Masculino",
    tag: "roupa",
    estoque: 100,
    cores: ["Preto", "Branco", "Azul Marinho", "Cinza"],
    tamanhos: ["P", "M", "G", "GG", "XG"],
  });

  const produto2 = await findOrCreateProduto("Vestido Floral Feminino", {
    nome: "Vestido Floral Feminino",
    slug: "vestido-floral-feminino",
    descricao: "Vestido elegante com estampa floral, tecido leve e fluido. Perfeito para ocasiões especiais.",
    preco: 129.90,
    imagem: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=500",
    categoria: "Feminino",
    tag: "vestido",
    estoque: 50,
    cores: ["Vermelho", "Azul", "Rosa", "Amarelo"],
    tamanhos: ["P", "M", "G"],
  });

  const produto3 = await findOrCreateProduto("Jaqueta Jeans Masculina", {
    nome: "Jaqueta Jeans Masculina",
    slug: "jaqueta-jeans-masculina",
    descricao: "Jaqueta jeans clássica com acabamento premium. Estilo casual e versátil.",
    preco: 199.90,
    imagem: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500",
    categoria: "Masculino",
    tag: "jaqueta",
    estoque: 30,
    cores: ["Azul Claro", "Azul Escuro", "Preto"],
    tamanhos: ["P", "M", "G", "GG"],
  });

  const produto4 = await findOrCreateProduto("Bolsa Feminina de Couro", {
    nome: "Bolsa Feminina de Couro",
    slug: "bolsa-feminina-couro",
    descricao: "Bolsa elegante em couro legítimo, com alça ajustável e muitos compartimentos.",
    preco: 299.90,
    imagem: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500",
    categoria: "Acessorios",
    tag: "bolsa",
    estoque: 25,
    cores: ["Preto", "Marrom", "Bege"],
    tamanhos: ["Único"],
  });

  const produto5 = await findOrCreateProduto("Tênis Esportivo", {
    nome: "Tênis Esportivo",
    slug: "tenis-esportivo",
    descricao: "Tênis confortável para corrida e atividades físicas. Com amortecimento e respirabilidade.",
    preco: 249.90,
    imagem: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
    categoria: "Masculino",
    tag: "calcado",
    estoque: 80,
    cores: ["Preto/Branco", "Azul/Cinza", "Vermelho"],
    tamanhos: ["37", "38", "39", "40", "41", "42", "43"],
  });

  const produto6 = await findOrCreateProduto("Colar de Prata 925", {
    nome: "Colar de Prata 925",
    slug: "colar-prata-925",
    descricao: "Colar delicado em prata 925 com pingente de coração. Acabamento de alta qualidade.",
    preco: 89.90,
    imagem: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500",
    categoria: "Acessorios",
    tag: "joia",
    estoque: 150,
    cores: ["Prata"],
    tamanhos: ["40cm", "45cm", "50cm"],
  });

  console.log('✅ Produtos criados:', { 
    produto1: produto1.nome, 
    produto2: produto2.nome, 
    produto3: produto3.nome,
    produto4: produto4.nome,
    produto5: produto5.nome,
    produto6: produto6.nome 
  });

  // ========================================
  // ITENS DO CARRINHO (usando upsert para evitar duplicação)
  // ========================================

  const cartItem1 = await prisma.cartItem.upsert({
    where: {
      userId_produtoId_tamanho_cor: {
        userId: user1.id,
        produtoId: produto1.id,
        tamanho: "M",
        cor: "Preto",
      },
    },
    update: {
      quantidade: 2,
    },
    create: {
      quantidade: 2,
      tamanho: "M",
      cor: "Preto",
      userId: user1.id,
      produtoId: produto1.id,
    },
  });

  const cartItem2 = await prisma.cartItem.upsert({
    where: {
      userId_produtoId_tamanho_cor: {
        userId: user1.id,
        produtoId: produto3.id,
        tamanho: "G",
        cor: "Azul Escuro",
      },
    },
    update: {
      quantidade: 1,
    },
    create: {
      quantidade: 1,
      tamanho: "G",
      cor: "Azul Escuro",
      userId: user1.id,
      produtoId: produto3.id,
    },
  });

  console.log('✅ Itens do carrinho criados/atualizados');

  // ========================================
  // MÉTODOS DE PAGAMENTO - CORRIGIDO USANDO ENUM
  // ========================================

  const metodoPagamento1 = await prisma.metodoPagamento.upsert({
    where: { id: "metodo-pagamento-1" },
    update: {},
    create: {
      id: "metodo-pagamento-1",
      tipo: TipoPagamento.CARTAO_CREDITO, // Corrigido: usando enum
      ultimosDigitos: "1234",
      pagamentoDefault: true,
      userId: user1.id,
    },
  });

  const metodoPagamento2 = await prisma.metodoPagamento.upsert({
    where: { id: "metodo-pagamento-2" },
    update: {},
    create: {
      id: "metodo-pagamento-2",
      tipo: TipoPagamento.CARTAO_DEBITO, // Corrigido: usando enum
      ultimosDigitos: "5678",
      pagamentoDefault: false,
      userId: user1.id,
    },
  });

  console.log('✅ Métodos de pagamento criados');

  // ========================================
  // PEDIDOS
  // ========================================

  const pedido1 = await prisma.pedido.upsert({
    where: { numero: "PED-2024-001" },
    update: {},
    create: {
      numero: "PED-2024-001",
      status: "entregue",
      subtotal: 259.70,
      frete: 15.00,
      imposto: 41.96,
      total: 316.66,
      enderecoEntrega: {
        rua: "Rua das Flores",
        numero: "123",
        complemento: "Apto 101",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01000-000",
      },
      dataPagamento: new Date("2024-01-15"),
      dataEnvio: new Date("2024-01-16"),
      dataEntrega: new Date("2024-01-20"),
      codigoRastreio: "BR123456789",
      userId: user1.id,
      itens: {
        create: [
          {
            quantidade: 2,
            precoUnitario: 59.90,
            tamanho: "M",
            cor: "Preto",
            produtoId: produto1.id,
          },
          {
            quantidade: 1,
            precoUnitario: 199.90,
            tamanho: "G",
            cor: "Azul Escuro",
            produtoId: produto3.id,
          },
        ],
      },
    },
  });

  console.log('✅ Pedido criado:', pedido1.numero);

  // ========================================
  // AVALIAÇÕES
  // ========================================

  const avaliacao1 = await prisma.avaliacao.upsert({
    where: {
      userId_produtoId: {
        userId: user1.id,
        produtoId: produto1.id,
      },
    },
    update: {
      nota: 5,
      titulo: "Excelente produto!",
      comentario: "Camiseta muito confortável, tecido de qualidade. Recomendo!",
    },
    create: {
      nota: 5,
      titulo: "Excelente produto!",
      comentario: "Camiseta muito confortável, tecido de qualidade. Recomendo!",
      userId: user1.id,
      produtoId: produto1.id,
    },
  });

  const avaliacao2 = await prisma.avaliacao.upsert({
    where: {
      userId_produtoId: {
        userId: user2.id,
        produtoId: produto2.id,
      },
    },
    update: {
      nota: 4,
      titulo: "Vestido lindo",
      comentario: "Vestido muito bonito, tecido leve. Só achei um pouco largo.",
    },
    create: {
      nota: 4,
      titulo: "Vestido lindo",
      comentario: "Vestido muito bonito, tecido leve. Só achei um pouco largo.",
      userId: user2.id,
      produtoId: produto2.id,
    },
  });

  console.log('✅ Avaliações criadas');

  // ========================================
  // NOTIFICAÇÕES
  // ========================================

  const notificacao1 = await prisma.notificacao.upsert({
    where: { id: "notificacao-1" },
    update: {},
    create: {
      id: "notificacao-1",
      tipo: "promo",
      titulo: "Promoção imperdível!",
      mensagem: "Aproveite 20% OFF em toda loja usando o código PROMO20",
      lida: false,
      userId: user1.id,
    },
  });

  const notificacao2 = await prisma.notificacao.upsert({
    where: { id: "notificacao-2" },
    update: {},
    create: {
      id: "notificacao-2",
      tipo: "entrega",
      titulo: "Pedido entregue!",
      mensagem: `Seu pedido ${pedido1.numero} foi entregue com sucesso.`,
      lida: true,
      userId: user1.id,
    },
  });

  const notificacao3 = await prisma.notificacao.upsert({
    where: { id: "notificacao-3" },
    update: {},
    create: {
      id: "notificacao-3",
      tipo: "sistema",
      titulo: "Bem-vindo à Loja!",
      mensagem: "Obrigado por se cadastrar. Explore nossos produtos!",
      lida: false,
      userId: user2.id,
    },
  });

  console.log('✅ Notificações criadas');

  // ========================================
  // REFRESH TOKENS
  // ========================================

  const refreshToken1 = await prisma.refreshToken.upsert({
    where: { token: "sample_refresh_token_for_joao" },
    update: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      token: "sample_refresh_token_for_joao",
      userId: user1.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false,
    },
  });

  console.log('✅ Refresh token criado');

  console.log('🎉 Seeding finalizado com sucesso!');
  
  // Retorna resumo dos dados criados
  return {
    users: { user1, user2, admin },
    produtos: { produto1, produto2, produto3, produto4, produto5, produto6 },
    pedidos: { pedido1 },
    avaliacoes: { avaliacao1, avaliacao2 },
  };
}

// Executar seed
seedDatabase()
  .catch((e) => {
    console.error('❌ Erro durante seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });