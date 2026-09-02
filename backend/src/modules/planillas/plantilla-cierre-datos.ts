/**
 * Datos que alimentan la PLANTILLA DE CIERRE del período: el Excel que el área
 * contable llena con lo que el sistema no puede saber solo (saldos reales de
 * préstamos, adelantos del mes, vacaciones, descansos médicos, bonos).
 *
 * Principio de diseño: la plantilla NO se entrega en blanco. Se entrega con el
 * estado que el sistema conoce hoy —préstamos vigentes con su saldo, días de
 * vacaciones disponibles, trabajadores activos— para que el contador CONFIRME o
 * CORRIJA en vez de escribir de cero. Así el archivo también sirve de auditoría:
 * un saldo en cero que debería tener importe salta a la vista.
 *
 * Este módulo solo LEE y ordena. No calcula planilla ni escribe nada.
 */
import { EstadoPrestamo, EstadoPeriodoVacacional } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calcularVentanaPeriodo,
  diasDelPeriodo,
  fechaCalendarioLocal,
} from '../tareo/ventana-periodo';

/** Trabajador del sistema: alimenta las listas desplegables de toda la plantilla. */
export interface TrabajadorPlantilla {
  empleado_id: number;
  documento: string;
  nombre: string;
  cargo: string;
  /** ACTIVO, CESADO, etc. Un cesado que sigue asistiendo hay que reactivarlo. */
  estado: string;
  fecha_ingreso: string;
  fecha_cese: string | null;
  sueldo_base: number;
  regimen_pensionario: string;
  asignacion_familiar: boolean;
  /** Días de vacaciones que el trabajador tiene disponibles para gozar. */
  dias_vacaciones_disponibles: number;
}

/** Préstamo o adelanto vigente, con el saldo que el sistema cree tener. */
export interface DeudaPlantilla {
  prestamo_id: number;
  empleado_id: number;
  documento: string;
  nombre: string;
  /** PRESTAMO, ADELANTO_SUELDO o ADELANTO_GRATIFICACION. */
  tipo: string;
  fecha_otorgado: string;
  /** Monto original pactado. NULL = nunca se registró: hay que pedirlo. */
  monto_total: number | null;
  cuota_mensual: number;
  /**
   * Saldo según el sistema, y lo que el contador tiene que confirmar.
   *
   * NULL no es cero: es un descuento recurrente SIN monto definido, cuya cuota
   * sale todos los meses hasta que alguien cancela el préstamo a mano. Mostrar
   * un cero ahí sería mentir sobre el caso más peligroso de todos.
   */
  saldo_sistema: number | null;
  /** Cargos ya aplicados contra planillas aprobadas. */
  cuotas_aplicadas: number;
  observaciones: string;
}

export interface PeriodoPlantilla {
  anio: number;
  mes: number;
  /** Nombre del mes en español, para el título del libro. */
  etiqueta: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  /** Día de corte de la empresa; null = período calendario. */
  dia_corte: number | null;
  /** True si el período de tareo ya existe en el sistema. */
  periodo_tareo_existe: boolean;
  estado_periodo_tareo: string | null;
}

