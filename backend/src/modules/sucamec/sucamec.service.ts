import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateCarnetSucamecDto,
  UpdateCarnetSucamecDto,
  FilterCarnetSucamecDto,
  RenovarCarnetSucamecDto,
} from './dto';
import { Prisma, EstadoCarnetSucamec, CategoriaSucamec } from '@prisma/client';
import {
  ahoraPeru,
  sumarDiasPeru,
  finDelDiaPeru,
  parsearFechaISOenPeru,
  fechaHoyPeru,
} from '../../common/utils/datetime.util';

// Constante para días de alerta de vencimiento
const DIAS_ALERTA_VENCIMIENTO = 30;

// Labels legibles para categorías SUCAMEC
export const CATEGORIAS_SUCAMEC: { value: CategoriaSucamec; label: string }[] =
  [
    { value: 'BASICO', label: 'Agente Básico' },
    { value: 'ESPECIALIZADO', label: 'Agente Especializado' },
    { value: 'RESGUARDO', label: 'Resguardo Personal' },
    { value: 'PROTECCION', label: 'Protección de Instalaciones' },
    { value: 'TRANSPORTE', label: 'Transporte de Valores' },
    { value: 'TECNOLOGIA', label: 'Vigilancia Electrónica' },
    { value: 'CAPACITADOR', label: 'Capacitador/Instructor' },
  ];

