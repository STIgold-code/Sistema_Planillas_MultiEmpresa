/**
 * Datos para el Excel POR TRABAJADOR: una hoja por persona donde cada sol del
 * neto se puede seguir hasta el día del tareo, la tasa legal, el préstamo o la
 * planilla anterior que lo originó.
 *
 * Extiende la exportación de planilla (`exportarPlanilla`) con lo que el DTO
 * plano no lleva porque el Excel matricial no lo necesita:
 *
 *  - El TAREO del período, día por día, con la fecha real y dos banderas
 *    derivadas con la MISMA regla del motor: si el día devenga y si es una
 *    ausencia sin goce. Así la hoja clasifica igual que `clasificarDiasTareo`
 *    y no con una copia que pueda desalinearse.
 *  - Los ACUMULADOS de renta de 5.ª (remuneración afecta y retenciones de los
 *    meses previos del ejercicio), con la misma consulta que usó el cálculo.
 *  - Los CARGOS de préstamos y adelantos que esta planilla aplicó.
 *  - El HISTORIAL de planillas previas que alimenta los promedios de la
 *    gratificación y la CTS, para que esos importes tengan un origen visible.
 *
 * Regla de diseño: este módulo solo LEE y ordena. No recalcula nada: el cálculo
 * vive en el dominio y la verificación (fórmula vs. sistema) vive en el Excel.
 */
import { EstadoPlanilla, EstadoPrestamo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanillaParametrosService } from './planilla-parametros.service';
import { exportarPlanilla } from './planilla-exportacion';
import {
  diaDevenga,
  resolverHorasDia,
} from './dominio/detalle/clasificar-dias-tareo';
import { CODIGOS_AUSENCIA_SIN_GOCE } from './dominio/detalle/descuento-dominical';
import {
  diasDelPeriodo,
  fechaCalendarioLocal,
  fechaDeDiaIso,
} from '../tareo/ventana-periodo';
import {
  cuotaEfectiva,
  descuentaEnMes,
} from '../prestamos/dominio/descuentos-prestamos';
import {
  ORDEN_AMORTIZACION,
  aPrestamoVigente,
} from '../prestamos/prestamos.mapper';

/** Estados de planilla cuyos importes cuentan como historia (= motor). */
const ESTADOS_COMPUTADOS: EstadoPlanilla[] = [
  'CALCULADA',
  'REVISADA',
  'APROBADA',
  'PAGADA',
];

/** Meses previos que alimentan los promedios de gratificación y CTS. */
const MESES_HISTORIAL = 6;

export interface DiaTareoExportacion {
  /** Ordinal del día dentro de la ventana del período (1..N). */
  dia: number;
  /** Fecha real de calendario, ISO `yyyy-mm-dd`. */
  fecha: string;
  codigo: string;
  descripcion: string;
  /** Horas de la jornada resueltas como lo hace el motor (detalle > nomenclatura > 8). */
  horas: number;
  /** Tiempo NO laborado del día en minutos (tardanzas, permisos parciales). */
  minutos_no_laborados: number;
  /** El día suma a `dias_trabajados` y devenga sueldo. */
  devenga: boolean;
  /** Ausencia sin goce: recorta el dominical de su semana (D.L. 713 art. 4). */
  sin_goce: boolean;
  /** Jornada nocturna según la nomenclatura. */
  nocturno: boolean;
  /** Feriado laborado: paga valor día × 2 además del día devengado. */
  feriado_trabajado: boolean;
}

export interface CargoPrestamoExportacion {
  /** PRESTAMO, ADELANTO_SUELDO o ADELANTO_GRATIFICACION. */
  tipo: string;
  fecha_otorgado: string;
  monto_total: number;
  cuota_mensual: number;
  /** Importe que esta planilla descontó. */
  cargo: number;
  /** Número de cuota que representa este cargo y total de cuotas previstas. */
  cuota_numero: number;
  cuotas_previstas: number | null;
  /** Saldo del préstamo hoy (después de todos los cargos registrados). */
  saldo_actual: number;
  /**
   * MOVIMIENTO: cargo ya registrado contra esta planilla (aprobada o pagada).
   * VIGENTE: cuota que el cálculo tomó de un préstamo activo; la planilla aún
   * no registró el cargo.
   */
  origen: 'MOVIMIENTO' | 'VIGENTE';
}

