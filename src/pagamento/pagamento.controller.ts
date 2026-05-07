import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PagamentoService } from './services/pagamento.service';
import { CreateMetodoPagamentoDto } from './dto/create-metodo-pagamento.dto';
import { ProcessarPagamentoDto } from './dto/processar-pagamento.dto';

@ApiTags('Pagamento')
@Controller('pagamento')
export class PagamentoController {
  private readonly logger = new Logger(PagamentoController.name);

  constructor(private readonly pagamentoService: PagamentoService) {}

  // ══════════════════════════════════════════════
  //  MÉTODOS DE PAGAMENTO SALVOS
  // ══════════════════════════════════════════════

  @Post('metodos')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Adicionar método de pagamento (cartão tokenizado, PIX)' })
  async createMetodoPagamento(
    @Req() req: any,
    @Body() dto: CreateMetodoPagamentoDto,
  ) {
    const userId = req.user.userId;
    this.logger.log(`Adicionando método de pagamento para usuário: ${userId}`);
    return this.pagamentoService.createMetodoPagamento(userId, dto);
  }

  @Get('metodos')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar métodos de pagamento salvos' })
  async findMetodosPagamento(@Req() req: any) {
    return this.pagamentoService.findMetodosPagamento(req.user.userId);
  }

  @Put('metodos/:id/default')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Definir método de pagamento como padrão' })
  @ApiParam({ name: 'id', type: String })
  async setDefaultMetodo(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pagamentoService.updateMetodoPagamentoDefault(req.user.userId, id);
  }

  @Delete('metodos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remover método de pagamento' })
  @ApiParam({ name: 'id', type: String })
  async deleteMetodoPagamento(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.pagamentoService.deleteMetodoPagamento(req.user.userId, id);
  }

  // ══════════════════════════════════════════════
  //  PROCESSAR PAGAMENTO
  // ══════════════════════════════════════════════

  @Post('processar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Processar pagamento (PIX com QR Code, boleto, cartão)',
    description: `
      Para **PIX**: retorna qrCodeBase64, qrCodeSvg, copiaCola e linkPagamento (deep link pix://).
      Para **Boleto**: retorna url e codigoBarras.
      Para **Cartão**: retorna status imediato com dados de parcelas.
    `,
  })
  @ApiResponse({ status: 200, description: 'Pagamento processado / PIX ou boleto gerado' })
  @ApiResponse({ status: 403, description: 'Transação bloqueada por análise anti-fraude' })
  @ApiResponse({ status: 409, description: 'Pedido já pago ou em status inválido' })
  async processarPagamento(
    @Req() req: any,
    @Body() dto: ProcessarPagamentoDto,
  ) {
    const userId = req.user.userId;
    // Injeta IP do cliente para análise anti-fraude
    dto.ipAddress = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0];

    this.logger.log(`Processando pagamento | usuário: ${userId} | pedido: ${dto.pedidoId} | tipo: ${dto.tipoPagamento}`);

    const result = await this.pagamentoService.processarPagamento(userId, dto);

    this.logger.log(`Pagamento processado | status: ${result.status} | tipo: ${result.tipo}`);
    return result;
  }

  // ══════════════════════════════════════════════
  //  STATUS DA TRANSAÇÃO (polling para PIX/boleto)
  // ══════════════════════════════════════════════

  @Get('transacao/:id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Consultar status de transação (polling para PIX e boleto)',
    description: 'Use em polling a cada 5s para saber se o PIX/boleto foi pago.',
  })
  @ApiParam({ name: 'id', description: 'ID da transação retornado em /processar' })
  async getTransacaoStatus(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pagamentoService.getTransacaoStatus(req.user.userId, id);
  }

  // ══════════════════════════════════════════════
  //  HISTÓRICO
  // ══════════════════════════════════════════════

  @Get('historico')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Histórico de pagamentos do usuário' })
  async getHistorico(@Req() req: any) {
    return this.pagamentoService.getHistoricoPagamentos(req.user.userId);
  }

  // ══════════════════════════════════════════════
  //  REEMBOLSO
  // ══════════════════════════════════════════════

  @Post('transacao/:id/reembolso')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Solicitar reembolso de transação paga' })
  @ApiParam({ name: 'id', description: 'ID da transação' })
  @ApiQuery({ name: 'valor', required: false, description: 'Valor parcial (omita para reembolso total)' })
  async reembolsar(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('valor') valor?: string,
  ) {
    await this.pagamentoService.reembolsar(
      req.user.userId,
      id,
      valor ? parseFloat(valor) : undefined,
    );
  }

  // ══════════════════════════════════════════════
  //  WEBHOOK — sem autenticação JWT (chamado pelo MP)
  // ══════════════════════════════════════════════

  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook do MercadoPago (não chamar manualmente)' })
  async webhookMercadoPago(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    this.logger.log(`Webhook MercadoPago recebido | type: ${body?.type} | id: ${body?.data?.id}`);

    const rawBody = req.rawBody?.toString() ?? JSON.stringify(body);

    await this.pagamentoService.processarWebhookMercadoPago(
      body,
      signature ?? '',
      requestId ?? '',
      rawBody,
    );

    // MercadoPago espera 200 imediatamente
    return { received: true };
  }
}