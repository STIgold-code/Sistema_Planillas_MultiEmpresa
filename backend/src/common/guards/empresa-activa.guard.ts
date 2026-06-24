import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/auth.types';

/**
 * Resuelve la "empresa activa" de la petición.
 *
 * Por defecto, cada usuario opera sobre su empresa propia (`user.empresa_id`,
 * cargada en el JwtAuthGuard). Un **superadmin** (rol con permiso `'*'`) puede
 * cambiar de empresa enviando el header `X-Empresa-Activa: <id>`. En ese caso,
 * tras validar que la empresa existe, se sobrescribe `user.empresa_id` (y
 * `user.empresa`) con la empresa activa — de modo que los ~326 consumidores de
 * `user.empresa_id` operan sobre ella sin cambios.
 *
 * Reglas de seguridad (no negociables):
 * - El header SOLO se honra para superadmins; para el resto se ignora.
 * - La empresa activa SIEMPRE se valida (debe existir).
 * - Default seguro: sin header válido, se mantiene la empresa propia.
 */
@Injectable()
export class EmpresaActivaGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    // Sin usuario autenticado: no es asunto de este guard.
    if (!user) {
      return true;
    }

    const headerValor = request.headers['x-empresa-activa'];
    const header = Array.isArray(headerValor) ? headerValor[0] : headerValor;

    // Sin header: la empresa activa es la propia (comportamiento actual).
    if (!header) {
      return true;
    }

    // Solo un superadmin puede cambiar de empresa; para el resto se ignora.
    const esSuperadmin = user.rol?.permisos?.includes('*') ?? false;
    if (!esSuperadmin) {
      return true;
    }

    const empresaId = Number(header);
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      throw new BadRequestException('Empresa activa inválida');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        ruc: true,
        razon_social: true,
        nombre_comercial: true,
        direccion: true,
        telefono: true,
        email: true,
        representante_legal: true,
        dni_representante: true,
        cargo_representante: true,
        partida_electronica: true,
        logo_url: true,
        firma_representante_url: true,
        activo: true,
        created_at: true,
      },
    });

    if (!empresa) {
      throw new ForbiddenException('Empresa no encontrada o sin acceso');
    }

    // Sobrescribir la empresa activa: a partir de aquí, todos los módulos
    // operan sobre ella (incluida la auditoría, que lee user.empresa_id).
    user.empresa_id = empresa.id;
    user.empresa = empresa;
    return true;
  }
}