export interface MesHistorialExportacion {
  anio: number;
  mes: number;
  estado: string;
  dias_trabajados: number;
  remuneracion_afecta: number;
  renta_5ta: number;
  horas_extras: number;
  bonificaciones: number;
  gratificacion: number;
}

export interface TrazabilidadTrabajador {
  empleado_id: number;
  documento: string;
  /** Condición fiscal (Art. 54/76 LIR): false = no domiciliado, 30% plano. */
  domiciliado: boolean;
  dias_permiso: number;
  minutos_tardanza: number;
  tareo: DiaTareoExportacion[];
  renta: {
    acumulado_previo: number;
    retenciones_previas: number;
  };
  prestamos: CargoPrestamoExportacion[];
  historial: MesHistorialExportacion[];
}

export interface PeriodoExportacion {
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
}

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

const aIso = (fecha: Date): string => fecha.toISOString().slice(0, 10);

/** Los `MESES_HISTORIAL` meses anteriores a `mes/anio`, del más reciente al más antiguo. */
function mesesPrevios(
  mes: number,
  anio: number,
): { mes: number; anio: number }[] {
  const lista: { mes: number; anio: number }[] = [];
  let m = mes;
  let a = anio;
  for (let i = 0; i < MESES_HISTORIAL; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      a -= 1;
    }
    lista.push({ mes: m, anio: a });
  }
  return lista;
}

async function cargarTareos(
  prisma: PrismaService,
  periodoId: number,
  empleadoIds: number[],
  fechaInicio: Date,
): Promise<Map<number, DiaTareoExportacion[]>> {
  const tareos = await prisma.tareo.findMany({
    where: { periodo_id: periodoId, empleado_id: { in: empleadoIds } },
    select: {
      empleado_id: true,
      detalles: {
        orderBy: { dia: 'asc' },
        select: {
          dia: true,
          horas: true,
          minutos_no_laborados: true,
          tipo_marcacion: {
            select: {
              codigo: true,
              descripcion: true,
              es_laborable: true,
              es_feriado_trabajado: true,
              horas_diurnas: true,
              horas_nocturnas: true,
              horas_default: true,
            },
          },
        },
      },
    },
  });

  const mapa = new Map<number, DiaTareoExportacion[]>();
  for (const tareo of tareos) {
    const dias: DiaTareoExportacion[] = [];
    for (const detalle of tareo.detalles) {
      const tm = detalle.tipo_marcacion;
      if (!tm) continue;
      const horasDiurnas = aNumero(tm.horas_diurnas);
      const horasNocturnas = aNumero(tm.horas_nocturnas);
      const minutosNoLaborados = aNumero(detalle.minutos_no_laborados);
      dias.push({
        dia: detalle.dia,
        fecha: fechaDeDiaIso(fechaInicio, detalle.dia),
        codigo: tm.codigo,
        descripcion: tm.descripcion,
        horas: resolverHorasDia({
          fecha: new Date(0),
          codigo: tm.codigo,
          esLaborable: tm.es_laborable,
          esFeriadoTrabajado: tm.es_feriado_trabajado,
          horasDiurnas,
          horasNocturnas,
          horasDetalle: aNumero(detalle.horas),
          horasDefault: tm.horas_default,
          minutosNoLaborados,
        }),
        minutos_no_laborados: minutosNoLaborados,
        devenga: diaDevenga(tm.codigo, tm.es_laborable),
        sin_goce: CODIGOS_AUSENCIA_SIN_GOCE.has(tm.codigo),
        nocturno: horasNocturnas > 0,
        feriado_trabajado: tm.es_feriado_trabajado,
      });
    }
    mapa.set(tareo.empleado_id, dias);
  }
  return mapa;
}

