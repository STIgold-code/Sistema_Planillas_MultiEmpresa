import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { ahoraPeru } from '../../common/utils/datetime.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario con rol y empresa
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
        empresa: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último acceso
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimo_acceso: ahoraPeru().toJSDate() },
    });

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Excluir password del response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pass, ...userWithoutPassword } = user;

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      usuario: userWithoutPassword,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refresh_token } = refreshTokenDto;

    try {
      // Verificar si el token está revocado
      const isRevoked = await this.isTokenRevoked(refresh_token);
      if (isRevoked) {
        throw new UnauthorizedException(
          'Token de refresco inválido o revocado',
        );
      }

      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.prisma.usuario.findUnique({
        where: { id: parseInt(payload.sub, 10) },
        include: {
          rol: true,
          empresa: true,
        },
      });

      if (!user || !user.activo) {
        throw new UnauthorizedException('Usuario no autorizado');
      }

      const tokens = await this.generateTokens(user.id, user.email);

      // Token Rotation: revocar el refresh token usado para prevenir replay attacks
      await this.revokeToken(refresh_token, user.id);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _pass2, ...userWithoutPassword } = user;

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        usuario: userWithoutPassword,
      };
    } catch (error: unknown) {
      // Distinguir tipos de error para mejor debugging y UX
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token de refresco expirado');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Token de refresco inválido');
      }
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw our own exceptions
      }
      // Log errores inesperados para debugging
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error inesperado en refresh: ${errorMessage}`,
        errorStack,
      );
      throw new UnauthorizedException('Error al refrescar token');
    }
  }

  async getMe(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        rol: true,
        empresa: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pass3, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId.toString(), email };

    const accessExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '30m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        // expiresIn requiere StringValue pero config retorna string
        expiresIn: accessExpiresIn as import('ms').StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn as import('ms').StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Revoca un refresh token para invalidarlo
   */
  async revokeToken(refreshToken: string, userId?: number) {
    try {
      const tokenHash = this.hashToken(refreshToken);

      // Decodificar token para obtener fecha de expiración
      const payload = this.jwtService.decode<{ exp?: number }>(refreshToken);
      const expiresAt = payload?.exp
        ? new Date(payload.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días por defecto

      await this.prisma.tokenRevocado.create({
        data: {
          token_hash: tokenHash,
          usuario_id: userId,
          expires_at: expiresAt,
        },
      });

      return true;
    } catch (error: unknown) {
      // Si el token ya está revocado (duplicado), ignorar
      // P2002 es el código de Prisma para unique constraint violation
      if (
        error instanceof Object &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        return true;
      }
      throw error;
    }
  }

  /**
   * Verifica si un token está revocado
   */
  async isTokenRevoked(refreshToken: string): Promise<boolean> {
    const tokenHash = this.hashToken(refreshToken);

    const revoked = await this.prisma.tokenRevocado.findUnique({
      where: { token_hash: tokenHash },
    });

    return !!revoked;
  }

  /**
   * Genera un hash SHA256 del token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Limpia tokens revocados expirados (ejecutar periódicamente)
   */
  async cleanupExpiredTokens() {
    const result = await this.prisma.tokenRevocado.deleteMany({
      where: {
        expires_at: {
          lt: ahoraPeru().toJSDate(),
        },
      },
    });

    return result.count;
  }

  /**
   * Revoca todos los tokens de un usuario (usado al cambiar contraseña)
   * Incrementa un contador de versión en el usuario para invalidar todos los tokens existentes
   */
  async revokeAllUserTokens(userId: number) {
    // Actualizar timestamp de revocación en el usuario
    // Todos los tokens emitidos antes de esta fecha serán inválidos
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { tokens_revocados_at: ahoraPeru().toJSDate() },
    });

    return true;
  }

  /**
   * Verifica si un token fue emitido antes de la revocación
   */
  async isTokenIssuedBeforeRevocation(
    userId: number,
    tokenIssuedAt: Date,
  ): Promise<boolean> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { tokens_revocados_at: true },
    });

    if (!user?.tokens_revocados_at) {
      return false; // No hay revocación registrada
    }

    return tokenIssuedAt < user.tokens_revocados_at;
  }
}
