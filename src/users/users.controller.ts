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
  UseGuards,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiBearerAuth('access-token')
@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo usuário' })
  async create(@Body() createUserDto: CreateUserDto) {
    this.logger.log('Criando um novo usuário...');
    return this.userService.create(createUserDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar dados do usuário logado' })
  async findMe(@CurrentUser('sub') id: string) {
    this.logger.log(`Buscando dados do usuário logado com ID ${id}...`);
    return this.userService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard) // Protegido para que apenas usuários logados vejam a lista
  @ApiOperation({ summary: 'Buscar todos os usuários' })
  async findAll() {
    this.logger.log('Buscando todos os usuários...');
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar um usuário por ID' })
  async findById(@Param('id') id: string) {
    this.logger.log(`Buscando usuário com ID ${id}...`);
    return this.userService.findById(id);
  }

  @Get(':id/detail')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar usuário com detalhes' })
  async findDetail(@Param('id') id: string) {
    this.logger.log(`Buscando detalhes do usuário com ID ${id}...`);
    return this.userService.findDetail(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar um usuário' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    this.logger.log(`Atualizando usuário com ID ${id}...`);
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um usuário' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deletando usuário com ID ${id}...`);
    return this.userService.delete(id);
  }
}