/**
 * Misma consulta que `PlanillaCargaService.cargarAcumuladosIR`: planillas del
 * mismo ejercicio, meses anteriores, en estado computado. Si el motor cambia su
 * criterio, este acumulado debe cambiar con él — por eso el filtro se declara
 * una sola vez en `ESTADOS_COMPUTADOS`.
 */
async function cargarAcumuladosRenta(
  prisma: PrismaService,
  empresaId: number,
  empleadoIds: number[],
  anio: number,
  mes: number,
): Promise<
  Map<number, { acumulado_previo: number; retenciones_previas: number }>
> {
  const filas = await prisma.planillaDetalle.groupBy({
    by: ['empleado_id'],
    where: {
      empleado_id: { in: empleadoIds },
      planilla: {
        empresa_id: empresaId,
        anio,
        mes: { lt: mes },
        estado: { in: ESTADOS_COMPUTADOS },
      },
    },
    _sum: { remuneracion_afecta: true, renta_5ta: true },
  });
  const mapa = new Map<
    number,
    { acumulado_previo: number; retenciones_previas: number }
  >();
  for (const fila of filas) {
    mapa.set(fila.empleado_id, {
      acumulado_previo: aNumero(fila._sum.remuneracion_afecta),
      retenciones_previas: aNumero(fila._sum.renta_5ta),
    });
  }
  return mapa;
}

async function cargarCargosPrestamos(
  prisma: PrismaService,
  planillaId: number,
  empleadoIds: number[],
): Promise<Map<number, CargoPrestamoExportacion[]>> {
  const cargos = await prisma.prestamoMovimiento.findMany({
    where: {
      planilla_id: planillaId,
      tipo: 'CARGO_PLANILLA',
      prestamo: { empleado_id: { in: empleadoIds } },
    },
    select: {
      monto: true,
      fecha: true,
      prestamo: {
        select: {
          id: true,
          empleado_id: true,
          tipo: true,
          fecha_otorgado: true,
          monto_total: true,
          cuota_mensual: true,
          saldo: true,
          movimientos: {
            where: { tipo: 'CARGO_PLANILLA' },
            select: { fecha: true },
            orderBy: { fecha: 'asc' },
          },
        },
      },
    },
    orderBy: { fecha: 'asc' },
  });

  const mapa = new Map<number, CargoPrestamoExportacion[]>();
  for (const cargo of cargos) {
    const p = cargo.prestamo;
    const montoTotal = aNumero(p.monto_total);
    const cuota = aNumero(p.cuota_mensual);
    // El número de cuota es la posición de este cargo entre todos los cargos
    // del préstamo, en orden cronológico.
    const cuotaNumero =
      p.movimientos.findIndex(
        (m) => m.fecha.getTime() === cargo.fecha.getTime(),
      ) + 1;
    const lista = mapa.get(p.empleado_id) ?? [];
    lista.push({
      tipo: p.tipo,
      fecha_otorgado: aIso(p.fecha_otorgado),
      monto_total: montoTotal,
      cuota_mensual: cuota,
      cargo: aNumero(cargo.monto),
      cuota_numero: cuotaNumero > 0 ? cuotaNumero : p.movimientos.length,
      cuotas_previstas:
        montoTotal > 0 && cuota > 0 ? Math.ceil(montoTotal / cuota) : null,
      saldo_actual: aNumero(p.saldo),
      origen: 'MOVIMIENTO',
    });
    mapa.set(p.empleado_id, lista);
  }
  return mapa;
}

/**
 * Misma fuente que usa el CÁLCULO (`PrestamosPlanillaService.descuentosPorEmpleado`):
 * préstamos ACTIVOS de la empresa otorgados hasta el fin de la ventana, con la
 * cuota efectiva del dominio. Es lo que explica el descuento mientras la
 * planilla no está aprobada y todavía no registró sus cargos.
 *
 * Limitación honesta: se lee el estado de HOY. Si un préstamo se canceló o se
 * pagó después del cálculo, la cuota ya no aparece y la hoja marca la
 * divergencia en vez de inventarla.
 */
