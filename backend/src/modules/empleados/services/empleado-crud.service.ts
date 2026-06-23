import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, EstadoDocumentacion } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BUSINESS_ERROR_MESSAGES,
  calcularEdad,
  validarEdadMinima,
  validarSueldoMinimo,
  EstadoDocumentosFilter,
  DIAS_POR_VENCER_DOCUMENTO,
} from '../../../common/constants/business-rules';
import {
  ahoraPeru,
  sumarDiasPeru,
  formatearFechaPeru,
  parsearFechaISOenPeru,
  fechaHoyPeruDate,
} from '../../../common/utils/datetime.util';
import { UploadsService } from '../../uploads/uploads.service';
import { FileCleanupService } from './file-cleanup.service';
import { EmpleadoDocumentosService } from './empleado-documentos.service';
import { EmpleadoExportService } from './empleado-export.service';
import { EmpleadoMovimientosService } from './empleado-movimientos.service';
import {
  CreateEmpleadoDto,
  UpdateEmpleadoDto,
  FilterEmpleadoDto,
} from '../dto';

/**
 * Servicio CRUD de empleados: findAll (con filtros y stats), findOne, create,
 * update, remove. Incluye la validacion privada de FK a entidades de empresa
 * (area/cargo/sede/banco/distrito/regimen).
 *
 * Extraido de EmpleadosService para mantener el archivo principal bajo 400 LOC.
 * Comportamiento identico al original.
 */
@Injectable()
export class EmpleadoCrudService {
  private readonly logger = new Logger(EmpleadoCrudService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private fileCleanupService: FileCleanupService,
    private empleadoDocumentosService: EmpleadoDocumentosService,
    private empleadoExportService: EmpleadoExportService,
    private empleadoMovimientosService: EmpleadoMovimientosService,
  ) {}

