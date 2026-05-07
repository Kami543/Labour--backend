// src/modules/avaliacoes/avaliacoes.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AvaliacaoRepository } from './avaliacao.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { PedidoRepository } from '../pedidos/pedido.repository';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto';
import { UpdateAvaliacaoDto } from './dto/update-avaliacao.dto';

@Injectable()
export class AvaliacoesService {
  constructor(
    private avaliacaoRepository: AvaliacaoRepository,
    private produtoRepository: ProdutoRepository,
    private pedidoRepository: PedidoRepository,
  ) {}

  async create(userId: string, createAvaliacaoDto: CreateAvaliacaoDto) {
    const { produtoId, nota, titulo, comentario } = createAvaliacaoDto;

    // Verifica se o produto existe
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Verifica se o usuário já avaliou
    const existingAvaliacao = await this.avaliacaoRepository.findUniqueByUserAndProduto(
      userId,
      produtoId
    );
    if (existingAvaliacao) {
      throw new BadRequestException('Você já avaliou este produto');
    }

    // Verifica se o usuário comprou o produto
    const pedidos = await this.pedidoRepository.findByUser(userId);
    const hasPurchased = pedidos.some(pedido =>
      pedido.itens.some(item => item.produtoId === produtoId) &&
      pedido.status === 'entregue'
    );

    if (!hasPurchased) {
      throw new BadRequestException('Você só pode avaliar produtos que comprou');
    }

    return this.avaliacaoRepository.createAvaliacao({
      userId,
      produtoId,
      nota,
      titulo,
      comentario
    });
  }

  async findByProduto(produtoId: string, page = 1, limit = 10) {
    const [data, total, media, distribuicao] = await Promise.all([
      this.avaliacaoRepository.findByProduto(produtoId, page, limit),
      this.avaliacaoRepository.countByProduto(produtoId),
      this.avaliacaoRepository.getMediaNota(produtoId),
      this.avaliacaoRepository.getDistribuicaoNotas(produtoId),
    ]);

    return {
      data,
      total,
      page,
      limit,
      media,
      distribuicao
    };
  }

  async findUserAvaliacoes(userId: string) {
    return this.avaliacaoRepository.findByUser(userId);
  }

  async update(userId: string, avaliacaoId: string, updateDto: UpdateAvaliacaoDto) {
    const avaliacao = await this.avaliacaoRepository.findByIdAndUser(avaliacaoId, userId);
    if (!avaliacao) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    return this.avaliacaoRepository.updateAvaliacao(avaliacaoId, updateDto);
  }

  async delete(userId: string, avaliacaoId: string) {
    const avaliacao = await this.avaliacaoRepository.findByIdAndUser(avaliacaoId, userId);
    if (!avaliacao) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    await this.avaliacaoRepository.deleteById(avaliacaoId);
    return { message: 'Avaliação removida com sucesso' };
  }

  async getProdutoRating(produtoId: string) {
    const [media, totalAvaliacoes, distribuicao] = await Promise.all([
      this.avaliacaoRepository.getMediaNota(produtoId),
      this.avaliacaoRepository.countByProduto(produtoId),
      this.avaliacaoRepository.getDistribuicaoNotas(produtoId),
    ]);

    return { media, totalAvaliacoes, distribuicao };
  }
}
