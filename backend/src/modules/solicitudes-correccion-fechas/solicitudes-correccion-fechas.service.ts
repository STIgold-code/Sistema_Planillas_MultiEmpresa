import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EstadoPlanilla, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSolicitudCorreccionFechaDto,
  FilterSolicitudCorreccionFechaDto,
  ResolverSolicitudCorreccionFechaDto,
} from './dto';
import {
  ahoraPeru,
  parsearFechaISOenPeru,
  toDateOnly,
} from '../../common/utils/datetime.util';
import {
  MIN_OPERATIONAL_YEAR,
  anioMaximoContrato,
  esAnioContratoValido,
} from '../../common/validators/is-realistic-date.validator';
import { ventanaDePeriodo } from '../tareo/ventana-periodo';
import { archivarArchivosEnBancoEmpleado } from '../banco-documentos/helpers/archivar-en-banco.helper';
import {
  PeriodoLiquidado,
  calcularRangoAfectado,
  mensajeAdvertenciaPlanillas,
  periodosLiquidadosAfectados,
} from './advertencia-planillas';

/** Sustento ya subido al storage, listo para colgarse de la solicitud. */
export interface ArchivoSustento {
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string;
  archivo_tamano?: number;
}

const MENSAJE_SIN_SUSTENTO =
  'Debe adjuntar al menos un documento que sustente la corrección de fechas';

const MOTIVO_MIN_LENGTH = 10;

/** Planillas ya liquidadas: tocar su ventana amerita advertencia. */
const ESTADOS_PLANILLA_LIQUIDADA = [
  EstadoPlanilla.APROBADA,
  EstadoPlanilla.PAGADA,
];

/**
 * Corrección de fechas de contrato con aprobación.
 *
 * El operario NO edita las fechas del contrato: propone una corrección con
 * sustento obligatorio y un aprobador (`contratos:edicion_aprobar`) la aplica
 * viendo el diff. El contrato solo cambia cuando la solicitud se APRUEBA.
 *
 * Aislamiento multiempresa: TODA query va acotada por la empresa activa. El
 * contrato no tiene `empresa_id` propio — se llega por `empleado.empresa_id`.
 */
@Injectable()
export class SolicitudesCorreccionFechasService {
  constructor(private prisma: PrismaService) {}