  async findAll(empresaId: number, filters: FilterEmpleadoDto) {
    const {
      buscar,
      area_id,
      cargo_id,
      sede_id,
      estado,
      turno,
      estado_docs,
      periodo,
      fecha_ingreso_desde,
      fecha_ingreso_hasta,
      esReingresante,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
    };

    // Filtro de búsqueda por ID, nombre o documento
    if (buscar) {
      const orConditions: Prisma.EmpleadoWhereInput[] = [
        { numero_documento: { contains: buscar, mode: 'insensitive' } },
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
        { apellido_materno: { contains: buscar, mode: 'insensitive' } },
      ];
      // Si el término es numérico, también buscar por ID
      const idNumerico = parseInt(buscar, 10);
      if (!isNaN(idNumerico)) {
        orConditions.push({ id: idNumerico });
      }
      where.OR = orConditions;
    }

    if (area_id) where.area_id = area_id;
    if (cargo_id) where.cargo_id = cargo_id;
    if (sede_id) where.sede_id = sede_id;
    if (estado) where.estado = estado;
    if (turno) where.turno = turno;

    // Filtro REINGRESANTE: estado=ACTIVO + al menos 1 vinculo_laboral cerrado.
    // Si esReingresante === true → solo reingresantes (fuerza estado ACTIVO).
    // Si esReingresante === false → solo activos puros (sin vinculos cerrados).
    if (esReingresante === true) {
      where.estado = 'ACTIVO';
      where.vinculos_laborales = { some: { fecha_fin: { not: null } } };
    } else if (esReingresante === false && estado === 'ACTIVO') {
      where.vinculos_laborales = { none: { fecha_fin: { not: null } } };
    }

    // Filtro de periodo: aplica con o sin estado seleccionado
    if (periodo) {
      const [anio, mes] = periodo.split('-').map(Number);
      const inicioMes = new Date(anio, mes - 1, 1);
      const finMes = new Date(anio, mes, 0, 23, 59, 59, 999);

      const movimientoFilter: Prisma.EmpleadoMovimientoWhereInput = {
        fecha_movimiento: { gte: inicioMes, lte: finMes },
      };

      if (estado) {
        movimientoFilter.tipo_movimiento = {
          in: this.empleadoMovimientosService.getTiposPorEstado(estado),
        };
      }

      where.movimientos = { some: movimientoFilter };
    }

    // Filtro por rango de fecha de ingreso
    if (fecha_ingreso_desde || fecha_ingreso_hasta) {
      where.fecha_ingreso = {};
      if (fecha_ingreso_desde) {
        where.fecha_ingreso.gte = new Date(fecha_ingreso_desde);
      }
      if (fecha_ingreso_hasta) {
        where.fecha_ingreso.lte = new Date(fecha_ingreso_hasta);
      }
    }

    // Filtro por estado de documentos (Single Responsibility: lógica separada)
    if (estado_docs) {
      if (estado_docs === EstadoDocumentosFilter.INCOMPLETOS) {
        // Filtrar por estado_documentacion del empleado (usar enum en vez de string)
        where.estado_documentacion = { not: EstadoDocumentacion.COMPLETO };
      } else {
        const documentosFilter =
          this.empleadoDocumentosService.buildDocumentosFilter(estado_docs);
        if (documentosFilter) {
          where.documentos = documentosFilter;
        }
      }
    }

    // Fechas para conteo de documentos (zona horaria Perú)
    const hoy = fechaHoyPeruDate();
    const fechaPorVencer = sumarDiasPeru(hoy, DIAS_POR_VENCER_DOCUMENTO);

    const [empleados, total] = await Promise.all([
      this.prisma.empleado.findMany({
        where,
        skip,
        take: limit,
        orderBy: { apellido_paterno: 'asc' },
        include: {
          area: { select: { id: true, nombre: true } },
          cargo: { select: { id: true, nombre: true } },
          sede: { select: { id: true, nombre: true } },
          solicitudes_cese: {
            where: { estado: 'APROBADA' },
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              tipo_cese: { select: { id: true, nombre: true } },
            },
          },
          contratos: {
            where: { estado: { in: ['ACTIVO', 'PENDIENTE', 'CESADO'] } },
            orderBy: { fecha_inicio: 'desc' },
            take: 1,
            select: {
              id: true,
              fecha_inicio: true,
              fecha_fin: true,
              fecha_cese: true,
              motivo_cese: true,
              estado: true,
            },
          },
          movimientos: {
            where: { tipo_movimiento: { in: ['BAJA', 'RENUNCIA'] } },
            orderBy: { fecha_movimiento: 'desc' },
            take: 1,
            select: { motivo: true, observaciones: true },
          },
          vinculos_laborales: {
            orderBy: { fecha_inicio: 'desc' },
            select: {
              id: true,
              fecha_inicio: true,
              fecha_fin: true,
              estado: true,
              motivo_cierre: true,
            },
          },
          _count: {
            select: {
              documentos: {
                where: {
                  eliminado: false,
                  es_version_vigente: true,
                  fecha_vencimiento: { not: null },
                },
              },
            },
          },
        },
      }),
      this.prisma.empleado.count({ where }),
    ]);

    // Obtener conteo de documentos vencidos y por vencer para cada empleado
    const empleadoIds = empleados.map((e) => e.id);
    const docsStats =
      await this.empleadoExportService.getDocumentosStatsForEmpleados(
        empleadoIds,
        hoy,
        fechaPorVencer,
      );

