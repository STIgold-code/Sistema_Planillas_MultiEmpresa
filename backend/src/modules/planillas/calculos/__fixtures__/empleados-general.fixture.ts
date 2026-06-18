/**
 * Fixtures for the GENERAL-régimen golden/parity net (SDD T01).
 *
 * These build representative `EmpleadoParaCalculo` payloads that the legacy
 * procedural engine (`calcular-empleado.ts`) consumes today. They freeze the
 * CURRENT input space so the golden snapshots become the regression contract
 * the new régimen-parameterized engine must match (T14).
 *
 * Scope note: only the fields the engine actually reads are populated. The
 * `EmpleadoParaCalculo` type is a Prisma payload with many relations; building
 * a full Prisma object by hand is neither necessary nor desirable for a pure
 * calculation snapshot. We therefore construct minimal plain objects and cast
 * ONCE, at the factory boundary, to `EmpleadoParaCalculo`. The cast is the
 * documented seam between plain fixture data and the Prisma-typed engine
 * inputs; it is intentional and isolated here so domain/test code stays framework-free.
 */
/**
 * Tipo del payload de empleado que estos fixtures construyen. Antes provenía del
 * motor legacy `calcular-empleado.ts` (ya retirado). Se define localmente como un
 * shape laxo: el cast en el factory es el único borde documentado entre el dato
 * de fixture plano y los consumidores tipados (motor puro / mapper de detalle).
 */
export type EmpleadoParaCalculo = Record<string, unknown>;

import { calcularDetalleCompleto } from '../../dominio/detalle/calcular-detalle-completo';
import { DetalleCompleto } from '../../dominio/detalle/tipos-detalle';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from '../../aplicacion/mapear-entrada-detalle';
import { ParametrosLegalesEnMemoria } from '../../infraestructura/parametros-legales-en-memoria';

const PARAMETROS_ORACULO = new ParametrosLegalesEnMemoria();

/** Pension régimen shape consumed by `calcularDeducciones`. */
interface RegimenPensionarioFixture {
  tipo: 'AFP' | 'ONP';
  aporte_obligatorio: number;
  prima_seguro: number;
  comision_flujo: number;
}

/** Minimal `tipo_marcacion` shape read by the engine's tareo loop. */
interface TipoMarcacionFixture {
  codigo: string;
  es_laborable: boolean;
  es_feriado_trabajado: boolean;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_default: number;
}

interface DetalleTareoFixture {
  horas: number | null;
  tipo_marcacion: TipoMarcacionFixture;
}

/** AFP Habitat-like rates, mirroring `deducciones.spec.ts`. */
export const REGIMEN_AFP: RegimenPensionarioFixture = {
  tipo: 'AFP',
  aporte_obligatorio: 10,
  prima_seguro: 1.74,
  comision_flujo: 1.47,
};

/** ONP 13%. */
export const REGIMEN_ONP: RegimenPensionarioFixture = {
  tipo: 'ONP',
  aporte_obligatorio: 13,
  prima_seguro: 0,
  comision_flujo: 0,
};