@Injectable()
export class SucamecService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async findAll(empresaId: number, filters: FilterCarnetSucamecDto) {
    const {
      buscar,
      empleado_id,
      estado,
      categoria,
      fecha_desde,
      fecha_hasta,
      por_vencer,
      orden = 'desc',
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CarnetSucamecWhereInput = {
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

    // Filtro por categoría
    if (categoria) {
      where.categoria = categoria;
    }

    // Filtro por búsqueda (nombre, documento o número de carnet)
    if (buscar) {
      where.OR = [
        { numero_carnet: { contains: buscar, mode: 'insensitive' } },
        {
          empleado: {
            empresa_id: empresaId,
            OR: [
              { numero_documento: { contains: buscar, mode: 'insensitive' } },
              { nombres: { contains: buscar, mode: 'insensitive' } },
              { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
              { apellido_materno: { contains: buscar, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Filtro por rango de fecha de vencimiento
    if (fecha_desde || fecha_hasta) {
      where.fecha_vencimiento = {};
      if (fecha_desde) {
        where.fecha_vencimiento.gte = new Date(fecha_desde);
      }
      if (fecha_hasta) {
        where.fecha_vencimiento.lte = new Date(fecha_hasta + 'T23:59:59.999Z');
      }
    }

    // Filtro por carnets por vencer (próximos 30 días)
    if (por_vencer) {
      const hoy = ahoraPeru().startOf('day').toJSDate();
      const enNDias = finDelDiaPeru(
        sumarDiasPeru(hoy, DIAS_ALERTA_VENCIMIENTO),
      );

      where.fecha_vencimiento = {
        gte: hoy,
        lte: enNDias,
      };
      where.estado = 'VIGENTE';
    }

    const [data, total] = await Promise.all([
      this.prisma.carnetSucamec.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_vencimiento: orden },
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              foto_url: true,
              area: { select: { id: true, nombre: true } },
              cargo: { select: { id: true, nombre: true } },
            },
          },
          documento: {
            select: {
              id: true,
              archivo_url: true,
              archivo_nombre: true,
              fecha_emision: true,
              fecha_vencimiento: true,
            },
          },
          usuario: {
            select: { id: true, nombre_completo: true },
          },
        },
      }),
      this.prisma.carnetSucamec.count({ where }),
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
    const carnet = await this.prisma.carnetSucamec.findFirst({
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
            foto_url: true,
            area: { select: { id: true, nombre: true } },
            cargo: { select: { id: true, nombre: true } },
          },
        },
        documento: {
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
            fecha_emision: true,
            fecha_vencimiento: true,
            tipo_documento_empleado: {
              select: { id: true, codigo: true, nombre: true },
            },
          },
        },
        usuario: {
          select: { id: true, nombre_completo: true, email: true },
        },
      },
    });

    if (!carnet) {
      throw new NotFoundException('Carnet SUCAMEC no encontrado');
    }

    return carnet;
  }

  async create(
    empresaId: number,
    dto: CreateCarnetSucamecDto,
    usuarioId: number,
    file?: Express.Multer.File,
  ) {
    // Validar fechas
    const fechaEmision = parsearFechaISOenPeru(dto.fecha_emision);
    const fechaVencimiento = parsearFechaISOenPeru(dto.fecha_vencimiento);

    if (fechaVencimiento <= fechaEmision) {
      throw new BadRequestException(
        'La fecha de vencimiento debe ser posterior a la fecha de emisión',
      );
    }

    // Subir archivo si viene (antes de la transacción para no bloquear)
    let archivoUrl: string | null = null;
    let archivoNombre: string | null = null;

    if (file) {
      const result = await this.uploadsService.processUpload(file, 'sucamec');
      archivoUrl = result.file.path;
      archivoNombre = result.file.originalname;
    }

    // Usar transacción para evitar race conditions
    return this.prisma.$transaction(async (tx) => {
      // Verificar que el empleado existe y pertenece a la empresa
      const empleado = await tx.empleado.findFirst({
        where: {
          id: dto.empleado_id,
          empresa_id: empresaId,
        },
      });

      if (!empleado) {
        throw new NotFoundException('Empleado no encontrado');
      }

      // Verificar que el número de carnet es único
      const carnetExistente = await tx.carnetSucamec.findUnique({
        where: { numero_carnet: dto.numero_carnet.toUpperCase() },
      });

      if (carnetExistente) {
        throw new ConflictException(
          `Ya existe un carnet SUCAMEC con el número ${dto.numero_carnet}`,
        );
      }

      // Verificar que el empleado no tenga un carnet VIGENTE de la misma categoría
      const carnetVigente = await tx.carnetSucamec.findFirst({
        where: {
          empleado_id: dto.empleado_id,
          categoria: dto.categoria,
          estado: 'VIGENTE',
        },
      });

      if (carnetVigente) {
        throw new ConflictException(
          `El empleado ya tiene un carnet SUCAMEC vigente de categoría ${dto.categoria}`,
        );
      }

      let documentoId = dto.documento_id || null;

      // Si se proporciona documento_id, verificar que existe y pertenece al empleado
      if (dto.documento_id) {
        const documento = await tx.empleadoDocumento.findFirst({
          where: {
            id: dto.documento_id,
            empleado_id: dto.empleado_id,
          },
        });

        if (!documento) {
          throw new NotFoundException(
            'Documento no encontrado o no pertenece al empleado',
          );
        }
      }

      // Si viene archivo, crear EmpleadoDocumento y vincular
      if (archivoUrl && archivoNombre) {
        const nuevoDocumento = await tx.empleadoDocumento.create({
          data: {
            empleado_id: dto.empleado_id,
            descripcion: `Carnet SUCAMEC - ${dto.numero_carnet}`,
            archivo_url: archivoUrl,
            archivo_nombre: archivoNombre,
            fecha_carga: ahoraPeru().toJSDate(),
            fecha_emision: fechaEmision,
            fecha_vencimiento: fechaVencimiento,
            version: 1,
            es_version_vigente: true,
            origen: 'RRHH',
            subido_por_id: usuarioId,
          },
        });
        documentoId = nuevoDocumento.id;
      }

      // Crear el carnet
      return tx.carnetSucamec.create({
        data: {
          empleado_id: dto.empleado_id,
          documento_id: documentoId,
          numero_carnet: dto.numero_carnet.toUpperCase(),
          categoria: dto.categoria,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimiento,
          estado: dto.estado || 'VIGENTE',
          observaciones: dto.observaciones,
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
            },
          },
          documento: {
            select: {
              id: true,
              archivo_url: true,
              archivo_nombre: true,
            },
          },
        },
      });
    });
  }

  async update(id: number, empresaId: number, dto: UpdateCarnetSucamecDto) {
    const carnet = await this.findOne(id, empresaId);

    // No permitir editar carnets ANULADOS
    if (carnet.estado === 'ANULADO') {
      throw new BadRequestException(
        'No se puede editar un carnet SUCAMEC anulado',
      );
    }

    // Si se está cambiando el número de carnet, verificar unicidad
    if (
      dto.numero_carnet &&
      dto.numero_carnet.toUpperCase() !== carnet.numero_carnet
    ) {
      const carnetExistente = await this.prisma.carnetSucamec.findUnique({
        where: { numero_carnet: dto.numero_carnet.toUpperCase() },
      });

      if (carnetExistente) {
        throw new ConflictException(
          `Ya existe un carnet SUCAMEC con el número ${dto.numero_carnet}`,
        );
      }
    }

    // Si se proporciona documento_id, verificar que existe y pertenece al empleado
    if (dto.documento_id) {
      const documento = await this.prisma.empleadoDocumento.findFirst({
        where: {
          id: dto.documento_id,
          empleado_id: carnet.empleado_id,
        },
      });

      if (!documento) {
        throw new NotFoundException(
          'Documento no encontrado o no pertenece al empleado',
        );
      }
    }

    // Preparar datos para actualización
    const updateData: Prisma.CarnetSucamecUpdateInput = {};

    if (dto.numero_carnet) {
      updateData.numero_carnet = dto.numero_carnet.toUpperCase();
    }
    if (dto.categoria) {
      updateData.categoria = dto.categoria;
    }
    if (dto.fecha_emision) {
      updateData.fecha_emision = parsearFechaISOenPeru(dto.fecha_emision);
    }
    if (dto.fecha_vencimiento) {
      updateData.fecha_vencimiento = parsearFechaISOenPeru(
        dto.fecha_vencimiento,
      );
    }
    if (dto.estado) {
      updateData.estado = dto.estado;
    }
    if (dto.documento_id !== undefined) {
      updateData.documento = dto.documento_id
        ? { connect: { id: dto.documento_id } }
        : { disconnect: true };
    }
    if (dto.observaciones !== undefined) {
      updateData.observaciones = dto.observaciones;
    }

    return this.prisma.carnetSucamec.update({
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
        documento: {
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
          },
        },
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const carnet = await this.findOne(id, empresaId);

    // Solo permitir eliminar si no está VIGENTE
    if (carnet.estado === 'VIGENTE') {
      throw new BadRequestException(
        'No se puede eliminar un carnet SUCAMEC vigente. Primero debe anularlo o esperar a que venza.',
      );
    }

    return this.prisma.carnetSucamec.delete({
      where: { id },
    });
  }

  async renovar(
    id: number,
    empresaId: number,
    dto: RenovarCarnetSucamecDto,
    usuarioId: number,
  ) {
    const fechaEmision = parsearFechaISOenPeru(dto.fecha_emision);
    const fechaVencimiento = parsearFechaISOenPeru(dto.fecha_vencimiento);

    if (fechaVencimiento <= fechaEmision) {
      throw new BadRequestException(
        'La fecha de vencimiento debe ser posterior a la fecha de emisión',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const carnetActual = await tx.carnetSucamec.findFirst({
        where: {
          id,
          empleado: { empresa_id: empresaId },
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
        },
      });

      if (!carnetActual) {
        throw new NotFoundException('Carnet SUCAMEC no encontrado');
      }

      // Solo permitir renovar si está VIGENTE o VENCIDO
      if (!['VIGENTE', 'VENCIDO'].includes(carnetActual.estado)) {
        throw new BadRequestException(
          `No se puede renovar un carnet con estado ${carnetActual.estado}`,
        );
      }

      // Verificar que el nuevo número de carnet es único (si es diferente)
      if (dto.numero_carnet.toUpperCase() !== carnetActual.numero_carnet) {
        const carnetExistente = await tx.carnetSucamec.findUnique({
          where: { numero_carnet: dto.numero_carnet.toUpperCase() },
        });

        if (carnetExistente) {
          throw new ConflictException(
            `Ya existe un carnet SUCAMEC con el número ${dto.numero_carnet}`,
          );
        }
      }

      // Si se proporciona documento_id, verificar que existe y pertenece al empleado
      if (dto.documento_id) {
        const documento = await tx.empleadoDocumento.findFirst({
          where: {
            id: dto.documento_id,
            empleado_id: carnetActual.empleado_id,
          },
        });

        if (!documento) {
          throw new NotFoundException(
            'Documento no encontrado o no pertenece al empleado',
          );
        }
      }

      // Marcar el carnet actual como VENCIDO
      await tx.carnetSucamec.update({
        where: { id },
        data: {
          estado: 'VENCIDO',
          observaciones: carnetActual.observaciones
            ? `${carnetActual.observaciones}\n[Renovado el ${fechaHoyPeru()}]`
            : `[Renovado el ${fechaHoyPeru()}]`,
        },
      });

      // Crear el nuevo carnet
      const nuevoCarnet = await tx.carnetSucamec.create({
        data: {
          empleado_id: carnetActual.empleado_id,
          documento_id: dto.documento_id || null,
          numero_carnet: dto.numero_carnet.toUpperCase(),
          categoria: dto.categoria,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimiento,
          estado: 'VIGENTE',
          observaciones:
            dto.observaciones ||
            `Renovación del carnet ${carnetActual.numero_carnet}`,
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
            },
          },
          documento: {
            select: {
              id: true,
              archivo_url: true,
              archivo_nombre: true,
            },
          },
        },
      });

      return nuevoCarnet;
    });
  }

  async suspender(id: number, empresaId: number, motivo: string) {
    const carnet = await this.findOne(id, empresaId);

    if (carnet.estado !== 'VIGENTE') {
      throw new BadRequestException(
        'Solo se pueden suspender carnets vigentes',
      );
    }

    return this.prisma.carnetSucamec.update({
      where: { id },
      data: {
        estado: 'SUSPENDIDO',
        observaciones: carnet.observaciones
          ? `${carnet.observaciones}\n[Suspendido el ${fechaHoyPeru()}]: ${motivo}`
          : `[Suspendido el ${fechaHoyPeru()}]: ${motivo}`,
      },
    });
  }

  async anular(id: number, empresaId: number, motivo: string) {
    const carnet = await this.findOne(id, empresaId);

    if (carnet.estado === 'ANULADO') {
      throw new BadRequestException('El carnet ya está anulado');
    }

    return this.prisma.carnetSucamec.update({
      where: { id },
      data: {
        estado: 'ANULADO',
        observaciones: carnet.observaciones
          ? `${carnet.observaciones}\n[Anulado el ${fechaHoyPeru()}]: ${motivo}`
          : `[Anulado el ${fechaHoyPeru()}]: ${motivo}`,
      },
    });
  }

  async reactivar(id: number, empresaId: number) {
    const carnet = await this.findOne(id, empresaId);

    if (carnet.estado !== 'SUSPENDIDO') {
      throw new BadRequestException(
        'Solo se pueden reactivar carnets suspendidos',
      );
    }

    // Verificar si el carnet ya venció
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const fechaVencimiento = new Date(carnet.fecha_vencimiento);

    if (fechaVencimiento < hoy) {
      // Si ya venció, marcarlo como VENCIDO en lugar de VIGENTE
      return this.prisma.carnetSucamec.update({
        where: { id },
        data: {
          estado: 'VENCIDO',
          observaciones: carnet.observaciones
            ? `${carnet.observaciones}\n[Reactivado como VENCIDO el ${fechaHoyPeru()} - fecha de vencimiento pasada]`
            : `[Reactivado como VENCIDO el ${fechaHoyPeru()} - fecha de vencimiento pasada]`,
        },
      });
    }

    return this.prisma.carnetSucamec.update({
      where: { id },
      data: {
        estado: 'VIGENTE',
        observaciones: carnet.observaciones
          ? `${carnet.observaciones}\n[Reactivado el ${fechaHoyPeru()}]`
          : `[Reactivado el ${fechaHoyPeru()}]`,
      },
    });
  }

  async getResumen(empresaId: number) {
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const enNDias = finDelDiaPeru(sumarDiasPeru(hoy, DIAS_ALERTA_VENCIMIENTO));

    const [vigentes, porVencer, vencidos, suspendidos, anulados] =
      await Promise.all([
        this.prisma.carnetSucamec.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'VIGENTE',
          },
        }),
        this.prisma.carnetSucamec.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'VIGENTE',
            fecha_vencimiento: {
              gte: hoy,
              lte: enNDias,
            },
          },
        }),
        this.prisma.carnetSucamec.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'VENCIDO',
          },
        }),
        this.prisma.carnetSucamec.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'SUSPENDIDO',
          },
        }),
        this.prisma.carnetSucamec.count({
          where: {
            empleado: { empresa_id: empresaId },
            estado: 'ANULADO',
          },
        }),
      ]);

    return {
      vigentes,
      por_vencer: porVencer,
      vencidos,
      suspendidos,
      anulados,
      total: vigentes + vencidos + suspendidos + anulados,
    };
  }

  getCategorias() {
    return CATEGORIAS_SUCAMEC;
  }

  // Vincular documento existente a un carnet
  async vincularDocumento(id: number, empresaId: number, documentoId: number) {
    const carnet = await this.findOne(id, empresaId);

    // Verificar que el documento existe y pertenece al empleado
    const documento = await this.prisma.empleadoDocumento.findFirst({
      where: {
        id: documentoId,
        empleado_id: carnet.empleado_id,
      },
    });

    if (!documento) {
      throw new NotFoundException(
        'Documento no encontrado o no pertenece al empleado',
      );
    }

    return this.prisma.carnetSucamec.update({
      where: { id },
      data: {
        documento_id: documentoId,
      },
      include: {
        documento: {
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
          },
        },
      },
    });
  }

  // Desvincular documento de un carnet
  async desvincularDocumento(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    return this.prisma.carnetSucamec.update({
      where: { id },
      data: {
        documento_id: null,
      },
    });
  }

  // Obtener documentos SUCAMEC sin vincular de un empleado
  async getDocumentosSinVincular(empleadoId: number, empresaId: number) {
    // Primero verificar que el empleado pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Obtener documentos del empleado que:
    // 1. Sean de tipo SUCAMEC (por código o nombre)
    // 2. No estén vinculados a ningún carnet
    return this.prisma.empleadoDocumento.findMany({
      where: {
        empleado_id: empleadoId,
        es_version_vigente: true,
        eliminado_en: null,
        tipo_documento_empleado: {
          OR: [
            { codigo: { contains: 'SUCAMEC', mode: 'insensitive' } },
            { nombre: { contains: 'SUCAMEC', mode: 'insensitive' } },
          ],
        },
        carnets_sucamec: {
          none: {},
        },
      },
      select: {
        id: true,
        archivo_url: true,
        archivo_nombre: true,
        fecha_emision: true,
        fecha_vencimiento: true,
        descripcion: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
