// user/user.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiBearerAuth('access-token')
@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiBody({ description: 'Dados para criar um novo usuário', type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email ou CPF já cadastrado' })
  async create(@Body() createUserDto: CreateUserDto) {
    this.logger.log('Criando um novo usuário...');
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Buscar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso' })
  async findAll() {
    this.logger.log('Buscando todos os usuários...');
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um usuário por ID' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findById(@Param('id') id: string) {
    this.logger.log(`Buscando usuário com ID ${id}...`);
    return this.userService.findById(id);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Buscar usuário com detalhes (pedidos, carrinho, notificações)' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  async findDetail(@Param('id') id: string) {
    this.logger.log(`Buscando detalhes do usuário com ID ${id}...`);
    return this.userService.findDetail(id);
  }

  @Get(':id/pedidos')
  @ApiOperation({ summary: 'Buscar pedidos do usuário' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  async getPedidos(@Param('id') id: string) {
    this.logger.log(`Buscando pedidos do usuário ${id}...`);
    return this.userService.getPedidos(id);
  }

  @Get(':id/carrinho')
  @ApiOperation({ summary: 'Buscar carrinho do usuário' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  async getCarrinho(@Param('id') id: string) {
    this.logger.log(`Buscando carrinho do usuário ${id}...`);
    return this.userService.getCarrinho(id);
  }

  @Get(':id/notificacoes')
  @ApiOperation({ summary: 'Buscar notificações do usuário' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  @ApiQuery({ name: 'lidas', required: false, type: Boolean, description: 'Filtrar por lidas ou não lidas' })
  async getNotificacoes(@Param('id') id: string, @Query('lidas') lidas: string = 'false') {
    const lidasBool = lidas === 'true';
    this.logger.log(`Buscando notificações do usuário ${id}...`);
    return this.userService.getNotificacoes(id, lidasBool);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar um usuário' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  @ApiBody({ description: 'Dados para atualizar o usuário', type: UpdateUserDto })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    this.logger.log(`Atualizando usuário com ID ${id}...`);
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um usuário' })
  @ApiParam({ name: 'id', required: true, description: 'ID do usuário' })
  @ApiResponse({ status: 204, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deletando usuário com ID ${id}...`);
    return this.userService.delete(id);
  }
}