/** Standard 8h diurnal working day. */
function diaDiurno8h(): DetalleTareoFixture {
  return {
    horas: 8,
    tipo_marcacion: {
      codigo: 'A',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: 8,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/** Diurnal day with overtime (>8h) → exercises horas extras 25%/35%. */
function diaConHorasExtras(horas: number): DetalleTareoFixture {
  return {
    horas,
    tipo_marcacion: {
      codigo: 'E',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: horas,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/** Night shift day (8h nocturnal) → exercises jornada nocturna sobretasa. */
function diaNocturno8h(): DetalleTareoFixture {
  return {
    horas: 8,
    tipo_marcacion: {
      codigo: 'A',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: 0,
      horas_nocturnas: 8,
      horas_default: 8,
    },
  };
}

interface OpcionesEmpleadoGeneral {
  sueldoBase: number;
  regimenPensionario: RegimenPensionarioFixture | null;
  detalles: DetalleTareoFixture[];
  fechaIngreso?: Date | null;
  fechaCese?: Date | null;
  asignacionFamiliar?: boolean;
  sctr?: boolean;
  fechaInicioContrato?: Date;
  fechaFinContrato?: Date | null;
}

/**
 * Builds an `EmpleadoParaCalculo` for the GENERAL régimen with only the fields
 * the engine reads. Cast is isolated here (see file header).
 */
function construirEmpleadoGeneral(
  opciones: OpcionesEmpleadoGeneral,
): EmpleadoParaCalculo {
  const empleado = {
    sueldo_base: opciones.sueldoBase,
    fecha_ingreso: opciones.fechaIngreso ?? null,
    fecha_cese: opciones.fechaCese ?? null,
    asignacion_familiar: opciones.asignacionFamiliar ?? false,
    sctr: opciones.sctr ?? false,
    regimen_pensionario: opciones.regimenPensionario,
    contratos: [
      {
        fecha_inicio:
          opciones.fechaInicioContrato ?? new Date(Date.UTC(2020, 0, 1)),
        fecha_fin: opciones.fechaFinContrato ?? null,
      },
    ],
    tareos: [{ detalles: opciones.detalles }],
  };

  // Single documented boundary cast: plain fixture → Prisma-typed engine input.
  return empleado as unknown as EmpleadoParaCalculo;
}

/** 30 standard diurnal days. */
function mes30DiasDiurnos(): DetalleTareoFixture[] {
  return Array.from({ length: 30 }, () => diaDiurno8h());
}

export interface EscenarioGeneral {
  nombre: string;
  empleado: EmpleadoParaCalculo;
  mes: number;
  anio: number;
  acumuladoRemuneracion: number;
  acumuladoRetenciones: number;
}

/**
 * Representative GENERAL scenarios covering distinct concepts: sueldo base,
 * horas extras, jornada nocturna, gratificación (julio), CTS (mayo/noviembre),
 * pension deductions (ONP/AFP) and renta 5ta (high salary).
 */
export const ESCENARIOS_GENERAL: EscenarioGeneral[] = [
  {
    nombre: 'ONP - mes regular, sueldo base, sin extras',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 2000,
      regimenPensionario: REGIMEN_ONP,
      detalles: mes30DiasDiurnos(),
    }),
    mes: 3,
    anio: 2026,
    acumuladoRemuneracion: 0,
    acumuladoRetenciones: 0,
  },
  {
    nombre: 'AFP - mes regular, sueldo base, sin extras',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 3000,
      regimenPensionario: REGIMEN_AFP,
      detalles: mes30DiasDiurnos(),
    }),
    mes: 3,
    anio: 2026,
    acumuladoRemuneracion: 0,
    acumuladoRetenciones: 0,
  },
  {
    nombre: 'AFP - con horas extras (10h y 11h en dos días)',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 3000,
      regimenPensionario: REGIMEN_AFP,
      detalles: [
        ...Array.from({ length: 28 }, () => diaDiurno8h()),
        diaConHorasExtras(10),
        diaConHorasExtras(11),
      ],
    }),
    mes: 3,
    anio: 2026,
    acumuladoRemuneracion: 0,
    acumuladoRetenciones: 0,
  },
  {
    nombre: 'ONP - jornada nocturna (sobretasa 35%)',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 2500,
      regimenPensionario: REGIMEN_ONP,
      detalles: Array.from({ length: 30 }, () => diaNocturno8h()),
    }),
    mes: 3,
    anio: 2026,
    acumuladoRemuneracion: 0,
    acumuladoRetenciones: 0,
  },
  {
    nombre: 'AFP - gratificación julio + bonificación 30334',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 3000,
      regimenPensionario: REGIMEN_AFP,
      detalles: mes30DiasDiurnos(),
    }),
    mes: 7,
    anio: 2026,
    acumuladoRemuneracion: 18000,
    acumuladoRetenciones: 0,
  },
  {
    nombre: 'ONP - CTS noviembre (depósito semestral)',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 3000,
      regimenPensionario: REGIMEN_ONP,
      detalles: mes30DiasDiurnos(),
    }),
    mes: 11,
    anio: 2026,
    acumuladoRemuneracion: 30000,
    acumuladoRetenciones: 0,
  },
  {
    nombre: 'AFP - renta 5ta (sueldo alto sobre 7 UIT)',
    empleado: construirEmpleadoGeneral({
      sueldoBase: 12000,
      regimenPensionario: REGIMEN_AFP,
      detalles: mes30DiasDiurnos(),
    }),
    mes: 1,
    anio: 2026,
    acumuladoRemuneracion: 0,
    acumuladoRetenciones: 0,
  },
];

/**
 * Oráculo de paridad del DTO completo: ejecuta el motor PURO del dominio
 * (`calcularDetalleCompleto` vía el mapper de aplicación) que reemplazó al legacy.
 * Es la fuente de verdad de los ~110 campos auxiliares del DTO para los golden
 * snapshots y las compuertas de paridad de montos del régimen.
 */
export function calcularDetalleOraculo(
  escenario: EscenarioGeneral,
): DetalleCompleto {
  const entrada = mapearEntradaDetalle({
    empleado: escenario.empleado as unknown as EmpleadoParaDetalle,
    mes: escenario.mes,
    anio: escenario.anio,
    acumuladoRenta: escenario.acumuladoRemuneracion,
    retencionesPreviasRenta: escenario.acumuladoRetenciones,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
  });
  return calcularDetalleCompleto(entrada, PARAMETROS_ORACULO);
}
