import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MotivoPhotocheck } from '@prisma/client';

/**
 * Servicio dedicado al log de generacion de photocheck (carnet) de empleados.
 *
 * Extraido de EmpleadosService para mantener el archivo principal por debajo
 * de 400 LOC y agrupar por subdominio (cada vez que un usuario genera un
 * carnet/photocheck queda registrado aqui con motivo y observaciones).
 */
@Injectable()
export class EmpleadoPhotocheckService {
  constructor(private prisma: PrismaService) {}

  async registrarLog(
    empleadoId: number,
    empresaId: number,
    usuarioId: number,
    motivo: string,
    observaciones?: string,
    ipAddress?: string,
  ) {
    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Validar motivo
    const motivosValidos = ['NUEVO', 'RENOVACION', 'PERDIDA', 'DETERIORO'];
    const motivoUpper = motivo.toUpperCase();
    if (!motivosValidos.includes(motivoUpper)) {
      throw new ConflictException(
        `Motivo inválido. Debe ser uno de: ${motivosValidos.join(', ')}`,
      );
    }

    return this.prisma.photocheckLog.create({
      data: {
        empleado_id: empleadoId,
        generado_por: usuarioId,
        motivo: motivoUpper as MotivoPhotocheck,
        observaciones,
        ip_address: ipAddress,
      },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre_completo: true,
          },
        },
      },
    });
  }

  async getLogs(empleadoId: number, empresaId: number) {
    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return this.prisma.photocheckLog.findMany({
      where: { empleado_id: empleadoId },
      orderBy: { fecha_generacion: 'desc' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre_completo: true,
          },
        },
      },
    });
  }
}