    // Mapear datos con estadísticas de documentos, tipo de cese y contrato vigente
    const data = empleados.map((emp) => {
      const stats = docsStats.get(emp.id) || { vencidos: 0, porVencer: 0 };
      const tipoCese = emp.solicitudes_cese?.[0]?.tipo_cese || null;
      const contratoVigente = emp.contratos?.[0] || null;
      const motivoCese =
        emp.movimientos?.[0]?.motivo ||
        emp.movimientos?.[0]?.observaciones ||
        null;

      // Computar estado REINGRESANTE: estado=ACTIVO + al menos 1 vinculo cerrado.
      // Retornar también fecha del cese anterior y motivo (ultimo vinculo cerrado).
      const vinculosCerrados = (emp.vinculos_laborales || []).filter(
        (v) => v.fecha_fin !== null,
      );
      const ultimoCese =
        vinculosCerrados
          .slice()
          .sort(
            (a, b) =>
              (b.fecha_fin?.getTime() ?? 0) - (a.fecha_fin?.getTime() ?? 0),
          )[0] ?? null;
      const esReingresanteComputed =
        emp.estado === 'ACTIVO' && vinculosCerrados.length >= 1;

      const { vinculos_laborales, ...empConRelaciones } = emp;
      const empSinRelaciones = { ...empConRelaciones };
      delete (empSinRelaciones as Partial<typeof empConRelaciones>)
        .solicitudes_cese;
      delete (empSinRelaciones as Partial<typeof empConRelaciones>).contratos;
      delete (empSinRelaciones as Partial<typeof empConRelaciones>).movimientos;
      return {
        ...empSinRelaciones,
        tipo_cese: tipoCese,
        contrato_vigente: contratoVigente,
        motivo_cese: motivoCese,
        docs_vencidos: stats.vencidos,
        docs_por_vencer: stats.porVencer,
        es_reingresante: esReingresanteComputed,
        fecha_cese_anterior: ultimoCese?.fecha_fin ?? null,
        motivo_cese_anterior: ultimoCese?.motivo_cierre ?? null,
        total_vinculos: (emp.vinculos_laborales || []).length,
        // Se expone la lista completa para que el frontend expanda los
        // empleados reingresantes a multiples filas (Req #1).
        vinculos_laborales: vinculos_laborales ?? [],
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async findOne(id: number, empresaId: number) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        area: true,
        cargo: true,
        sede: true,
        distrito: {
          include: {
            provincia: {
              include: { departamento: true },
            },
          },
        },
        regimen_pensionario: true,
        banco_haberes: true,
        banco_cts: true,
        familiares: true,
        documentos: {
          where: {
            es_version_vigente: true,
            eliminado: false,
          },
          orderBy: { fecha_carga: 'desc' },
          include: {
            tipo_documento_empleado: true,
          },
        },
        movimientos: {
          orderBy: { fecha_movimiento: 'desc' },
          include: { usuario: { select: { nombre_completo: true } } },
        },
        contratos: {
          orderBy: { fecha_inicio: 'desc' },
        },
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Transformar URLs de archivos
    const empleadoConUrls = {
      ...empleado,
      foto_url: empleado.foto_url
        ? this.uploadsService.getFileUrl(empleado.foto_url)
        : null,
      documentos: empleado.documentos.map((doc) => ({
        ...doc,
        archivo_url: doc.archivo_url
          ? this.uploadsService.getFileUrl(doc.archivo_url)
          : null,
      })),
    };

    return empleadoConUrls;
  }

  async create(empresaId: number, dto: CreateEmpleadoDto, usuarioId: number) {
    // Validaciones síncronas (no requieren BD) - se hacen fuera de la transacción
    // Validación 1: Edad mínima (18 años)
    if (!validarEdadMinima(dto.fecha_nacimiento)) {
      const edad = calcularEdad(parsearFechaISOenPeru(dto.fecha_nacimiento));
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.EDAD_MENOR_MINIMA}. Edad actual: ${edad} años.`,
      );
    }

    // Validación 2: Sueldo mínimo legal
    if (dto.sueldo_base && !validarSueldoMinimo(dto.sueldo_base)) {
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.SUELDO_MENOR_MINIMO}. Sueldo ingresado: S/. ${dto.sueldo_base}`,
      );
    }

    // Validación 3: Fecha de ingreso no puede ser futura
    const fechaIngreso = parsearFechaISOenPeru(dto.fecha_ingreso);
    const hoy = ahoraPeru().endOf('day').toJSDate();
    if (fechaIngreso > hoy) {
      throw new BadRequestException(
        `La fecha de ingreso no puede ser posterior a hoy. Fecha ingresada: ${formatearFechaPeru(fechaIngreso)}`,
      );
    }

    // Crear empleado - excluir campos que no van directo al modelo
    const restDto = this.excluirCamposUbicacion(dto);

    // SEGURIDAD (mass assignment + IDOR): validar propiedad de la foto antes de
    // persistirla. Evita referenciar la foto de un empleado de otra empresa.
    if (restDto.foto_url) {
      restDto.foto_url =
        (await this.uploadsService.resolverKeyPropia(
          restDto.foto_url,
          empresaId,
        )) ?? undefined;
    }

    // TRANSACCIÓN: Todas las validaciones de BD y creación en una sola transacción
    // Esto previene race conditions donde dos requests paralelos pasan la validación
    try {
      const empleado = await this.prisma.$transaction(async (tx) => {
        // Validación dentro de transacción 1: Verificar si existe empleado ACTIVO con este DNI (global)
        const empleadoActivoGlobal = await tx.empleado.findFirst({
          where: {
            numero_documento: dto.numero_documento,
            estado: 'ACTIVO',
          },
          include: { empresa: { select: { razon_social: true } } },
        });

        if (empleadoActivoGlobal) {
          throw new ConflictException(
            `${BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_GLOBAL}. El documento ${dto.numero_documento} está activo en: ${empleadoActivoGlobal.empresa?.razon_social || 'otra empresa'}`,
          );
        }

        // Validación dentro de transacción 2: Verificar documento único en la misma empresa
        const existeEnEmpresa = await tx.empleado.findFirst({
          where: {
            numero_documento: dto.numero_documento,
            empresa_id: empresaId,
          },
        });

        if (existeEnEmpresa) {
          throw new ConflictException(
            `${BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_EMPRESA}. Considere reactivar al empleado existente.`,
          );
        }

        // Validación dentro de transacción 3: Verificar que area y cargo pertenecen a la empresa
        if (dto.area_id) {
          const area = await tx.area.findFirst({
            where: { id: dto.area_id, empresa_id: empresaId },
          });
          if (!area) {
            throw new BadRequestException(
              'El área seleccionada no pertenece a su empresa',
            );
          }
        }
        if (dto.cargo_id) {
          const cargo = await tx.cargo.findFirst({
            where: { id: dto.cargo_id, empresa_id: empresaId },
          });
          if (!cargo) {
            throw new BadRequestException(
              'El cargo seleccionado no pertenece a su empresa',
            );
          }
        }
        if (dto.sede_id) {
          const sede = await tx.sede.findFirst({
            where: { id: dto.sede_id, empresa_id: empresaId },
          });
          if (!sede) {
            throw new BadRequestException(
              'La sede seleccionada no pertenece a su empresa',
            );
          }
        }

        // Crear empleado
        const nuevoEmpleado = await tx.empleado.create({
          data: {
            ...restDto,
            empresa_id: empresaId,
            fecha_nacimiento: parsearFechaISOenPeru(dto.fecha_nacimiento),
            fecha_ingreso: parsearFechaISOenPeru(dto.fecha_ingreso),
            fecha_planilla: dto.fecha_planilla
              ? parsearFechaISOenPeru(dto.fecha_planilla)
              : null,
            fecha_cese: dto.fecha_cese
              ? parsearFechaISOenPeru(dto.fecha_cese)
              : null,
            estudios: dto.estudios
              ? (JSON.parse(
                  JSON.stringify(dto.estudios),
                ) as Prisma.InputJsonValue)
              : [],
            capacitaciones: dto.capacitaciones
              ? (JSON.parse(
                  JSON.stringify(dto.capacitaciones),
                ) as Prisma.InputJsonValue)
              : [],
            experiencias: dto.experiencias
              ? (JSON.parse(
                  JSON.stringify(dto.experiencias),
                ) as Prisma.InputJsonValue)
              : [],
          },
        });

        // Registrar movimiento de alta dentro de la transacción
        await tx.empleadoMovimiento.create({
          data: {
            empleado_id: nuevoEmpleado.id,
            tipo_movimiento: 'ALTA',
            fecha_movimiento: parsearFechaISOenPeru(dto.fecha_ingreso),
            motivo: 'Ingreso a la empresa',
            usuario_id: usuarioId,
          },
        });

        return nuevoEmpleado;
      });

      return empleado;
    } catch (error: unknown) {
      // Capturar error de unique constraint de la BD (defensa en profundidad)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes('numero_documento')
      ) {
        throw new ConflictException(
          `${BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_EMPRESA}. El documento ya existe en el sistema.`,
        );
      }
      throw error;
    }
  }

  async update(id: number, empresaId: number, dto: UpdateEmpleadoDto) {
    const empleado = await this.findOne(id, empresaId);

    // Validación 1: Si cambia el documento, verificar duplicidad
    if (
      dto.numero_documento &&
      dto.numero_documento !== empleado.numero_documento
    ) {
      // Verificar si está activo en otra empresa (global)
      const empleadoActivoGlobal = await this.prisma.empleado.findFirst({
        where: {
          numero_documento: dto.numero_documento,
          estado: 'ACTIVO',
          id: { not: id },
        },
        include: { empresa: { select: { razon_social: true } } },
      });

      if (empleadoActivoGlobal) {
        throw new ConflictException(
          `${BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_GLOBAL}. El documento ${dto.numero_documento} está activo en: ${empleadoActivoGlobal.empresa?.razon_social || 'otra empresa'}`,
        );
      }

      // Verificar si existe en la misma empresa
      const existeEnEmpresa = await this.prisma.empleado.findFirst({
        where: {
          numero_documento: dto.numero_documento,
          empresa_id: empresaId,
          id: { not: id },
        },
      });

      if (existeEnEmpresa) {
        throw new ConflictException(
          BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_EMPRESA,
        );
      }
    }

    // Validación 2: Edad mínima si cambia fecha de nacimiento
    if (dto.fecha_nacimiento) {
      if (!validarEdadMinima(dto.fecha_nacimiento)) {
        const edad = calcularEdad(parsearFechaISOenPeru(dto.fecha_nacimiento));
        throw new BadRequestException(
          `${BUSINESS_ERROR_MESSAGES.EDAD_MENOR_MINIMA}. Edad actual: ${edad} años.`,
        );
      }
    }

    // Validación 3: Sueldo mínimo si cambia el sueldo
    if (
      dto.sueldo_base !== undefined &&
      !validarSueldoMinimo(dto.sueldo_base)
    ) {
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.SUELDO_MENOR_MINIMO}. Sueldo ingresado: S/. ${dto.sueldo_base}`,
      );
    }

    // Validar cambio a estado ACTIVO
    if (dto.estado === 'ACTIVO' && empleado.estado !== 'ACTIVO') {
      await this.empleadoDocumentosService.validarPuedeEstarActivo(
        id,
        empresaId,
      );
    }

    // Validación 4: Verificar que area, cargo y sede pertenecen a la misma empresa (si cambian)
    await this.validarEntidadesEmpresa(
      empresaId,
      dto.area_id,
      dto.cargo_id,
      dto.sede_id,
    );

    // Excluir campos string de ubicación que no son columnas Prisma
    const restDto = this.excluirCamposUbicacion(dto);
    const updateData: Prisma.EmpleadoUncheckedUpdateInput = {
      ...restDto,
    } as unknown as Prisma.EmpleadoUncheckedUpdateInput;

    // SEGURIDAD (mass assignment + IDOR): validar propiedad de la foto.
    if (dto.foto_url !== undefined && dto.foto_url !== null) {
      updateData.foto_url = await this.uploadsService.resolverKeyPropia(
        dto.foto_url,
        empresaId,
      );
    }

    // Convertir emails vacíos a null
    if (updateData.email === '') updateData.email = null;
    if (updateData.email_asignado === '') updateData.email_asignado = null;

    // Convertir fechas usando timezone Peru
    if (dto.fecha_nacimiento)
      updateData.fecha_nacimiento = parsearFechaISOenPeru(dto.fecha_nacimiento);
    if (dto.fecha_ingreso)
      updateData.fecha_ingreso = parsearFechaISOenPeru(dto.fecha_ingreso);
    if (dto.fecha_planilla)
      updateData.fecha_planilla = parsearFechaISOenPeru(dto.fecha_planilla);
    if (dto.fecha_cese)
      updateData.fecha_cese = parsearFechaISOenPeru(dto.fecha_cese);

    return this.prisma.empleado.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    // Validar que no tenga contratos vigentes
    const contratosActivos = await this.prisma.contrato.count({
      where: {
        empleado_id: id,
        estado: 'ACTIVO',
      },
    });

    if (contratosActivos > 0) {
      throw new BadRequestException(
        `No se puede eliminar el empleado porque tiene ${contratosActivos} contrato(s) vigente(s). Primero termine o elimine los contratos.`,
      );
    }

    // Validar que no tenga uniformes entregados sin devolver. Se cuenta
    // directamente para no acoplar este servicio al módulo de inventario.
    const uniformesPendientes = await this.prisma.itemInventario.count({
      where: { empleado_id: id, estado: 'ENTREGADO' },
    });

    if (uniformesPendientes > 0) {
      throw new ConflictException(
        `El empleado tiene ${uniformesPendientes} uniforme(s) sin devolver. Registra la devolución o el descuento antes de eliminarlo.`,
      );
    }

    // Recolectar archivos ANTES de eliminar (el CASCADE borrará los registros)
    const filesToDelete =
      await this.fileCleanupService.collectEmpleadoFiles(id);

    if (filesToDelete.length > 0) {
      this.logger.log(
        `Empleado ${id}: ${filesToDelete.length} archivos a eliminar`,
      );
    }

    // Eliminar empleado (CASCADE elimina registros relacionados)
    await this.prisma.empleado.delete({
      where: { id },
    });

    // Eliminar archivos físicos (best-effort, no bloquea si falla)
    if (filesToDelete.length > 0) {
      const cleanupResult =
        await this.fileCleanupService.deleteFiles(filesToDelete);
      this.logger.log(
        `Cleanup empleado ${id}: ${cleanupResult.deleted} eliminados, ${cleanupResult.failed} fallidos`,
      );
    }

    return { message: 'Empleado eliminado correctamente' };
  }

  // Métodos para familiares

  /**
   * Excluye los campos de ubicación (departamento/provincia/distrito) que llegan
   * en el DTO pero no son columnas del modelo Prisma de Empleado.
   */
  private excluirCamposUbicacion<
    T extends {
      departamento?: unknown;
      provincia?: unknown;
      distrito?: unknown;
    },
  >(dto: T): Omit<T, 'departamento' | 'provincia' | 'distrito'> {
    const resto = { ...dto };
    delete resto.departamento;
    delete resto.provincia;
    delete resto.distrito;
    return resto;
  }

  private async validarEntidadesEmpresa(
    empresaId: number,
    areaId?: number,
    cargoId?: number,
    sedeId?: number,
  ): Promise<void> {
    const validaciones: Promise<void>[] = [];

    if (areaId) {
      validaciones.push(
        this.prisma.area
          .findFirst({ where: { id: areaId, empresa_id: empresaId } })
          .then((area) => {
            if (!area) {
              throw new BadRequestException(
                `El área seleccionada no pertenece a su empresa`,
              );
            }
          }),
      );
    }

    if (cargoId) {
      validaciones.push(
        this.prisma.cargo
          .findFirst({ where: { id: cargoId, empresa_id: empresaId } })
          .then((cargo) => {
            if (!cargo) {
              throw new BadRequestException(
                `El cargo seleccionado no pertenece a su empresa`,
              );
            }
          }),
      );
    }

    if (sedeId) {
      validaciones.push(
        this.prisma.sede
          .findFirst({ where: { id: sedeId, empresa_id: empresaId } })
          .then((sede) => {
            if (!sede) {
              throw new BadRequestException(
                `La sede seleccionada no pertenece a su empresa`,
              );
            }
          }),
      );
    }

    await Promise.all(validaciones);
  }

  /**
   * Calcula y actualiza el estado de documentación de un empleado
   * basándose en los documentos obligatorios configurados
   */
}
