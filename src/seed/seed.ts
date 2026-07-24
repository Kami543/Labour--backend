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
    // Se existe, atualiza (sem incluir imagens na atualização)
    const { imagens, ...updateData } = createData;
    return await prisma.produto.update({
      where: { id: existingProduto.id },
      data: updateData
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
  // PRODUTOS (COM PROMOÇÃO)
  // ========================================

  // Produto 1: Camiseta Básica (SEM PROMOÇÃO)
  const produto1 = await findOrCreateProduto("Camiseta Masculina Básica", {
    nome: "Camiseta Masculina Básica",
    slug: "camiseta-masculina-basica",
    descricao: "Camiseta de algodão 100% de alta qualidade, ideal para uso diário. Confortável e durável.",
    preco: 59.90,
    preco_promocional: null,
    desconto: 0,
    promocao_ativa: false,
    categoria: "Masculino",
    tag: "roupa",
    estoque: 100,
    cores: ["Preto", "Branco", "Azul Marinho", "Cinza"],
    tamanhos: ["P", "M", "G", "GG", "XG"],
    imagem: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"
  });

  // Produto 2: Vestido Floral (COM PROMOÇÃO - 20% OFF)
  const produto2 = await findOrCreateProduto("Vestido Floral Feminino", {
    nome: "Vestido Floral Feminino",
    slug: "vestido-floral-feminino",
    descricao: "Vestido elegante com estampa floral, tecido leve e fluido. Perfeito para ocasiões especiais.",
    preco: 129.90,
    preco_promocional: 103.92,
    desconto: 20,
    promocao_ativa: true,
    categoria: "Feminino",
    tag: "vestido",
    estoque: 50,
    cores: ["Vermelho", "Azul", "Rosa", "Amarelo"],
    tamanhos: ["P", "M", "G"],
    imagem: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=500"
  });

  // Produto 3: Jaqueta Jeans (COM PROMOÇÃO - 15% OFF)
  const produto3 = await findOrCreateProduto("Jaqueta Jeans Masculina", {
    nome: "Jaqueta Jeans Masculina",
    slug: "jaqueta-jeans-masculina",
    descricao: "Jaqueta jeans clássica com acabamento premium. Estilo casual e versátil.",
    preco: 199.90,
    preco_promocional: 169.92,
    desconto: 15,
    promocao_ativa: true,
    categoria: "Masculino",
    tag: "jaqueta",
    estoque: 30,
    cores: ["Azul Claro", "Azul Escuro", "Preto"],
    tamanhos: ["P", "M", "G", "GG"],
    imagem: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500"
  });

  // Produto 4: Bolsa de Couro (SEM PROMOÇÃO)
  const produto4 = await findOrCreateProduto("Bolsa Feminina de Couro", {
    nome: "Bolsa Feminina de Couro",
    slug: "bolsa-feminina-couro",
    descricao: "Bolsa elegante em couro legítimo, com alça ajustável e muitos compartimentos.",
    preco: 299.90,
    preco_promocional: null,
    desconto: 0,
    promocao_ativa: false,
    categoria: "Acessorios",
    tag: "bolsa",
    estoque: 25,
    cores: ["Preto", "Marrom", "Bege"],
    tamanhos: ["Único"],
    imagem: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500"
  });

  // Produto 5: Tênis Esportivo (COM PROMOÇÃO - 10% OFF)
  const produto5 = await findOrCreateProduto("Tênis Esportivo", {
    nome: "Tênis Esportivo",
    slug: "tenis-esportivo",
    descricao: "Tênis confortável para corrida e atividades físicas. Com amortecimento e respirabilidade.",
    preco: 249.90,
    preco_promocional: 224.91,
    desconto: 10,
    promocao_ativa: true,
    categoria: "Masculino",
    tag: "calcado",
    estoque: 80,
    cores: ["Preto/Branco", "Azul/Cinza", "Vermelho"],
    tamanhos: ["37", "38", "39", "40", "41", "42", "43"],
    imagem: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"
  });

  // Produto 6: Colar de Prata (COM PROMOÇÃO - 25% OFF - MAIOR DESCONTO)
  const produto6 = await findOrCreateProduto("Colar de Prata 925", {
    nome: "Colar de Prata 925",
    slug: "colar-prata-925",
    descricao: "Colar delicado em prata 925 com pingente de coração. Acabamento de alta qualidade.",
    preco: 89.90,
    preco_promocional: 67.43,
    desconto: 25,
    promocao_ativa: true,
    categoria: "Acessorios",
    tag: "joia",
    estoque: 150,
    cores: ["Prata"],
    tamanhos: ["40cm", "45cm", "50cm"],
    imagem: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500"
  });

  // Produto 7: Camisa Social (SEM PROMOÇÃO)
  const produto7 = await findOrCreateProduto("Camisa Social Masculina", {
    nome: "Camisa Social Masculina",
    slug: "camisa-social-masculina",
    descricao: "Camisa social de alta qualidade, perfeita para ocasiões formais e trabalho.",
    preco: 149.90,
    preco_promocional: null,
    desconto: 0,
    promocao_ativa: false,
    categoria: "Masculino",
    tag: "camisa",
    estoque: 60,
    cores: ["Branco", "Azul Claro", "Cinza"],
    tamanhos: ["P", "M", "G", "GG"],
    imagem: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500"
  });

  // Produto 8: Shorts Jeans (COM PROMOÇÃO - 30% OFF - LANÇAMENTO)
  const produto8 = await findOrCreateProduto("Shorts Jeans Feminino", {
    nome: "Shorts Jeans Feminino",
    slug: "shorts-jeans-feminino",
    descricao: "Shorts jeans moderno com cintura alta, ideal para looks casuais e despojados.",
    preco: 89.90,
    preco_promocional: 62.93,
    desconto: 30,
    promocao_ativa: true,
    categoria: "Feminino",
    tag: "short",
    estoque: 40,
    cores: ["Azul Claro", "Azul Escuro", "Preto"],
    tamanhos: ["P", "M", "G"],
    imagem: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500"
  });

  console.log('✅ Produtos criados:', { 
    produto1: produto1.nome,
    produto2: `${produto2.nome} (${produto2.desconto}% OFF)`,
    produto3: `${produto3.nome} (${produto3.desconto}% OFF)`,
    produto4: produto4.nome,
    produto5: `${produto5.nome} (${produto5.desconto}% OFF)`,
    produto6: `${produto6.nome} (${produto6.desconto}% OFF - MAIOR DESCONTO)`,
    produto7: produto7.nome,
    produto8: `${produto8.nome} (${produto8.desconto}% OFF - LANÇAMENTO)`,
  });

  // ========================================
  // ITENS DO CARRINHO
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

  const cartItem3 = await prisma.cartItem.upsert({
    where: {
      userId_produtoId_tamanho_cor: {
        userId: user2.id,
        produtoId: produto2.id,
        tamanho: "M",
        cor: "Vermelho",
      },
    },
    update: {
      quantidade: 1,
    },
    create: {
      quantidade: 1,
      tamanho: "M",
      cor: "Vermelho",
      userId: user2.id,
      produtoId: produto2.id,
    },
  });

  console.log('✅ Itens do carrinho criados/atualizados');

  // ========================================
  // MÉTODOS DE PAGAMENTO
  // ========================================

  const metodoPagamento1 = await prisma.metodoPagamento.upsert({
    where: { id: "metodo-pagamento-1" },
    update: {},
    create: {
      id: "metodo-pagamento-1",
      tipo: TipoPagamento.CARTAO_CREDITO,
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
      tipo: TipoPagamento.CARTAO_DEBITO,
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

  const avaliacao3 = await prisma.avaliacao.upsert({
    where: {
      userId_produtoId: {
        userId: user1.id,
        produtoId: produto6.id,
      },
    },
    update: {
      nota: 5,
      titulo: "Colar maravilhoso!",
      comentario: "O colar é lindo, acabamento impecável. Valeu cada centavo!",
    },
    create: {
      nota: 5,
      titulo: "Colar maravilhoso!",
      comentario: "O colar é lindo, acabamento impecável. Valeu cada centavo!",
      userId: user1.id,
      produtoId: produto6.id,
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
      titulo: "🔥 Ofertas imperdíveis!",
      mensagem: "Aproveite descontos de até 30% em produtos selecionados!",
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
      titulo: "📦 Pedido entregue!",
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
      titulo: "✨ Bem-vindo à Loja!",
      mensagem: "Obrigado por se cadastrar. Explore nossos produtos!",
      lida: false,
      userId: user2.id,
    },
  });

  const notificacao4 = await prisma.notificacao.upsert({
    where: { id: "notificacao-4" },
    update: {},
    create: {
      id: "notificacao-4",
      tipo: "promo",
      titulo: "💎 Oferta Especial!",
      mensagem: "Colar de Prata 925 com 25% OFF! Aproveite essa oportunidade única.",
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
    produtos: { 
      produto1, produto2, produto3, produto4, 
      produto5, produto6, produto7, produto8 
    },
    pedidos: { pedido1 },
    avaliacoes: { avaliacao1, avaliacao2, avaliacao3 },
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