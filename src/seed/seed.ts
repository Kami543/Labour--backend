import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function findOrCreateProduto(nome: string, createData: any) {
  // Primeiro tenta encontrar o produto pelo nome
  const existingProduto = await prisma.produto.findFirst({
    where: { nome: nome }
  });
  
  if (existingProduto) {
    // Se existe, atualiza (opcional)
    return await prisma.produto.update({
      where: { id: existingProduto.id },
      data: createData
    });
  }
  
  // Se não existe, cria
  return await prisma.produto.create({
    data: createData
  });
}

export async function seedDatabase() {
  console.log('Start seeding...');

  const hashedPassword = await bcrypt.hash("password123", 10);

  const user1 = await prisma.user.upsert({
    where: { email: "joao.silva@example.com" },
    update: {},
    create: {
      nome: "João Silva",
      email: "joao.silva@example.com",
      cpf: "111.111.111-11",
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

  console.log({ user1, user2 });

  // Usando a função helper para produtos
  const produto1 = await findOrCreateProduto("Camiseta Masculina", {
    nome: "Camiseta Masculina",
    slug: "camiseta-masculina",
    descricao: "Camiseta de algodão de alta qualidade para homens.",
    preco: 59.90,
    imagem: "https://example.com/camiseta-masculina.jpg",
    categoria: "Masculino",
    tag: "roupa",
    estoque: 100,
    cores: ["Preto", "Branco", "Azul"],
    tamanhos: ["P", "M", "G", "GG"],
  });

  const produto2 = await findOrCreateProduto("Vestido Floral Feminino", {
    nome: "Vestido Floral Feminino",
    slug: "vestido-floral-feminino",
    descricao: "Vestido elegante com estampa floral para mulheres.",
    preco: 129.90,
    imagem: "https://example.com/vestido-floral-feminino.jpg",
    categoria: "Feminino",
    tag: "vestido",
    estoque: 50,
    cores: ["Vermelho", "Amarelo"],
    tamanhos: ["P", "M", "G"],
  });

  const produto3 = await findOrCreateProduto("Colar de Prata", {
    nome: "Colar de Prata",
    slug: "colar-de-prata",
    descricao: "Colar de prata 925 com pingente delicado.",
    preco: 89.90,
    imagem: "https://example.com/colar-de-prata.jpg",
    categoria: "Acessorios",
    tag: "joia",
    estoque: 200,
    cores: ["Prata"],
    tamanhos: ["Único"],
  });

  console.log({ produto1, produto2, produto3 });

  // Resto do seu código continua igual...
  const cartItem1 = await prisma.cartItem.upsert({
    where: { id: "cartitem1" },
    update: {},
    create: {
      id: "cartitem1",
      quantidade: 2,
      tamanho: "M",
      cor: "Preto",
      userId: user1.id,
      produtoId: produto1.id,
    },
  });
  console.log({ cartItem1 });

  const metodoPagamento1 = await prisma.metodoPagamento.upsert({
    where: { id: "metodopagamento1" },
    update: {},
    create: {
      id: "metodopagamento1",
      tipo: "Cartão de Crédito",
      ultimosDigitos: "1234",
      pagamentoDefault: true,
      userId: user1.id,
    },
  });
  console.log({ metodoPagamento1 });

  const pedido1 = await prisma.pedido.upsert({
    where: { numero: "pedido1" },
    update: {},
    create: {
      numero: "pedido1",
      status: "pagamento_confirmado",
      subtotal: 119.80,
      frete: 10.00,
      imposto: 5.00,
      total: 134.80,
      enderecoEntrega: {
        rua: "Rua das Flores",
        numero: "123",
        complemento: "Apto 101",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01000-000",
      },
      dataPagamento: new Date(),
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
        ],
      },
    },
  });
  console.log({ pedido1 });

  const avaliacao1 = await prisma.avaliacao.upsert({
    where: { userId_produtoId: { userId: user1.id, produtoId: produto1.id } },
    update: {},
    create: {
      nota: 5,
      titulo: "Excelente produto!",
      comentario: "Adorei a camiseta, muito confortável e de boa qualidade.",
      userId: user1.id,
      produtoId: produto1.id,
    },
  });
  console.log({ avaliacao1 });

  const notificacao1 = await prisma.notificacao.upsert({
    where: { id: "notificacao1" },
    update: {},
    create: {
      id: "notificacao1",
      tipo: "promo",
      titulo: "Promoção Imperdível!",
      mensagem: "Confira nossos novos produtos com descontos especiais.",
      userId: user1.id,
    },
  });
  console.log({ notificacao1 });

  const refreshToken1 = await prisma.refreshToken.upsert({
    where: { token: "some_refresh_token_string_1" },
    update: {},
    create: {
      token: "some_refresh_token_string_1",
      userId: user1.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false,
    },
  });
  console.log({ refreshToken1 });

  console.log('Seeding finished.');
}