async function cargarPrestamosVigentes(
  prisma: PrismaService,
  empresaId: number,
  empleadoIds: number[],
  mes: number,
  fechaFinPeriodo: Date,
): Promise<Map<number, CargoPrestamoExportacion[]>> {
  const prestamos = await prisma.prestamo.findMany({
    where: {
      empresa_id: empresaId,
      empleado_id: { in: empleadoIds },
      estado: EstadoPrestamo.ACTIVO,
      fecha_otorgado: { lte: fechaFinPeriodo },
    },
    select: {
      id: true,
      empleado_id: true,
      tipo: true,
      fecha_otorgado: true,
      monto_total: true,
      cuota_mensual: true,
      saldo: true,
      _count: {
        select: { movimientos: { where: { tipo: 'CARGO_PLANILLA' } } },
      },
    },
    orderBy: [...ORDEN_AMORTIZACION],
  });

  const mapa = new Map<number, CargoPrestamoExportacion[]>();
  for (const p of prestamos) {
    const vigente = aPrestamoVigente(p);
    if (!descuentaEnMes(vigente.tipo, mes)) continue;
    const cargo = cuotaEfectiva(vigente);
    if (cargo <= 0) continue;
    const montoTotal = aNumero(p.monto_total);
    const cuota = aNumero(p.cuota_mensual);
    const lista = mapa.get(p.empleado_id) ?? [];
    lista.push({
      tipo: p.tipo,
      fecha_otorgado: aIso(p.fecha_otorgado),
      monto_total: montoTotal,
      cuota_mensual: cuota,
      cargo,
      cuota_numero: p._count.movimientos + 1,
      cuotas_previstas:
        montoTotal > 0 && cuota > 0 ? Math.ceil(montoTotal / cuota) : null,
      saldo_actual: aNumero(p.saldo),
      origen: 'VIGENTE',
    });
    mapa.set(p.empleado_id, lista);
  }
  return mapa;
}

/**
 * Planillas previas del trabajador: los meses anteriores del ejercicio (base
 * del acumulado de renta) y los seis meses previos (base de los promedios de
 * gratificación y CTS). Es un solo conjunto: un mes puede servir a ambos.
 */
async function cargarHistorial(
  prisma: PrismaService,
  empresaId: number,
  empleadoIds: number[],
  anio: number,
  mes: number,
): Promise<Map<number, MesHistorialExportacion[]>> {
  const previos = mesesPrevios(mes, anio);
  const filas = await prisma.planillaDetalle.findMany({
    where: {
      empleado_id: { in: empleadoIds },
      planilla: {
        empresa_id: empresaId,
        estado: { in: ESTADOS_COMPUTADOS },
        OR: [
          { anio, mes: { lt: mes } },
          ...previos.map((p) => ({ anio: p.anio, mes: p.mes })),
        ],
      },
    },
    select: {
      empleado_id: true,
      dias_trabajados: true,
      remuneracion_afecta: true,
      renta_5ta: true,
      horas_extras: true,
      bonificaciones: true,
      gratificacion_monto: true,
      planilla: { select: { anio: true, mes: true, estado: true } },
    },
    orderBy: [{ planilla: { anio: 'asc' } }, { planilla: { mes: 'asc' } }],
  });

  const mapa = new Map<number, MesHistorialExportacion[]>();
  for (const fila of filas) {
    const lista = mapa.get(fila.empleado_id) ?? [];
    lista.push({
      anio: fila.planilla.anio,
      mes: fila.planilla.mes,
      estado: fila.planilla.estado,
      dias_trabajados: aNumero(fila.dias_trabajados),
      remuneracion_afecta: aNumero(fila.remuneracion_afecta),
      renta_5ta: aNumero(fila.renta_5ta),
      horas_extras: aNumero(fila.horas_extras),
      bonificaciones: aNumero(fila.bonificaciones),
      gratificacion: aNumero(fila.gratificacion_monto),
    });
    mapa.set(fila.empleado_id, lista);
  }
  return mapa;
}

