import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePlantillaOnboardingDto,
  UpdatePlantillaOnboardingDto,
  CreateTareaOnboardingDto,
  UpdateTareaOnboardingDto,
  IniciarOnboardingDto,
  CompletarTareaDto,
  OmitirTareaDto,
  FilterProcesoOnboardingDto,
} from './dto';
import { Prisma, EstadoProcesoOnboarding } from '@prisma/client';
import { ahoraPeru, leerFechaPrisma } from '../../common/utils/datetime.util';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  // ==================== PLANTILLAS ====================

  async findAllPlantillas(empresaId: number) {
    return this.prisma.plantillaOnboarding.findMany({
      where: { empresa_id: empresaId },
      include: {
        cargo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
        _count: { select: { tareas: true, procesos: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOnePlantilla(id: number, empresaId: number) {
    const plantilla = await this.prisma.plantillaOnboarding.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        cargo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
        tareas: {
          where: { activo: true },
          orderBy: [
            { fase: 'asc' },
            { dias_desde_ingreso: 'asc' },
            { orden: 'asc' },
          ],
        },
      },
    });

    if (!plantilla) {
      throw new NotFoundException('Plantilla de onboarding no encontrada');
    }

    return plantilla;
  }

  async createPlantilla(empresaId: number, dto: CreatePlantillaOnboardingDto) {
    // Verificar código único
    const existente = await this.prisma.plantillaOnboarding.findFirst({
      where: { codigo: dto.codigo, empresa_id: empresaId },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una plantilla con el código ${dto.codigo}`,
      );
    }

    const { tareas, ...plantillaData } = dto;

    return this.prisma.plantillaOnboarding.create({
      data: {
        ...plantillaData,
        empresa_id: empresaId,
        tareas: tareas
          ? {
              create: tareas.map((t, index) => ({
                ...t,
                orden: t.orden ?? index,
              })),
            }
          : undefined,
      },
      include: {
        tareas: true,
      },
    });
  }

  async updatePlantilla(
    id: number,
    empresaId: number,
    dto: UpdatePlantillaOnboardingDto,
  ) {
    await this.findOnePlantilla(id, empresaId);

    return this.prisma.plantillaOnboarding.update({
      where: { id },
      data: dto,
      include: {
        cargo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
      },
    });
  }

  async deletePlantilla(id: number, empresaId: number) {
    const plantilla = await this.findOnePlantilla(id, empresaId);

    // Verificar si tiene procesos activos
    const procesosActivos = await this.prisma.procesoOnboarding.count({
      where: {
        plantilla_id: id,
        estado: { in: ['PENDIENTE', 'EN_PROGRESO'] },
      },
    });

    if (procesosActivos > 0) {
      throw new ConflictException(
        `No se puede eliminar la plantilla porque tiene ${procesosActivos} proceso(s) activo(s)`,
      );
    }

    await this.prisma.plantillaOnboarding.delete({ where: { id } });

    return { message: 'Plantilla eliminada correctamente' };
  }

  // ==================== TAREAS DE PLANTILLA ====================

  async addTareaToPlantilla(
    plantillaId: number,
    empresaId: number,
    dto: CreateTareaOnboardingDto,
  ) {
    await this.findOnePlantilla(plantillaId, empresaId);

    return this.prisma.tareaOnboarding.create({
      data: {
        ...dto,
        plantilla_id: plantillaId,
      },
    });
  }

  async updateTarea(
    tareaId: number,
    plantillaId: number,
    empresaId: number,
    dto: UpdateTareaOnboardingDto,
  ) {
    await this.findOnePlantilla(plantillaId, empresaId);

    const tarea = await this.prisma.tareaOnboarding.findFirst({
      where: { id: tareaId, plantilla_id: plantillaId },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return this.prisma.tareaOnboarding.update({
      where: { id: tareaId },
      data: dto,
    });
  }

  async deleteTarea(tareaId: number, plantillaId: number, empresaId: number) {
    await this.findOnePlantilla(plantillaId, empresaId);

    const tarea = await this.prisma.tareaOnboarding.findFirst({
      where: { id: tareaId, plantilla_id: plantillaId },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }

    // Verificar si hay tareas de empleado asociadas
    const tareasEmpleado = await this.prisma.tareaEmpleadoOnboarding.count({
      where: { tarea_onboarding_id: tareaId },
    });

    if (tareasEmpleado > 0) {
      // Desactivar en lugar de eliminar
      await this.prisma.tareaOnboarding.update({
        where: { id: tareaId },
        data: { activo: false },
      });
      return { message: 'Tarea desactivada (tiene registros asociados)' };
    }

    await this.prisma.tareaOnboarding.delete({ where: { id: tareaId } });

    return { message: 'Tarea eliminada correctamente' };
  }

  // ==================== PROCESOS DE ONBOARDING ====================

  async iniciarOnboarding(
    empleadoId: number,
    empresaId: number,
    dto: IniciarOnboardingDto,
    usuarioId: number,
  ) {
    // Verificar empleado
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Verificar si ya tiene un proceso activo
    const procesoActivo = await this.prisma.procesoOnboarding.findFirst({
      where: {
        empleado_id: empleadoId,
        estado: { in: ['PENDIENTE', 'EN_PROGRESO'] },
      },
    });

    if (procesoActivo) {
      throw new ConflictException(
        'El empleado ya tiene un proceso de onboarding activo',
      );
    }

    // Obtener plantilla con tareas
    const plantilla = await this.findOnePlantilla(dto.plantilla_id, empresaId);

    if (!plantilla.activo) {
      throw new BadRequestException('La plantilla está desactivada');
    }

    const fechaIngresoLux = leerFechaPrisma(empleado.fecha_ingreso);
    const fechaFinEsperada = fechaIngresoLux
      .plus({ days: plantilla.duracion_dias })
      .toJSDate();

    // Crear proceso con todas las tareas
    const proceso = await this.prisma.procesoOnboarding.create({
      data: {
        empleado_id: empleadoId,
        plantilla_id: dto.plantilla_id,
        empresa_id: empresaId,
        fecha_fin_esperada: fechaFinEsperada,
        responsable_rrhh_id: dto.responsable_rrhh_id || usuarioId,
        mentor_id: dto.mentor_id,
        observaciones: dto.observaciones,
        estado: 'EN_PROGRESO',
        tareas: {
          create: plantilla.tareas.map((tarea) => {
            const fechaLimite = fechaIngresoLux
              .plus({ days: tarea.dias_desde_ingreso })
              .toJSDate();
            return {
              tarea_onboarding_id: tarea.id,
              fecha_limite: fechaLimite,
              estado: 'PENDIENTE',
            };
          }),
        },
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
        plantilla: { select: { id: true, nombre: true } },
        tareas: {
          include: {
            tarea_onboarding: true,
          },
          orderBy: { fecha_limite: 'asc' },
        },
      },
    });

    return proceso;
  }

  async findAllProcesos(
    empresaId: number,
    filters: FilterProcesoOnboardingDto,
  ) {
    const { estado, empleado_id, con_alertas, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProcesoOnboardingWhereInput = {
      empresa_id: empresaId,
    };

    if (estado) where.estado = estado as EstadoProcesoOnboarding;
    if (empleado_id) where.empleado_id = empleado_id;

    const [data, total] = await Promise.all([
      this.prisma.procesoOnboarding.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              cargo: { select: { nombre: true } },
              area: { select: { nombre: true } },
            },
          },
          plantilla: { select: { id: true, nombre: true } },
          _count: {
            select: { tareas: true },
          },
        },
      }),
      this.prisma.procesoOnboarding.count({ where }),
    ]);

    // Calcular tareas completadas para cada proceso
    const procesosConProgreso = await Promise.all(
      data.map(async (proceso) => {
        const tareasCompletadas =
          await this.prisma.tareaEmpleadoOnboarding.count({
            where: {
              proceso_id: proceso.id,
              estado: { in: ['COMPLETADA', 'OMITIDA'] },
            },
          });

        const tareasVencidas = await this.prisma.tareaEmpleadoOnboarding.count({
          where: {
            proceso_id: proceso.id,
            estado: 'PENDIENTE',
            fecha_limite: { lt: ahoraPeru().toJSDate() },
          },
        });

        return {
          ...proceso,
          tareas_completadas: tareasCompletadas,
          tareas_vencidas: tareasVencidas,
        };
      }),
    );

    // Filtrar por alertas si se solicita
    let resultado = procesosConProgreso;
    if (con_alertas) {
      resultado = procesosConProgreso.filter((p) => p.tareas_vencidas > 0);
    }

    return {
      data: resultado,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneProceso(procesoId: number, empresaId: number) {
    const proceso = await this.prisma.procesoOnboarding.findFirst({
      where: { id: procesoId, empresa_id: empresaId },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            fecha_ingreso: true,
            cargo: { select: { nombre: true } },
            area: { select: { nombre: true } },
          },
        },
        plantilla: { select: { id: true, nombre: true } },
        responsable_rrhh: { select: { id: true, nombre_completo: true } },
        mentor: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
          },
        },
        tareas: {
          include: {
            tarea_onboarding: true,
            completada_por: { select: { id: true, nombre_completo: true } },
          },
          orderBy: [
            { tarea_onboarding: { fase: 'asc' } },
            { fecha_limite: 'asc' },
          ],
        },
      },
    });

    if (!proceso) {
      throw new NotFoundException('Proceso de onboarding no encontrado');
    }

    // Agrupar tareas por fase
    const tareasPorFase = proceso.tareas.reduce(
      (acc, tarea) => {
        const fase = tarea.tarea_onboarding.fase;
        if (!acc[fase]) acc[fase] = [];
        acc[fase].push(tarea);
        return acc;
      },
      {} as Record<string, typeof proceso.tareas>,
    );

    // Calcular progreso
    const totalTareas = proceso.tareas.length;
    const tareasCompletadas = proceso.tareas.filter(
      (t) => t.estado === 'COMPLETADA' || t.estado === 'OMITIDA',
    ).length;
    const progreso =
      totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

    return {
      ...proceso,
      tareas_por_fase: tareasPorFase,
      progreso_calculado: progreso,
      total_tareas: totalTareas,
      tareas_completadas: tareasCompletadas,
    };
  }

  async completarTarea(
    procesoId: number,
    tareaEmpleadoId: number,
    empresaId: number,
    usuarioId: number,
    dto: CompletarTareaDto,
  ) {
    const proceso = await this.prisma.procesoOnboarding.findFirst({
      where: { id: procesoId, empresa_id: empresaId },
    });

    if (!proceso) {
      throw new NotFoundException('Proceso no encontrado');
    }

    const tareaEmpleado = await this.prisma.tareaEmpleadoOnboarding.findFirst({
      where: { id: tareaEmpleadoId, proceso_id: procesoId },
      include: { tarea_onboarding: true },
    });

    if (!tareaEmpleado) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (tareaEmpleado.estado === 'COMPLETADA') {
      throw new BadRequestException('La tarea ya está completada');
    }

    // Verificar si requiere evidencia
    if (
      tareaEmpleado.tarea_onboarding.requiere_evidencia &&
      !dto.evidencia_url
    ) {
      throw new BadRequestException(
        'Esta tarea requiere evidencia (archivo adjunto)',
      );
    }

    // SEGURIDAD (mass assignment + IDOR): validar propiedad de la evidencia.
    const evidenciaUrl = dto.evidencia_url
      ? await this.uploadsService.resolverKeyPropia(
          dto.evidencia_url,
          empresaId,
        )
      : dto.evidencia_url;

    // Completar tarea
    await this.prisma.tareaEmpleadoOnboarding.update({
      where: { id: tareaEmpleadoId },
      data: {
        estado: 'COMPLETADA',
        fecha_completada: ahoraPeru().toJSDate(),
        completada_por_id: usuarioId,
        observaciones: dto.observaciones,
        evidencia_url: evidenciaUrl,
        evidencia_nombre: dto.evidencia_nombre,
      },
    });

    // Recalcular progreso del proceso
    await this.actualizarProgresoProceso(procesoId);

    return { message: 'Tarea completada correctamente' };
  }

  async omitirTarea(
    procesoId: number,
    tareaEmpleadoId: number,
    empresaId: number,
    usuarioId: number,
    dto: OmitirTareaDto,
  ) {
    const proceso = await this.prisma.procesoOnboarding.findFirst({
      where: { id: procesoId, empresa_id: empresaId },
    });

    if (!proceso) {
      throw new NotFoundException('Proceso no encontrado');
    }

    const tareaEmpleado = await this.prisma.tareaEmpleadoOnboarding.findFirst({
      where: { id: tareaEmpleadoId, proceso_id: procesoId },
      include: { tarea_onboarding: true },
    });

    if (!tareaEmpleado) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (tareaEmpleado.tarea_onboarding.es_obligatoria) {
      throw new BadRequestException('No se puede omitir una tarea obligatoria');
    }

    await this.prisma.tareaEmpleadoOnboarding.update({
      where: { id: tareaEmpleadoId },
      data: {
        estado: 'OMITIDA',
        fecha_completada: ahoraPeru().toJSDate(),
        completada_por_id: usuarioId,
        observaciones: dto.motivo,
      },
    });

    await this.actualizarProgresoProceso(procesoId);

    return { message: 'Tarea omitida correctamente' };
  }

  async cancelarProceso(procesoId: number, empresaId: number, motivo: string) {
    const proceso = await this.prisma.procesoOnboarding.findFirst({
      where: { id: procesoId, empresa_id: empresaId },
    });

    if (!proceso) {
      throw new NotFoundException('Proceso no encontrado');
    }

    if (proceso.estado === 'COMPLETADO' || proceso.estado === 'CANCELADO') {
      throw new BadRequestException(
        `El proceso ya está ${proceso.estado.toLowerCase()}`,
      );
    }

    await this.prisma.procesoOnboarding.update({
      where: { id: procesoId },
      data: {
        estado: 'CANCELADO',
        observaciones: proceso.observaciones
          ? `${proceso.observaciones}\n\nCancelado: ${motivo}`
          : `Cancelado: ${motivo}`,
      },
    });

    return { message: 'Proceso cancelado correctamente' };
  }

  // ==================== HELPERS ====================

  private async actualizarProgresoProceso(procesoId: number) {
    const [totalTareas, tareasFinalizadas] = await Promise.all([
      this.prisma.tareaEmpleadoOnboarding.count({
        where: { proceso_id: procesoId },
      }),
      this.prisma.tareaEmpleadoOnboarding.count({
        where: {
          proceso_id: procesoId,
          estado: { in: ['COMPLETADA', 'OMITIDA'] },
        },
      }),
    ]);

    const progreso =
      totalTareas > 0 ? Math.round((tareasFinalizadas / totalTareas) * 100) : 0;
    const estado = progreso === 100 ? 'COMPLETADO' : 'EN_PROGRESO';

    await this.prisma.procesoOnboarding.update({
      where: { id: procesoId },
      data: {
        progreso_porcentaje: progreso,
        estado,
        fecha_fin_real: estado === 'COMPLETADO' ? ahoraPeru().toJSDate() : null,
      },
    });
  }

  // ==================== DASHBOARD ====================

  async getDashboard(empresaId: number) {
    const hoy = ahoraPeru().toJSDate();

    const [
      procesosActivos,
      procesosCompletados,
      tareasVencidas,
      tareasPendientesHoy,
      procesosPorEstado,
    ] = await Promise.all([
      this.prisma.procesoOnboarding.count({
        where: { empresa_id: empresaId, estado: 'EN_PROGRESO' },
      }),
      this.prisma.procesoOnboarding.count({
        where: { empresa_id: empresaId, estado: 'COMPLETADO' },
      }),
      this.prisma.tareaEmpleadoOnboarding.count({
        where: {
          proceso: { empresa_id: empresaId, estado: 'EN_PROGRESO' },
          estado: 'PENDIENTE',
          fecha_limite: { lt: hoy },
        },
      }),
      this.prisma.tareaEmpleadoOnboarding.count({
        where: {
          proceso: { empresa_id: empresaId, estado: 'EN_PROGRESO' },
          estado: 'PENDIENTE',
          fecha_limite: {
            gte: ahoraPeru().startOf('day').toJSDate(),
            lt: ahoraPeru().endOf('day').toJSDate(),
          },
        },
      }),
      this.prisma.procesoOnboarding.groupBy({
        by: ['estado'],
        where: { empresa_id: empresaId },
        _count: true,
      }),
    ]);

    // Obtener alertas (tareas vencidas con detalle)
    const alertas = await this.prisma.tareaEmpleadoOnboarding.findMany({
      where: {
        proceso: { empresa_id: empresaId, estado: 'EN_PROGRESO' },
        estado: 'PENDIENTE',
        fecha_limite: { lt: ahoraPeru().toJSDate() },
      },
      take: 10,
      include: {
        proceso: {
          include: {
            empleado: {
              select: {
                nombres: true,
                apellido_paterno: true,
              },
            },
          },
        },
        tarea_onboarding: {
          select: { nombre: true, responsable: true },
        },
      },
      orderBy: { fecha_limite: 'asc' },
    });

    return {
      resumen: {
        procesos_activos: procesosActivos,
        procesos_completados: procesosCompletados,
        tareas_vencidas: tareasVencidas,
        tareas_pendientes_hoy: tareasPendientesHoy,
      },
      por_estado: procesosPorEstado.reduce(
        (acc, e) => {
          acc[e.estado] = e._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      alertas: alertas.map((a) => ({
        tarea: a.tarea_onboarding.nombre,
        responsable: a.tarea_onboarding.responsable,
        empleado: `${a.proceso.empleado.nombres} ${a.proceso.empleado.apellido_paterno}`,
        fecha_limite: a.fecha_limite,
        dias_vencido: Math.floor(
          (ahoraPeru().toJSDate().getTime() -
            new Date(a.fecha_limite).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      })),
    };
  }

  // ==================== BUSCAR PLANTILLA ADECUADA ====================

  async buscarPlantillaParaEmpleado(empleadoId: number, empresaId: number) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Buscar plantilla específica para cargo y área
    let plantilla = await this.prisma.plantillaOnboarding.findFirst({
      where: {
        empresa_id: empresaId,
        cargo_id: empleado.cargo_id,
        area_id: empleado.area_id,
        activo: true,
      },
    });

    // Si no hay, buscar solo por cargo
    if (!plantilla && empleado.cargo_id) {
      plantilla = await this.prisma.plantillaOnboarding.findFirst({
        where: {
          empresa_id: empresaId,
          cargo_id: empleado.cargo_id,
          area_id: null,
          activo: true,
        },
      });
    }

    // Si no hay, buscar solo por área
    if (!plantilla && empleado.area_id) {
      plantilla = await this.prisma.plantillaOnboarding.findFirst({
        where: {
          empresa_id: empresaId,
          cargo_id: null,
          area_id: empleado.area_id,
          activo: true,
        },
      });
    }

    // Si no hay, buscar plantilla genérica
    if (!plantilla) {
      plantilla = await this.prisma.plantillaOnboarding.findFirst({
        where: {
          empresa_id: empresaId,
          cargo_id: null,
          area_id: null,
          activo: true,
        },
      });
    }

    return plantilla;
  }
}
