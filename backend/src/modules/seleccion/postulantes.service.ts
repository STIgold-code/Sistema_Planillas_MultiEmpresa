import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BUSINESS_RULES,
  BUSINESS_ERROR_MESSAGES,
  calcularEdad,
  validarEdadMinima,
  validarSueldoMinimo,
} from '../../common/constants/business-rules';
import { OnboardingService } from '../onboarding/onboarding.service';
import {
  CreatePostulanteDto,
  UpdatePostulanteDto,
  FilterPostulanteDto,
  CambiarEstadoPostulanteDto,
  AgregarEvaluacionDto,
  UpdateEvaluacionDto,
  ConvertirEmpleadoDto,
  CreatePostulanteDocumentoDto,
} from './dto';
import { EstadoPostulante, Prisma } from '@prisma/client';
import { UploadsService } from '../uploads/uploads.service';
import { UPLOAD_PATHS } from '../uploads/uploads.config';
import {
  parsearFechaISOenPeru,
  leerFechaPrisma,
  ahoraPeru,
} from '../../common/utils/datetime.util';
import { PostulanteConversionService } from './postulante-conversion.service';
import { PostulanteDocumentosService } from './postulante-documentos.service';

@Injectable()
export class PostulantesService {
  private readonly logger = new Logger(PostulantesService.name);

  constructor(
    private prisma: PrismaService,
    private onboardingService: OnboardingService,
    private uploadsService: UploadsService,
    private postulanteConversionService: PostulanteConversionService,
    private postulanteDocumentosService: PostulanteDocumentosService,
  ) {}

