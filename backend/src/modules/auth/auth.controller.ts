import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { Public, CurrentUser } from '../../common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * SEGURIDAD: Rate limiting estricto para prevenir ataques de fuerza bruta
   * Límite: 5 intentos por minuto, 20 por hora
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 1000, limit: 2 }, // 2 por segundo
    medium: { ttl: 60000, limit: 5 }, // 5 por minuto
    long: { ttl: 3600000, limit: 20 }, // 20 por hora
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * SEGURIDAD: Rate limiting para refresh token
   * Límite: 10 por minuto, 100 por hora
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { ttl: 1000, limit: 3 }, // 3 por segundo
    medium: { ttl: 60000, limit: 10 }, // 10 por minuto
    long: { ttl: 3600000, limit: 100 }, // 100 por hora
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() logoutDto: RefreshTokenDto,
    @CurrentUser('id') userId: number,
  ) {
    await this.authService.revokeToken(logoutDto.refresh_token, userId);
    return { message: 'Sesion cerrada correctamente' };
  }

  @Get('me')
  async getMe(@CurrentUser('id') userId: number) {
    return this.authService.getMe(userId);
  }
}