export interface PlantillaCierre {
  empresa: { razon_social: string; ruc: string };
  periodo: PeriodoPlantilla;
  trabajadores: TrabajadorPlantilla[];
  prestamos: DeudaPlantilla[];
  adelantos: DeudaPlantilla[];
  /** Fecha de generación, para que el archivo diga cuándo se sacó la foto. */
  generado: string;
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

const aIso = (fecha: Date | null): string | null =>
  fecha ? fechaCalendarioLocal(fecha).toISOString().slice(0, 10) : null;

/**
 * Día de corte del período de tareo (null = mes calendario).
 *
 * Es una columna de `empresas`, la misma que lee `PeriodosService` al crear un
 * período. Si la empresa todavía no la tiene configurada pero ya cerró períodos
 * con ventana de corte, se deriva del último período real: una ventana que no
 * empieza el día 1 delata el corte, y es preferible eso a devolver un mes
 * calendario que no coincide con lo que la empresa viene usando.
 */
async function resolverDiaCorte(
  prisma: PrismaService,
  empresaId: number,
): Promise<number | null> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { dia_corte_tareo: true },
  });
  if (empresa?.dia_corte_tareo) return empresa.dia_corte_tareo;

  const ultimo = await prisma.periodoTareo.findFirst({
    where: { empresa_id: empresaId },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    select: { fecha_fin: true },
  });
  if (!ultimo) return null;
  const diaFin = fechaCalendarioLocal(ultimo.fecha_fin).getDate();
  // Un período que termina el último día del mes es calendario, no de corte.
  return diaFin >= 28 ? null : diaFin;
}

/**
 * Ventana real del período. REGLA DE ORO del proyecto: si el período de tareo
 * existe, su ventana manda; nunca se reconstruye desde anio/mes.
 */
async function resolverPeriodo(
  prisma: PrismaService,
  empresaId: number,
  anio: number,
  mes: number,
): Promise<PeriodoPlantilla> {
  const periodoTareo = await prisma.periodoTareo.findFirst({
    where: { empresa_id: empresaId, anio, mes },
    select: { fecha_inicio: true, fecha_fin: true, estado: true },
  });

  const diaCorte = await resolverDiaCorte(prisma, empresaId);

  const inicio = periodoTareo
    ? fechaCalendarioLocal(periodoTareo.fecha_inicio)
    : calcularVentanaPeriodo(anio, mes, diaCorte).fechaInicio;
  const fin = periodoTareo
    ? fechaCalendarioLocal(periodoTareo.fecha_fin)
    : calcularVentanaPeriodo(anio, mes, diaCorte).fechaFin;

  return {
    anio,
    mes,
    etiqueta: `${MESES[mes - 1]} ${anio}`,
    fecha_inicio: inicio.toISOString().slice(0, 10),
    fecha_fin: fin.toISOString().slice(0, 10),
    dias: diasDelPeriodo(inicio, fin),
    dia_corte: diaCorte,
    periodo_tareo_existe: periodoTareo !== null,
    estado_periodo_tareo: periodoTareo?.estado ?? null,
  };
}

/**
 * Trabajadores de la empresa con su saldo vacacional.
 *
 * Se incluyen también los CESADOS: un trabajador cesado en el sistema que sigue
 * asistiendo (reingreso no registrado) solo se detecta si aparece en la lista.
 * La columna de estado deja que el contador lo marque.
 */
