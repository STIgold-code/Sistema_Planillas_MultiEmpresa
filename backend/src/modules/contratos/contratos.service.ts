import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  BUSINESS_ERROR_MESSAGES,
  validarSueldoMinimo,
} from '../../common/constants/business-rules';
import { CreateContratoDto, UpdateContratoDto, FilterContratoDto } from './dto';
import { Prisma } from '@prisma/client';
import {
  ahoraPeru,
  formatearFechaPeru,
  sumarDiasPeru,
  finDelDiaPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';
import { ContratoLifecycleService } from './contrato-lifecycle.service';

@Injectable()
export class ContratosService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private contratoLifecycleService: ContratoLifecycleService,
  ) {}

  async findAll(empresaId: number, filters: FilterContratoDto) {
    const {
      buscar,
      empleado_id,
      estado,
      tipo_contrato,
      fecha_desde,
      fecha_hasta,
      por_vencer,
      orden = 'desc',
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ContratoWhereInput = {
      empleado: {
        empresa_id: empresaId,
      },
    };

    // Filtro por empleado específico
    if (empleado_id) {
      where.empleado_id = empleado_id;
    }

    // Filtro por estado
    if (estado) {
      where.estado = estado;
    }

    // Filtro por tipo de contrato
    if (tipo_contrato) {
      where.tipo_contrato = { contains: tipo_contrato, mode: 'insensitive' };
    }

    // Filtro por búsqueda (ID, nombre o documento del empleado)
    if (buscar) {
      const orConditions: Prisma.EmpleadoWhereInput[] = [
        { numero_documento: { contains: buscar, mode: 'insensitive' } },
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
        { apellido_materno: { contains: buscar, mode: 'insensitive' } },
      ];
      const idNumerico = parseInt(buscar, 10);
      if (!isNaN(idNumerico)) {
        orConditions.push({ id: idNumerico });
      }
      where.empleado = {
        ...(where.empleado as Prisma.EmpleadoWhereInput),
        OR: orConditions,
      };
    }

    // Filtro por rango de fecha de inicio
    if (fecha_desde || fecha_hasta) {
      where.fecha_inicio = {};
      if (fecha_desde) {
        where.fecha_inicio.gte = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        where.fecha_inicio.lte = new Date(fecha_hasta + 'T23:59:59.999Z');
      }
    }

    // Filtro por contratos por vencer (próximos 30 días) - usando zona horaria Peru
    if (por_vencer) {
      const hoy = ahoraPeru().startOf('day').toJSDate();
      const en30Dias = finDelDiaPeru(sumarDiasPeru(hoy, 30));

      where.fecha_fin = {
        gte: hoy,
        lte: en30Dias,
      };
      where.estado = 'ACTIVO';
    }

    const [data, total] = await Promise.all([
      this.prisma.contrato.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_inicio: orden },
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              area: { select: { id: true, nombre: true } },
              cargo: { select: { id: true, nombre: true } },
              movimientos: {
                where: { tipo_movimiento: { in: ['BAJA', 'RENUNCIA'] } },
                orderBy: { fecha_movimiento: 'desc' },
                take: 1,
                select: {
                  fecha_movimiento: true,
                  motivo: true,
                  observaciones: true,
                },
              },
            },
          },
          usuario: {
            select: { id: true, nombre_completo: true },
          },
          cliente: {
            select: {
              id: true,
              ruc: true,
              razon_social: true,
              nombre_comercial: true,
            },
          },
          plantilla: {
            select: {
              id: true,
              nombre: true,
            },
          },
          vinculo_laboral: {
            select: {
              id: true,
              fecha_inicio: true,
              fecha_fin: true,
              estado: true,
              motivo_cierre: true,
            },
          },
        },
      }),
      this.prisma.contrato.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, empresaId: number) {
    const contrato = await this.prisma.contrato.findFirst({
      where: {
        id,
        empleado: { empresa_id: empresaId },
      },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            tipo_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            fecha_ingreso: true,
            area: { select: { id: true, nombre: true } },
            cargo: { select: { id: true, nombre: true } },
          },
        },
        vinculo_laboral: {
          select: {
            id: true,
            fecha_inicio: true,
            fecha_fin: true,
            estado: true,
            motivo_cierre: true,
          },
        },
        usuario: {
          select: { id: true, nombre_completo: true, email: true },
        },
        cliente: {
          select: {
            id: true,
            ruc: true,
            razon_social: true,
            nombre_comercial: true,
          },
        },
      },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }

    return contrato;
  }

  async create(empresaId: number, dto: CreateContratoDto, usuarioId: number) {
    // Validaciones síncronas (no requieren BD) - se hacen fuera de la transacción
    // Usar parsearFechaISOenPeru para interpretar fechas en zona horaria Peru (UTC-5)
    // Esto evita el bug donde "2025-01-08" se interpreta como midnight UTC y se muestra como 07/01
    const fechaInicio = parsearFechaISOenPeru(dto.fecha_inicio);
    const fechaFin = dto.fecha_fin
      ? parsearFechaISOenPeru(dto.fecha_fin)
      : null;

    // Validación: Remuneración mínima legal
    if (dto.remuneracion && !validarSueldoMinimo(dto.remuneracion)) {
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.SUELDO_MENOR_MINIMO}. Remuneración ingresada: S/. ${dto.remuneracion}`,
      );
    }

    // Validación: fecha_fin debe ser posterior a fecha_inicio
    if (fechaFin && fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // SEGURIDAD (mass assignment + IDOR): validar que el archivo referenciado
    // pertenezca a esta empresa. Evita que el cliente persista una URL de un
    // documento de otra empresa.
    const archivoUrl = dto.archivo_url
      ? await this.uploadsService.resolverKeyPropia(dto.archivo_url, empresaId)
      : dto.archivo_url;

    // TRANSACCIÓN: Todas las validaciones de BD y creación en una sola transacción
    // Esto previene race conditions donde dos requests paralelos crean contratos duplicados
    return this.prisma.$transaction(async (tx) => {
      // Verificar que el empleado pertenece a la empresa
      const empleado = await tx.empleado.findFirst({
        where: {
          id: dto.empleado_id,
          empresa_id: empresaId,
        },
      });

      if (!empleado) {
        throw new BadRequestException(
          'El empleado no existe o no pertenece a esta empresa',
        );
      }

      // VALIDACIÓN: No permitir crear contrato para empleado CESADO
      if (empleado.estado === 'CESADO') {
        throw new BadRequestException(
          'No se puede crear un contrato para un empleado cesado. Use la opción de reingreso.',
        );
      }

      // Verificar si ya existe un contrato VIGENTE para este empleado
      const contratoVigente = await tx.contrato.findFirst({
        where: {
          empleado_id: dto.empleado_id,
          estado: 'ACTIVO',
        },
      });

      if (contratoVigente) {
        throw new BadRequestException(
          'El empleado ya tiene un contrato vigente. Debe terminar o renovar el contrato actual primero.',
        );
      }

      // VALIDACIÓN: Verificar que no haya contratos superpuestos en fechas
      const contratoSuperpuesto = await tx.contrato.findFirst({
        where: {
          empleado_id: dto.empleado_id,
          estado: { in: ['ACTIVO', 'RENOVADO'] },
          OR: [
            // El nuevo contrato inicia durante uno existente
            {
              fecha_inicio: { lte: fechaInicio },
              OR: [
                { fecha_fin: { gte: fechaInicio } },
                { fecha_fin: null }, // Contrato indefinido
              ],
            },
            // El nuevo contrato termina durante uno existente
            ...(fechaFin
              ? [
                  {
                    fecha_inicio: { lte: fechaFin },
                    OR: [{ fecha_fin: { gte: fechaFin } }, { fecha_fin: null }],
                  },
                ]
              : []),
            // El nuevo contrato envuelve uno existente
            ...(fechaFin
              ? [
                  {
                    fecha_inicio: { gte: fechaInicio },
                    fecha_fin: { lte: fechaFin },
                  },
                ]
              : []),
          ],
        },
      });

      if (contratoSuperpuesto) {
        throw new BadRequestException(
          `Ya existe un contrato que se superpone con las fechas indicadas (${formatearFechaPeru(contratoSuperpuesto.fecha_inicio)} - ${contratoSuperpuesto.fecha_fin ? formatearFechaPeru(contratoSuperpuesto.fecha_fin) : 'Indefinido'})`,
        );
      }

      // Buscar o crear vínculo laboral activo para el empleado
      let vinculoLaboral = await tx.vinculoLaboral.findFirst({
        where: {
          empleado_id: dto.empleado_id,
          estado: 'ACTIVO',
        },
      });

      if (!vinculoLaboral) {
        // Crear nuevo vínculo laboral
        vinculoLaboral = await tx.vinculoLaboral.create({
          data: {
            empleado_id: dto.empleado_id,
            empresa_id: empresaId,
            fecha_inicio: fechaInicio,
            estado: 'ACTIVO',
          },
        });
      }

      // Actualizar el cargo del empleado si se envió uno. El cargo vive en
      // Empleado (el contrato no lo versiona); se valida que pertenezca a la
      // empresa, igual que en la renovación.
      if (dto.cargo_id) {
        const cargo = await tx.cargo.findFirst({
          where: { id: dto.cargo_id, empresa_id: empresaId },
        });
        if (!cargo) {
          throw new BadRequestException('El cargo seleccionado no existe');
        }
        await tx.empleado.update({
          where: { id: dto.empleado_id },
          data: { cargo_id: dto.cargo_id },
        });
      }

      // Crear contrato dentro de la transacción
      const nuevoContrato = await tx.contrato.create({
        data: {
          empleado_id: dto.empleado_id,
          vinculo_laboral_id: vinculoLaboral.id,
          tipo_contrato: dto.tipo_contrato,
          modalidad: dto.modalidad,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado: dto.estado || 'ACTIVO',
          renovar: dto.renovar ?? false,
          remuneracion: dto.remuneracion,
          observaciones: dto.observaciones,
          archivo_url: archivoUrl,
          empresa_cliente: dto.empresa_cliente,
          cliente_id: dto.cliente_id,
          lugar_trabajo: dto.lugar_trabajo,
          // Override opcional del régimen laboral. Si no viene, queda null y el
          // motor de cálculo hereda el regimen_laboral_default de la empresa.
          regimen_laboral: dto.regimen_laboral ?? null,
          usuario_id: usuarioId,
        },
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              fecha_cese: true,
            },
          },
          cliente: {
            select: {
              id: true,
              ruc: true,
              razon_social: true,
              nombre_comercial: true,
            },
          },
        },
      });

      // Si se crea contrato VIGENTE y el empleado tiene fecha_cese, limpiarla
      if (
        (dto.estado || 'ACTIVO') === 'ACTIVO' &&
        nuevoContrato.empleado.fecha_cese
      ) {
        await tx.empleado.update({
          where: { id: dto.empleado_id },
          data: { fecha_cese: null },
        });
      }

      return nuevoContrato;
    });
  }

  async update(id: number, empresaId: number, dto: UpdateContratoDto) {
    return this.prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findFirst({
        where: { id, empleado: { empresa_id: empresaId } },
        include: {
          empleado: { select: { empresa_id: true } },
          cliente: { select: { id: true } },
        },
      });

      if (!contrato) {
        throw new NotFoundException('Contrato no encontrado');
      }

      // Validación: No permitir modificar contratos TERMINADO
      if (contrato.estado === 'CESADO') {
        throw new BadRequestException(
          'No se puede modificar un contrato terminado',
        );
      }

      // Validación: Si se cambia cliente_id, verificar que pertenece a la empresa
      if (dto.cliente_id && dto.cliente_id !== contrato.cliente_id) {
        const cliente = await tx.cliente.findFirst({
          where: { id: dto.cliente_id, empresa_id: empresaId },
        });
        if (!cliente) {
          throw new BadRequestException(
            'El cliente seleccionado no pertenece a su empresa',
          );
        }
      }

      // Separar campos que requieren transformación o no deben persistirse
      // tal cual (fechas como string, empleado_id inmutable).
      const { fecha_inicio, fecha_fin, ...restoDto } = dto;
      // empleado_id es inmutable: no debe persistirse en la actualización.
      delete restoDto.empleado_id;

      const updateData: Prisma.ContratoUncheckedUpdateInput = { ...restoDto };

      // Convertir fechas usando timezone Peru
      if (fecha_inicio)
        updateData.fecha_inicio = parsearFechaISOenPeru(fecha_inicio);
      if (fecha_fin) updateData.fecha_fin = parsearFechaISOenPeru(fecha_fin);

      // SEGURIDAD (mass assignment + IDOR): validar propiedad del archivo
      // referenciado contra la empresa antes de persistirlo.
      if (dto.archivo_url !== undefined && dto.archivo_url !== null) {
        updateData.archivo_url = await this.uploadsService.resolverKeyPropia(
          dto.archivo_url,
          empresaId,
        );
      }

      return tx.contrato.update({
        where: { id },
        data: updateData,
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
          cliente: {
            select: {
              id: true,
              ruc: true,
              razon_social: true,
              nombre_comercial: true,
            },
          },
        },
      });
    });
  }

  async remove(id: number, empresaId: number) {
    const contrato = await this.findOne(id, empresaId);

    // No permitir eliminar contratos vigentes - deben terminarse primero
    if (contrato.estado === 'ACTIVO') {
      throw new BadRequestException(
        'No se puede eliminar un contrato vigente. Primero debe terminarlo usando el endpoint correspondiente.',
      );
    }

    await this.prisma.contrato.delete({
      where: { id },
    });

    return { message: 'Contrato eliminado correctamente' };
  }

  // Renovar contrato (marca el actual como RENOVADO y crea uno nuevo con historial)
  async renovar(
    id: number,
    empresaId: number,
    dto: CreateContratoDto,
    usuarioId: number,
  ) {
    const contratoActual = await this.findOne(id, empresaId);
    return this.contratoLifecycleService.renovar(
      id,
      empresaId,
      dto,
      usuarioId,
      contratoActual,
    );
  }

  // Reingreso: crear contrato y reactivar empleado en CESADO
  async reingreso(
    empresaId: number,
    dto: CreateContratoDto,
    usuarioId: number,
  ) {
    return this.contratoLifecycleService.reingreso(empresaId, dto, usuarioId);
  }

  // Terminar contrato anticipadamente
  async terminar(id: number, empresaId: number, motivo?: string) {
    const contrato = await this.findOne(id, empresaId);
    return this.contratoLifecycleService.terminar(id, contrato, motivo);
  }

  // Obtener resumen de contratos para dashboard - usando zona horaria Peru
  async getResumen(empresaId: number) {
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const en30Dias = finDelDiaPeru(sumarDiasPeru(hoy, 30));

    const [vigentes, porVencer, vencidos, terminados, empleadosBaja] =
      await Promise.all([
        this.prisma.contrato.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'ACTIVO',
          },
        }),
        this.prisma.contrato.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'ACTIVO',
            fecha_fin: {
              gte: hoy,
              lte: en30Dias,
            },
          },
        }),
        this.prisma.contrato.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'PENDIENTE',
          },
        }),
        this.prisma.contrato.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'CESADO',
          },
        }),
        this.prisma.empleado.count({
          where: {
            empresa_id: empresaId,
            estado: 'CESADO',
          },
        }),
      ]);

    return {
      vigentes,
      por_vencer: porVencer,
      vencidos,
      terminados,
      empleados_cesados: empleadosBaja,
      total: vigentes + vencidos + terminados,
    };
  }

  // Obtener tipos de contrato usados (para filtros/selectores)
  async getTiposContrato(empresaId: number) {
    const tipos = await this.prisma.contrato.findMany({
      where: {
        empleado: { empresa_id: empresaId },
      },
      select: {
        tipo_contrato: true,
      },
      distinct: ['tipo_contrato'],
    });

    return tipos.map((t) => t.tipo_contrato);
  }

  // ==================== MANEJO DE ARCHIVOS ====================

  /**
   * Sube un archivo de contrato firmado y lo vincula al contrato
   */
  async subirContratoFirmado(
    id: number,
    file: Express.Multer.File,
    empresaId: number,
  ) {
    const contrato = await this.findOne(id, empresaId);
    return this.contratoLifecycleService.subirContratoFirmado(
      id,
      file,
      contrato,
    );
  }

  /**
   * Obtiene el buffer del archivo de contrato para descarga
   */
  async descargarContrato(id: number, empresaId: number) {
    const contrato = await this.findOne(id, empresaId);
    return this.contratoLifecycleService.descargarContrato(contrato);
  }

  /**
   * Elimina el archivo de contrato
   */
  async eliminarArchivoContrato(id: number, empresaId: number) {
    const contrato = await this.findOne(id, empresaId);
    return this.contratoLifecycleService.eliminarArchivoContrato(id, contrato);
  }
}