  async findAll(empresaId: number, filters: FilterPostulanteDto) {
    const { buscar, vacante_id, estado, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PostulanteWhereInput = { empresa_id: empresaId };

    if (buscar) {
      where.OR = [
        { numero_documento: { contains: buscar, mode: 'insensitive' } },
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
        { apellido_materno: { contains: buscar, mode: 'insensitive' } },
      ];
    }
    if (vacante_id) where.vacante_id = vacante_id;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.postulante.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          vacante: {
            select: {
              id: true,
              codigo: true,
              titulo: true,
              cargo: { select: { id: true, nombre: true } },
            },
          },
          procedencia_rel: {
            select: { id: true, nombre: true },
          },
        },
      }),
      this.prisma.postulante.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getResumen(empresaId: number) {
    const [total, porEstado] = await Promise.all([
      this.prisma.postulante.count({ where: { empresa_id: empresaId } }),
      this.prisma.postulante.groupBy({
        by: ['estado'],
        where: { empresa_id: empresaId },
        _count: true,
      }),
    ]);

    const estados = porEstado.reduce(
      (acc, e) => {
        acc[e.estado] = e._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      aprobados: estados['APROBADO'] || 0,
      rechazados: estados['RECHAZADO'] || 0,
      por_estado: estados,
    };
  }

  async findOne(id: number, empresaId: number) {
    const postulante = await this.prisma.postulante.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        vacante: {
          select: {
            id: true,
            codigo: true,
            titulo: true,
            area_id: true,
            cargo_id: true,
            sede_id: true,
            requisitos: true,
          },
        },
        distrito: {
          select: {
            id: true,
            nombre: true,
            provincia: {
              select: {
                id: true,
                nombre: true,
                departamento: { select: { id: true, nombre: true } },
              },
            },
          },
        },
        procedencia_rel: {
          select: { id: true, nombre: true },
        },
        evaluaciones_detalle: {
          orderBy: { created_at: 'desc' },
          include: {
            evaluador: { select: { id: true, nombre_completo: true } },
            tipo_evaluacion: {
              select: { id: true, codigo: true, nombre: true },
            },
          },
        },
      },
    });

    if (!postulante) {
      throw new NotFoundException('Postulante no encontrado');
    }

    return {
      ...postulante,
      foto_url: postulante.foto_url
        ? this.uploadsService.getFileUrl(postulante.foto_url)
        : null,
    };
  }

  async create(empresaId: number, dto: CreatePostulanteDto) {
    const vacante = await this.prisma.vacante.findFirst({
      where: { id: dto.vacante_id, empresa_id: empresaId },
    });

    if (!vacante) {
      throw new NotFoundException('Vacante no encontrada');
    }

    if (vacante.estado !== 'PUBLICADA' && vacante.estado !== 'EN_PROCESO') {
      throw new ConflictException(
        'La vacante no esta abierta para postulaciones',
      );
    }

    const existente = await this.prisma.postulante.findFirst({
      where: {
        numero_documento: dto.numero_documento,
        vacante_id: dto.vacante_id,
        empresa_id: empresaId,
      },
    });

    if (existente) {
      throw new ConflictException(
        'Este postulante ya esta registrado en esta vacante',
      );
    }

    // SEGURIDAD (mass assignment + IDOR): validar propiedad de la foto.
    const fotoUrl = dto.foto_url
      ? await this.uploadsService.resolverKeyPropia(dto.foto_url, empresaId)
      : dto.foto_url;

    const postulante = await this.prisma.postulante.create({
      data: {
        tipo_documento: dto.tipo_documento,
        numero_documento: dto.numero_documento,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        nombres: dto.nombres,
        fecha_nacimiento: dto.fecha_nacimiento
          ? parsearFechaISOenPeru(dto.fecha_nacimiento)
          : null,
        sexo: dto.sexo,
        estado_civil: dto.estado_civil,
        nacionalidad: dto.nacionalidad,
        celular: dto.celular,
        telefono: dto.telefono,
        email: dto.email,
        foto_url: fotoUrl,
        direccion: dto.direccion,
        referencia: dto.referencia,
        distrito_id: dto.distrito_id,
        estatura: dto.estatura,
        peso: dto.peso,
        categoria_licencia: dto.categoria_licencia,
        estudios: (dto.estudios as unknown as Prisma.InputJsonValue[]) || [],
        experiencias:
          (dto.experiencias as unknown as Prisma.InputJsonValue[]) || [],
        capacitaciones:
          (dto.capacitaciones as unknown as Prisma.InputJsonValue[]) || [],
        pretension_salarial: dto.pretension_salarial,
        procedencia_id: dto.procedencia_id,
        vacante_id: dto.vacante_id,
        empresa_id: empresaId,
      },
      include: {
        vacante: { select: { id: true, codigo: true, titulo: true } },
      },
    });

    if (vacante.estado === 'PUBLICADA') {
      await this.prisma.vacante.update({
        where: { id: dto.vacante_id },
        data: { estado: 'EN_PROCESO' },
      });
    }

    return postulante;
  }

  async update(id: number, empresaId: number, dto: UpdatePostulanteDto) {
    const postulante = await this.findOne(id, empresaId);

    if (postulante.empleado_id) {
      throw new ConflictException(
        'Este postulante ya fue convertido a empleado. Edite desde la ficha del empleado.',
      );
    }

    const {
      fecha_nacimiento,
      estudios,
      experiencias,
      capacitaciones,
      ...restDto
    } = dto;
    return this.prisma.postulante.update({
      where: { id },
      data: {
        ...restDto,
        fecha_nacimiento: fecha_nacimiento
          ? parsearFechaISOenPeru(fecha_nacimiento)
          : undefined,
        estudios: estudios as unknown as Prisma.InputJsonValue | undefined,
        experiencias:
          experiencias as unknown as Prisma.InputJsonValue | undefined,
        capacitaciones:
          capacitaciones as unknown as Prisma.InputJsonValue | undefined,
      },
      include: {
        vacante: { select: { id: true, codigo: true, titulo: true } },
      },
    });
  }

  async cambiarEstado(
    id: number,
    empresaId: number,
    dto: CambiarEstadoPostulanteDto,
  ) {
    // Fetch inicial fuera de transacción para fast-fail en 404
    const postulante = await this.findOne(id, empresaId);
    const estadoAnterior = postulante.estado;

    // Si ya fue convertido a empleado, no se puede cambiar estado
    if (postulante.empleado_id) {
      throw new ConflictException(
        'No se puede cambiar el estado de un postulante que ya fue convertido a empleado',
      );
    }

    const transicionesValidas: Record<EstadoPostulante, EstadoPostulante[]> = {
      EN_PROCESO: ['APROBADO', 'RECHAZADO'],
      RECHAZADO: ['EN_PROCESO'],
      APROBADO: ['RECHAZADO'],
    };

    if (!transicionesValidas[postulante.estado].includes(dto.nuevo_estado)) {
      throw new ConflictException(
        `No se puede cambiar de ${postulante.estado} a ${dto.nuevo_estado}`,
      );
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      // Re-verificar estado dentro de la transacción para prevenir race conditions
      const postulanteActual = await tx.postulante.findUnique({
        where: { id },
        select: { estado: true, empleado_id: true },
      });

      if (!postulanteActual || postulanteActual.estado !== estadoAnterior) {
        throw new ConflictException(
          'El estado del postulante cambió mientras se procesaba la solicitud. Intente nuevamente.',
        );
      }

      if (postulanteActual.empleado_id) {
        throw new ConflictException(
          'No se puede cambiar el estado de un postulante que ya fue convertido a empleado',
        );
      }

      // Validaciones antes de aprobar
      if (dto.nuevo_estado === 'APROBADO') {
        // 1. Requiere todas las evaluaciones obligatorias
        const tiposEvalObligatorios = await tx.tipoEvaluacionMaestro.findMany({
          where: {
            empresa_id: empresaId,
            es_obligatorio: true,
            activo: true,
          },
          select: { id: true, nombre: true },
        });

        if (tiposEvalObligatorios.length > 0) {
          const evaluacionesRegistradas =
            await tx.postulanteEvaluacion.findMany({
              where: { postulante_id: id },
              select: { tipo_evaluacion_id: true },
            });

          const tipoIdsEvaluados = new Set(
            evaluacionesRegistradas
              .map((e) => e.tipo_evaluacion_id)
              .filter((id): id is number => id !== null),
          );

          const evalFaltantes = tiposEvalObligatorios.filter(
            (t) => !tipoIdsEvaluados.has(t.id),
          );

          if (evalFaltantes.length > 0) {
            const listaFaltantes = evalFaltantes
              .map((t) => t.nombre)
              .join(', ');
            throw new ConflictException(
              `Faltan evaluaciones obligatorias: ${listaFaltantes}`,
            );
          }
        }

        // 2. Requiere todos los documentos obligatorios
        const tiposObligatorios = await tx.tipoDocumentoEmpleado.findMany({
          where: {
            empresa_id: empresaId,
            aplica_seleccion: true,
            es_obligatorio: true,
            activo: true,
          },
          select: { id: true, nombre: true },
        });

        if (tiposObligatorios.length > 0) {
          const documentosSubidos = await tx.postulanteDocumento.findMany({
            where: { postulante_id: id },
            select: { tipo_documento_empleado_id: true },
          });

          const tipoIdsSubidos = new Set(
            documentosSubidos
              .map((d) => d.tipo_documento_empleado_id)
              .filter((id): id is number => id !== null),
          );

          const faltantes = tiposObligatorios.filter(
            (t) => !tipoIdsSubidos.has(t.id),
          );

          if (faltantes.length > 0) {
            const listaFaltantes = faltantes.map((t) => t.nombre).join(', ');
            throw new ConflictException(
              `Faltan documentos obligatorios: ${listaFaltantes}`,
            );
          }
        }

        // 3. No exceder cantidad de puestos de la vacante
        const vacante = await tx.vacante.findUnique({
          where: { id: postulante.vacante_id },
          select: { cantidad_puestos: true, titulo: true },
        });

        if (vacante) {
          const aprobadosActuales = await tx.postulante.count({
            where: {
              vacante_id: postulante.vacante_id,
              estado: 'APROBADO',
              empleado_id: null,
              empresa_id: empresaId,
            },
          });

          if (aprobadosActuales >= vacante.cantidad_puestos) {
            throw new ConflictException(
              `La vacante "${vacante.titulo}" ya tiene ${aprobadosActuales} postulante(s) aprobado(s) de ${vacante.cantidad_puestos} puesto(s) disponible(s).`,
            );
          }
        }
      }

      const updateData: Prisma.PostulanteUpdateInput = {
        estado: dto.nuevo_estado,
      };

      if (dto.nuevo_estado === 'RECHAZADO' && dto.motivo) {
        updateData.motivo_rechazo = dto.motivo;
      }

      // Limpiar motivo_rechazo al volver a EN_PROCESO
      if (estadoAnterior === 'RECHAZADO' && dto.nuevo_estado === 'EN_PROCESO') {
        updateData.motivo_rechazo = null;
      }

      return tx.postulante.update({
        where: { id },
        data: updateData,
        include: {
          vacante: { select: { id: true, codigo: true, titulo: true } },
        },
      });
    });

    return resultado;
  }

  async agregarEvaluacion(
    id: number,
    empresaId: number,
    evaluadorId: number,
    dto: AgregarEvaluacionDto,
  ) {
    const postulante = await this.findOne(id, empresaId);

    if (postulante.estado === 'RECHAZADO') {
      throw new ConflictException(
        'No se pueden agregar evaluaciones a un postulante rechazado',
      );
    }
    if (postulante.estado === 'APROBADO') {
      throw new ConflictException(
        'No se pueden agregar evaluaciones a un postulante aprobado',
      );
    }

    // Validar tipo de evaluacion y puntaje maximo
    if (dto.tipo_evaluacion_id) {
      const tipoEval = await this.prisma.tipoEvaluacionMaestro.findFirst({
        where: { id: dto.tipo_evaluacion_id, activo: true },
      });

      if (!tipoEval) {
        throw new BadRequestException(
          'Tipo de evaluacion no encontrado o inactivo',
        );
      }

      if (
        dto.puntaje &&
        tipoEval.puntaje_maximo &&
        dto.puntaje > Number(tipoEval.puntaje_maximo)
      ) {
        throw new BadRequestException(
          `El puntaje (${dto.puntaje}) excede el maximo permitido (${tipoEval.puntaje_maximo}) para ${tipoEval.nombre}`,
        );
      }
    }

    // SEGURIDAD (mass assignment + IDOR): validar propiedad del archivo adjunto.
    const archivoUrlEval = dto.archivo_url
      ? await this.uploadsService.resolverKeyPropia(dto.archivo_url, empresaId)
      : dto.archivo_url;

    const evaluacion = await this.prisma.postulanteEvaluacion.create({
      data: {
        postulante_id: id,
        tipo_evaluacion_id: dto.tipo_evaluacion_id,
        puntaje: dto.puntaje,
        comentario: dto.comentario,
        evaluador_id: evaluadorId,
        archivo_url: archivoUrlEval,
        archivo_nombre: dto.archivo_nombre,
      },
      include: {
        evaluador: { select: { id: true, nombre_completo: true } },
        tipo_evaluacion: { select: { id: true, codigo: true, nombre: true } },
      },
    });

    return evaluacion;
  }

  async actualizarEvaluacion(
    evaluacionId: number,
    postulanteId: number,
    empresaId: number,
    dto: UpdateEvaluacionDto,
  ) {
    const postulante = await this.findOne(postulanteId, empresaId);

    if (postulante.estado === 'RECHAZADO') {
      throw new ConflictException(
        'No se pueden actualizar evaluaciones de un postulante rechazado',
      );
    }
    if (postulante.estado === 'APROBADO') {
      throw new ConflictException(
        'No se pueden actualizar evaluaciones de un postulante aprobado',
      );
    }

    const evaluacion = await this.prisma.postulanteEvaluacion.findFirst({
      where: {
        id: evaluacionId,
        postulante_id: postulanteId,
        postulante: { empresa_id: empresaId },
      },
    });

    if (!evaluacion) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    // SEGURIDAD (mass assignment + IDOR): validar propiedad del archivo adjunto.
    const archivoUrlEval =
      dto.archivo_url !== undefined && dto.archivo_url !== null
        ? await this.uploadsService.resolverKeyPropia(
            dto.archivo_url,
            empresaId,
          )
        : dto.archivo_url;

    return this.prisma.postulanteEvaluacion.update({
      where: { id: evaluacionId },
      data: {
        tipo_evaluacion_id: dto.tipo_evaluacion_id,
        puntaje: dto.puntaje,
        comentario: dto.comentario,
        archivo_url: archivoUrlEval,
        archivo_nombre: dto.archivo_nombre,
      },
      include: {
        evaluador: { select: { id: true, nombre_completo: true } },
        tipo_evaluacion: { select: { id: true, codigo: true, nombre: true } },
      },
    });
  }

  async eliminarEvaluacion(
    evaluacionId: number,
    postulanteId: number,
    empresaId: number,
  ) {
    const postulante = await this.findOne(postulanteId, empresaId);

    if (postulante.estado === 'RECHAZADO') {
      throw new ConflictException(
        'No se pueden eliminar evaluaciones de un postulante rechazado',
      );
    }
    if (postulante.estado === 'APROBADO') {
      throw new ConflictException(
        'No se pueden eliminar evaluaciones de un postulante aprobado',
      );
    }

    const evaluacion = await this.prisma.postulanteEvaluacion.findFirst({
      where: {
        id: evaluacionId,
        postulante_id: postulanteId,
        postulante: { empresa_id: empresaId },
      },
    });

    if (!evaluacion) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    await this.prisma.postulanteEvaluacion.delete({
      where: { id: evaluacionId },
    });

    return { message: 'Evaluacion eliminada correctamente' };
  }

  async getEvaluaciones(postulanteId: number, empresaId: number) {
    await this.findOne(postulanteId, empresaId);

    return this.prisma.postulanteEvaluacion.findMany({
      where: { postulante_id: postulanteId },
      orderBy: { created_at: 'desc' },
      include: {
        evaluador: { select: { id: true, nombre_completo: true } },
        tipo_evaluacion: { select: { id: true, codigo: true, nombre: true } },
      },
    });
  }

  async getPromedioEvaluaciones(postulanteId: number, empresaId: number) {
    await this.findOne(postulanteId, empresaId);

    const result = await this.prisma.postulanteEvaluacion.aggregate({
      where: { postulante_id: postulanteId, puntaje: { not: null } },
      _avg: { puntaje: true },
      _count: true,
    });

    return {
      promedio: result._avg.puntaje
        ? Number(result._avg.puntaje).toFixed(2)
        : null,
      total_evaluaciones: result._count,
    };
  }

  async convertirAEmpleado(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: ConvertirEmpleadoDto,
  ) {
    // Validaciones síncronas fuera de transacción (fail fast)
    const postulante = await this.findOne(id, empresaId);
    return this.postulanteConversionService.convertirAEmpleado(
      id,
      empresaId,
      usuarioId,
      dto,
      postulante,
    );
  }

  async getDocumentos(postulanteId: number, empresaId: number) {
    const postulante = await this.findOne(postulanteId, empresaId);
    return this.postulanteDocumentosService.getDocumentos(
      postulanteId,
      postulante,
    );
  }

  async createDocumentoConArchivo(
    postulanteId: number,
    empresaId: number,
    file: Express.Multer.File,
    data: CreatePostulanteDocumentoDto,
    usuarioId?: number,
  ) {
    const postulante = await this.findOne(postulanteId, empresaId);
    return this.postulanteDocumentosService.createDocumentoConArchivo(
      postulanteId,
      postulante,
      file,
      data,
      usuarioId,
    );
  }

  async crearNuevaVersionDocumento(
    documentoId: number,
    postulanteId: number,
    empresaId: number,
    file: Express.Multer.File,
    motivo: string,
    usuarioId: number,
  ) {
    const postulante = await this.findOne(postulanteId, empresaId);
    return this.postulanteDocumentosService.crearNuevaVersionDocumento(
      documentoId,
      postulanteId,
      postulante,
      file,
      motivo,
      usuarioId,
    );
  }

  async getHistorialDocumento(
    documentoId: number,
    postulanteId: number,
    empresaId: number,
  ) {
    await this.findOne(postulanteId, empresaId);
    return this.postulanteDocumentosService.getHistorialDocumento(
      documentoId,
      postulanteId,
    );
  }

  async deleteDocumento(
    documentoId: number,
    postulanteId: number,
    empresaId: number,
    usuarioId?: number,
    motivo?: string,
  ) {
    const postulante = await this.findOne(postulanteId, empresaId);
    return this.postulanteDocumentosService.deleteDocumento(
      documentoId,
      postulanteId,
      postulante,
      usuarioId,
      motivo,
    );
  }

  async remove(id: number, empresaId: number) {
    const postulante = await this.findOne(id, empresaId);

    if (postulante.estado === 'APROBADO') {
      throw new ConflictException(
        'No se puede eliminar un postulante con estado APROBADO',
      );
    }

    if (postulante.empleado_id) {
      throw new ConflictException(
        'No se puede eliminar un postulante que ya fue convertido a empleado',
      );
    }

    // Recopilar archivos fisicos antes de eliminar (cascade borrara los registros)
    const [documentos, evaluaciones] = await Promise.all([
      this.prisma.postulanteDocumento.findMany({
        where: { postulante_id: id },
        select: { archivo_url: true },
      }),
      this.prisma.postulanteEvaluacion.findMany({
        where: { postulante_id: id, archivo_url: { not: null } },
        select: { archivo_url: true },
      }),
    ]);

    await this.prisma.postulante.delete({ where: { id } });

    // Eliminar archivos fisicos (best-effort, no bloquea la respuesta)
    const archivos = [
      ...documentos.map((d) => d.archivo_url),
      ...evaluaciones.map((e) => e.archivo_url).filter(Boolean),
    ];

    for (const archivo of archivos) {
      try {
        await this.uploadsService.deleteFileHybrid(archivo);
      } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error eliminando archivo ${archivo}: ${mensaje}`);
      }
    }

    return { message: 'Postulante eliminado correctamente' };
  }
}