export async function exportarPlanillaTrabajadores(
  prisma: PrismaService,
  parametrosService: PlanillaParametrosService,
  id: number,
  empresaId: number,
) {
  const base = await exportarPlanilla(prisma, parametrosService, id, empresaId);

  const planilla = await prisma.planilla.findFirstOrThrow({
    where: { id, empresa_id: empresaId },
    select: {
      anio: true,
      mes: true,
      periodo_tareo: {
        select: { id: true, fecha_inicio: true, fecha_fin: true },
      },
      detalles: {
        select: {
          empleado_id: true,
          dias_permiso: true,
          minutos_tardanza: true,
          empleado: { select: { numero_documento: true, domiciliado: true } },
        },
      },
    },
  });

  const empleadoIds = planilla.detalles.map((d) => d.empleado_id);
  const periodoTareo = planilla.periodo_tareo;

  const fechaFinVentana = periodoTareo
    ? periodoTareo.fecha_fin
    : new Date(Date.UTC(planilla.anio, planilla.mes, 0));

  const [tareos, acumulados, cargosRegistrados, prestamosVigentes, historial] =
    await Promise.all([
      periodoTareo
        ? cargarTareos(
            prisma,
            periodoTareo.id,
            empleadoIds,
            // `@db.Date` llega como medianoche UTC: en Perú (UTC-5) los getters
            // locales darían el día anterior. Se normaliza antes de derivar fechas.
            fechaCalendarioLocal(periodoTareo.fecha_inicio),
          )
        : Promise.resolve(new Map<number, DiaTareoExportacion[]>()),
      cargarAcumuladosRenta(
        prisma,
        empresaId,
        empleadoIds,
        planilla.anio,
        planilla.mes,
      ),
      cargarCargosPrestamos(prisma, id, empleadoIds),
      cargarPrestamosVigentes(
        prisma,
        empresaId,
        empleadoIds,
        planilla.mes,
        fechaFinVentana,
      ),
      cargarHistorial(
        prisma,
        empresaId,
        empleadoIds,
        planilla.anio,
        planilla.mes,
      ),
    ]);

  // Los cargos registrados son la verdad cuando existen (planilla aprobada o
  // pagada). Si la planilla aún no los registró, se explica el descuento con
  // los préstamos vigentes, que es de donde el cálculo lo tomó.
  const prestamos = new Map<number, CargoPrestamoExportacion[]>();
  for (const empleadoId of empleadoIds) {
    const registrados = cargosRegistrados.get(empleadoId) ?? [];
    prestamos.set(
      empleadoId,
      registrados.length > 0
        ? registrados
        : (prestamosVigentes.get(empleadoId) ?? []),
    );
  }

  const periodo: PeriodoExportacion | null = periodoTareo
    ? {
        fecha_inicio: aIso(periodoTareo.fecha_inicio),
        fecha_fin: aIso(periodoTareo.fecha_fin),
        dias: diasDelPeriodo(
          fechaCalendarioLocal(periodoTareo.fecha_inicio),
          fechaCalendarioLocal(periodoTareo.fecha_fin),
        ),
      }
    : null;

  const trazabilidad: TrazabilidadTrabajador[] = planilla.detalles.map((d) => ({
    empleado_id: d.empleado_id,
    documento: d.empleado.numero_documento,
    domiciliado: d.empleado.domiciliado,
    dias_permiso: aNumero(d.dias_permiso),
    minutos_tardanza: aNumero(d.minutos_tardanza),
    tareo: tareos.get(d.empleado_id) ?? [],
    renta: acumulados.get(d.empleado_id) ?? {
      acumulado_previo: 0,
      retenciones_previas: 0,
    },
    prestamos: prestamos.get(d.empleado_id) ?? [],
    historial: historial.get(d.empleado_id) ?? [],
  }));

  return { ...base, periodo, trazabilidad };
}