  async create(
    empresaId: number,
    dto: CreateSolicitudCorreccionFechaDto,
    usuarioId: number,
    archivos: ArchivoSustento[],
  ) {
    // Primera guarda: sin sustento no se toca la base. Corregir fechas mueve
    // derechos laborales (vacaciones, CTS, gratificación) y no puede quedar
    // sin respaldo documental.
    if (!archivos || archivos.length === 0) {
      throw new BadRequestException(MENSAJE_SIN_SUSTENTO);
    }

    if (!dto.motivo || dto.motivo.trim().length < MOTIVO_MIN_LENGTH) {
      throw new BadRequestException(
        `El motivo debe tener al menos ${MOTIVO_MIN_LENGTH} caracteres`,
      );
    }

    this.validarFechaPropuesta(
      dto.fecha_inicio,
      'La fecha de inicio propuesta',
    );
    if (dto.fecha_fin) {
      this.validarFechaPropuesta(dto.fecha_fin, 'La fecha de fin propuesta');
      if (dto.fecha_fin.slice(0, 10) < dto.fecha_inicio.slice(0, 10)) {
        throw new BadRequestException(
          'La fecha de fin propuesta no puede ser anterior a la fecha de inicio propuesta',
        );
      }
    }

    const contrato = await this.prisma.contrato.findFirst({
      where: { id: dto.contrato_id, empleado: { empresa_id: empresaId } },
      select: {
        id: true,
        empleado_id: true,
        estado: true,
        fecha_inicio: true,
        fecha_fin: true,
      },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }

    if (contrato.estado === 'ANULADO') {
      throw new BadRequestException(
        'No se pueden corregir las fechas de un contrato anulado',
      );
    }

    const sinCambios =
      toDateOnly(dto.fecha_inicio) === toDateOnly(contrato.fecha_inicio) &&
      toDateOnly(dto.fecha_fin ?? null) === toDateOnly(contrato.fecha_fin);
    if (sinCambios) {
      throw new BadRequestException(
        'La solicitud no propone ningún cambio: las fechas son iguales a las actuales',
      );
    }

    // Una sola corrección viva por contrato: dos pendientes sobre el mismo
    // contrato se pisarían entre sí al aprobarse.
    const pendiente = await this.prisma.solicitudCorreccionFecha.findFirst({
      where: {
        contrato_id: contrato.id,
        empresa_id: empresaId,
        estado: 'PENDIENTE',
      },
      select: { id: true },
    });
    if (pendiente) {
      throw new BadRequestException(
        'Ya existe una solicitud de corrección pendiente para este contrato',
      );
    }

    return this.prisma.solicitudCorreccionFecha.create({
      data: {
        empresa_id: empresaId,
        contrato_id: contrato.id,
        empleado_id: contrato.empleado_id,
        // Snapshot: el aprobador debe ver el diff tal como se le propuso.
        fecha_inicio_actual: contrato.fecha_inicio,
        fecha_fin_actual: contrato.fecha_fin,
        fecha_inicio_propuesta: parsearFechaISOenPeru(dto.fecha_inicio),
        fecha_fin_propuesta: dto.fecha_fin
          ? parsearFechaISOenPeru(dto.fecha_fin)
          : null,
        motivo: dto.motivo.trim(),
        solicitado_por_id: usuarioId,
        archivos: {
          create: archivos.map((a) => ({
            archivo_url: a.archivo_url,
            archivo_nombre: a.archivo_nombre,
            archivo_tipo: a.archivo_tipo ?? null,
            archivo_tamano: a.archivo_tamano ?? null,
          })),
        },
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(empresaId: number, filters: FilterSolicitudCorreccionFechaDto) {
    const { buscar, estado, empleado_id, contrato_id } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.SolicitudCorreccionFechaWhereInput = {
      empresa_id: empresaId,
    };
    if (estado) where.estado = estado;
    if (empleado_id) where.empleado_id = empleado_id;
    if (contrato_id) where.contrato_id = contrato_id;

    if (buscar) {
      where.OR = [
        { motivo: { contains: buscar, mode: 'insensitive' } },
        {
          empleado: {
            OR: [
              { nombres: { contains: buscar, mode: 'insensitive' } },
              { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
              { apellido_materno: { contains: buscar, mode: 'insensitive' } },
              { numero_documento: { contains: buscar, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.solicitudCorreccionFecha.findMany({
        where,
        include: this.defaultInclude(),
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitudCorreccionFecha.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudCorreccionFecha.findFirst({
      where: { id, empresa_id: empresaId },
      include: this.defaultInclude(),
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud de corrección no encontrada');
    }
    return solicitud;
  }

  /**
   * Aplica las fechas propuestas al contrato y archiva el sustento en el legajo
   * del trabajador. Si el rango afectado toca planillas ya liquidadas, guarda
   * una advertencia — informa, no bloquea.
   */
  async aprobar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto?: ResolverSolicitudCorreccionFechaDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes pendientes',
      );
    }

    // Vigencia real al momento de aprobar (el contrato pudo cambiar desde que
    // se solicitó); el snapshot solo sirve para mostrar el diff propuesto.
    const contrato = await this.prisma.contrato.findFirst({
      where: {
        id: solicitud.contrato_id,
        empleado: { empresa_id: empresaId },
      },
      select: {
        id: true,
        empleado_id: true,
        fecha_inicio: true,
        fecha_fin: true,
      },
    });
    if (!contrato) {
      throw new NotFoundException(
        'El contrato de la solicitud ya no existe o no pertenece a la empresa',
      );
    }

    const advertencia = await this.calcularAdvertenciaPlanillas(empresaId, {
      fechaInicioActual: contrato.fecha_inicio,
      fechaFinActual: contrato.fecha_fin,
      fechaInicioPropuesta: solicitud.fecha_inicio_propuesta,
      fechaFinPropuesta: solicitud.fecha_fin_propuesta,
    });

    await this.prisma.$transaction(async (tx) => {
      // Guarda optimista contra doble aprobación concurrente: si otro usuario
      // ya la resolvió, no hay filas que actualizar y no se toca el contrato.
      const resueltas = await tx.solicitudCorreccionFecha.updateMany({
        where: { id, empresa_id: empresaId, estado: 'PENDIENTE' },
        data: {
          estado: 'APROBADA',
          resuelto_por_id: usuarioId,
          fecha_resolucion: ahoraPeru().toJSDate(),
          observaciones_admin: dto?.observaciones_admin ?? null,
          advertencia_planillas: advertencia,
        },
      });
      if (resueltas.count === 0) {
        throw new BadRequestException(
          'La solicitud ya fue resuelta por otro usuario',
        );
      }

      await tx.contrato.update({
        where: { id: contrato.id },
        data: {
          fecha_inicio: solicitud.fecha_inicio_propuesta,
          fecha_fin: solicitud.fecha_fin_propuesta,
        },
      });

      // Trazabilidad: el sustento queda visible en el tab Documentos del
      // trabajador, reutilizando la misma url (no se duplica el storage).
      await archivarArchivosEnBancoEmpleado(tx, {
        empleadoId: contrato.empleado_id,
        empresaId,
        tipoCodigo: 'SUSTENTO_CORRECCION_FECHA',
        archivos: solicitud.archivos.map((a) => ({
          archivo_url: a.archivo_url,
          archivo_nombre: a.archivo_nombre,
          archivo_tipo: a.archivo_tipo,
          archivo_tamano: a.archivo_tamano,
        })),
        subidoPorUsuarioId: usuarioId,
        descripcion: `Corrección de fechas del contrato #${contrato.id} aprobada — solicitud #${id}`,
      });
    });

    return this.findOne(id, empresaId);
  }

  /** Rechaza la solicitud. El contrato NO se toca. */
  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto?: ResolverSolicitudCorreccionFechaDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes pendientes',
      );
    }

    const resueltas = await this.prisma.solicitudCorreccionFecha.updateMany({
      where: { id, empresa_id: empresaId, estado: 'PENDIENTE' },
      data: {
        estado: 'RECHAZADA',
        resuelto_por_id: usuarioId,
        fecha_resolucion: ahoraPeru().toJSDate(),
        observaciones_admin: dto?.observaciones_admin ?? null,
      },
    });
    if (resueltas.count === 0) {
      throw new BadRequestException(
        'La solicitud ya fue resuelta por otro usuario',
      );
    }

    return this.findOne(id, empresaId);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * El create llega por multipart y el controller arma el DTO a mano, así que
   * el ValidationPipe global no corre: las fechas se validan aquí, con la misma
   * regla de años que el decorador `IsRealisticFutureDate`.
   */
  private validarFechaPropuesta(fecha: string, etiqueta: string): void {
    if (!/^\d{4}-\d{2}-\d{2}/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      throw new BadRequestException(`${etiqueta} no es una fecha válida`);
    }
    const anio = parseInt(fecha.slice(0, 4), 10);
    if (!esAnioContratoValido(anio)) {
      throw new BadRequestException(
        `${etiqueta} tiene un año fuera del rango permitido ` +
          `(${MIN_OPERATIONAL_YEAR}-${anioMaximoContrato()}). Verifica la fecha ingresada.`,
      );
    }
  }

  private async calcularAdvertenciaPlanillas(
    empresaId: number,
    vigencias: {
      fechaInicioActual: Date;
      fechaFinActual: Date | null;
      fechaInicioPropuesta: Date;
      fechaFinPropuesta: Date | null;
    },
  ): Promise<string | null> {
    const rango = calcularRangoAfectado(
      vigencias.fechaInicioActual,
      vigencias.fechaFinActual,
      vigencias.fechaInicioPropuesta,
      vigencias.fechaFinPropuesta,
    );

    const periodos = await this.periodosLiquidados(empresaId);
    return mensajeAdvertenciaPlanillas(
      periodosLiquidadosAfectados(periodos, rango),
    );
  }

  /**
   * Períodos de la empresa con planilla APROBADA o PAGADA, con su ventana REAL.
   *
   * La ventana sale del período de tareo persistido. Si la planilla no lo tiene
   * enlazado se resuelve por (empresa, año, mes), que es único. Una planilla
   * sin período no aporta ventana y se omite a propósito: reconstruirla desde
   * año/mes rompería la regla de oro en empresas con día de corte.
   */
  private async periodosLiquidados(
    empresaId: number,
  ): Promise<PeriodoLiquidado[]> {
    const planillas = await this.prisma.planilla.findMany({
      where: {
        empresa_id: empresaId,
        estado: { in: ESTADOS_PLANILLA_LIQUIDADA },
      },
      select: {
        anio: true,
        mes: true,
        periodo_tareo: { select: { fecha_inicio: true, fecha_fin: true } },
      },
    });

    if (planillas.length === 0) return [];

    const sinPeriodo = planillas.filter((p) => !p.periodo_tareo);
    const ventanasPorMes = new Map<
      string,
      { fecha_inicio: Date; fecha_fin: Date }
    >();

    if (sinPeriodo.length > 0) {
      const periodos = await this.prisma.periodoTareo.findMany({
        where: {
          empresa_id: empresaId,
          OR: sinPeriodo.map((p) => ({ anio: p.anio, mes: p.mes })),
        },
        select: {
          anio: true,
          mes: true,
          fecha_inicio: true,
          fecha_fin: true,
        },
      });
      for (const periodo of periodos) {
        ventanasPorMes.set(`${periodo.anio}-${periodo.mes}`, periodo);
      }
    }

    const liquidados: PeriodoLiquidado[] = [];
    for (const planilla of planillas) {
      const persistido =
        planilla.periodo_tareo ??
        ventanasPorMes.get(`${planilla.anio}-${planilla.mes}`);
      if (!persistido) continue;
      liquidados.push({
        anio: planilla.anio,
        mes: planilla.mes,
        ventana: ventanaDePeriodo(persistido),
      });
    }
    return liquidados;
  }

  private defaultInclude() {
    return {
      archivos: {
        orderBy: { id: 'asc' as const },
        select: {
          id: true,
          archivo_url: true,
          archivo_nombre: true,
          archivo_tipo: true,
          archivo_tamano: true,
        },
      },
      empleado: {
        select: {
          id: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          numero_documento: true,
          cargo: { select: { nombre: true } },
          area: { select: { nombre: true } },
        },
      },
      contrato: {
        select: {
          id: true,
          tipo_contrato: true,
          estado: true,
          fecha_inicio: true,
          fecha_fin: true,
          numero_renovacion: true,
        },
      },
      solicitado_por: {
        select: { id: true, nombre_completo: true, email: true },
      },
      resuelto_por: {
        select: { id: true, nombre_completo: true, email: true },
      },
    };
  }
}