async function cargarTrabajadores(
  prisma: PrismaService,
  empresaId: number,
  fechaFin: Date,
): Promise<TrabajadorPlantilla[]> {
  const empleados = await prisma.empleado.findMany({
    where: {
      empresa_id: empresaId,
      // Los cesados hace más de un año ya no participan de ningún cierre.
      OR: [
        { fecha_cese: null },
        {
          fecha_cese: {
            gte: new Date(fechaFin.getFullYear() - 1, fechaFin.getMonth(), 1),
          },
        },
      ],
    },
    select: {
      id: true,
      numero_documento: true,
      apellido_paterno: true,
      apellido_materno: true,
      nombres: true,
      estado: true,
      fecha_ingreso: true,
      fecha_cese: true,
      sueldo_base: true,
      asignacion_familiar: true,
      cargo: { select: { nombre: true } },
      regimen_pensionario: { select: { tipo: true, nombre: true } },
    },
    orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }],
  });

  const saldos = await prisma.periodoVacacional.groupBy({
    by: ['empleado_id'],
    where: {
      empresa_id: empresaId,
      empleado_id: { in: empleados.map((e) => e.id) },
      estado: {
        in: [
          EstadoPeriodoVacacional.DISPONIBLE,
          EstadoPeriodoVacacional.PARCIAL,
        ],
      },
    },
    _sum: { dias_pendientes: true },
  });
  const porEmpleado = new Map(
    saldos.map((s) => [s.empleado_id, aNumero(s._sum.dias_pendientes)]),
  );

  return empleados.map((e) => ({
    empleado_id: e.id,
    documento: e.numero_documento,
    nombre: `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
    cargo: e.cargo?.nombre ?? '',
    estado: e.estado,
    fecha_ingreso: aIso(e.fecha_ingreso) ?? '',
    fecha_cese: aIso(e.fecha_cese),
    sueldo_base: aNumero(e.sueldo_base),
    regimen_pensionario:
      e.regimen_pensionario?.tipo === 'AFP'
        ? `AFP · ${e.regimen_pensionario.nombre ?? ''}`.trim()
        : (e.regimen_pensionario?.tipo ?? 'Sin régimen'),
    asignacion_familiar: e.asignacion_familiar ?? false,
    dias_vacaciones_disponibles: porEmpleado.get(e.id) ?? 0,
  }));
}

/** Préstamos y adelantos ACTIVOS, con el saldo que el sistema cree tener. */
async function cargarDeudas(
  prisma: PrismaService,
  empresaId: number,
): Promise<{ prestamos: DeudaPlantilla[]; adelantos: DeudaPlantilla[] }> {
  const filas = await prisma.prestamo.findMany({
    where: { empresa_id: empresaId, estado: EstadoPrestamo.ACTIVO },
    select: {
      id: true,
      empleado_id: true,
      tipo: true,
      fecha_otorgado: true,
      monto_total: true,
      cuota_mensual: true,
      saldo: true,
      observaciones: true,
      empleado: {
        select: {
          numero_documento: true,
          apellido_paterno: true,
          apellido_materno: true,
          nombres: true,
        },
      },
      _count: {
        select: { movimientos: { where: { tipo: 'CARGO_PLANILLA' } } },
      },
    },
    orderBy: [{ empleado_id: 'asc' }, { fecha_otorgado: 'asc' }],
  });

  const mapear = (f: (typeof filas)[number]): DeudaPlantilla => ({
    prestamo_id: f.id,
    empleado_id: f.empleado_id,
    documento: f.empleado.numero_documento,
    nombre: `${f.empleado.apellido_paterno} ${f.empleado.apellido_materno}, ${f.empleado.nombres}`,
    tipo: f.tipo,
    fecha_otorgado: aIso(f.fecha_otorgado) ?? '',
    monto_total: f.monto_total === null ? null : aNumero(f.monto_total),
    cuota_mensual: aNumero(f.cuota_mensual),
    saldo_sistema: f.saldo === null ? null : aNumero(f.saldo),
    cuotas_aplicadas: f._count.movimientos,
    observaciones: f.observaciones ?? '',
  });

  return {
    prestamos: filas.filter((f) => f.tipo === 'PRESTAMO').map(mapear),
    adelantos: filas.filter((f) => f.tipo !== 'PRESTAMO').map(mapear),
  };
}

/**
 * Arma la foto del período para la plantilla de cierre.
 *
 * @param anio Año del período a cerrar.
 * @param mes Mes del período a cerrar (1-12).
 */
export async function construirPlantillaCierre(
  prisma: PrismaService,
  empresaId: number,
  anio: number,
  mes: number,
): Promise<PlantillaCierre> {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { razon_social: true, ruc: true },
  });

  const periodo = await resolverPeriodo(prisma, empresaId, anio, mes);
  const [trabajadores, deudas] = await Promise.all([
    cargarTrabajadores(prisma, empresaId, new Date(periodo.fecha_fin)),
    cargarDeudas(prisma, empresaId),
  ]);

  return {
    empresa,
    periodo,
    trabajadores,
    prestamos: deudas.prestamos,
    adelantos: deudas.adelantos,
    generado: new Date().toISOString(),
  };
}
