import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET environment variable is required. Please set it in your .env file.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
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

    // SEGURIDAD: Verificar si el rol está activo
    if (!user.rol.activo) {
      throw new UnauthorizedException('Rol de usuario desactivado');
    }

    // SEGURIDAD: Verificar si el token fue emitido antes de la revocación
    if (user.tokens_revocados_at && payload.iat) {
      const tokenIssuedAt = new Date(payload.iat * 1000); // Convertir segundos a millisegundos
      if (tokenIssuedAt < user.tokens_revocados_at) {
        throw new UnauthorizedException(
          'Sesión expirada. Por favor inicie sesión nuevamente.',
        );
      }
    }

    // Excluir password del objeto retornado
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
