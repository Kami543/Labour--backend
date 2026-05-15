import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`📝 Tentativa de registro com email: ${registerDto.email}`);
    
    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(`✅ Usuário registrado com sucesso: ${registerDto.email}`);
      return result;
    } catch (error:any) {
      this.logger.error(`❌ Erro no registro: ${error.message}`);
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`🔐 Tentativa de login com email: ${loginDto.email}`);
    
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(`✅ Login realizado com sucesso: ${loginDto.email}`);
      return result;
    } catch (error:any) {
      this.logger.error(`❌ Falha no login para ${loginDto.email}: ${error.message}`);
      throw error;
    }
  }
}