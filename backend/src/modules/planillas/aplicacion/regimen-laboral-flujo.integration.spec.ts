/**
 * End-to-end integration of the LABOR-RÉGIMEN flow through the REAL wiring.
 *
 * This is NOT a unit test of isolated pieces. It exercises the exact assembled
 * path the payroll service runs per employee (`calcularDetalleEmpleado`):
 *
 *   mapper (`mapearEntradaCalculo`) → régimen resolution
 *   (`resolverRegimenLaboral`: contrato.regimen_laboral ?? empresa.default)
 *   → factory (`crearCalculadoraRegimen`) → certification guard
 *   (`asegurarRegimenCertificado`) → régimen motor (`calcularBoleta`).
 *
 * Only data shapes are realistic; nothing in the path is mocked. There is no
 * Prisma here because `calcularDetalleEmpleado` is the framework-free seam the
 * Nest service feeds rows into — testing it directly is the faithful, DB-free
 * way to prove the assembled system honors the régimen.
 *
 * Why these assertions are a REAL test of the cable (not circular):
 *  - All amounts come from the SAME single path. The only variable changed
 *    between cases is `contrato.regimen_laboral` (or the empresa default). If the
 *    régimen did NOT flow API→servicio→motor, PEQUENA_EMPRESA would calc exactly
 *    like GENERAL and the "half gratificación" assertion would FAIL.
 *  - If the guard did NOT block, AGRARIO would return a DTO instead of throwing,
 *    and the "no DTO emitted" assertion would FAIL.
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { RegimenNoCertificadoError } from './guardia-certificacion';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';
import { EmpresaConRegimenDefault } from './resolver-regimen-laboral';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { RegimenLaboral as RegimenLaboralPrisma } from '@prisma/client';

const parametros = new ParametrosLegalesEnMemoria();

/** Empleado shape consumed by the assembled path (mapper inputs only). */
type EmpleadoFlujo = EmpleadoParaMapeo & EmpleadoParaDetalle;

const REGIMEN_ONP = {
  tipo: 'ONP' as const,
  aporte_obligatorio: 13,
  prima_seguro: 0,
  comision_flujo: 0,
};

/** Standard 8h diurnal working day. */
function diaDiurno8h() {
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

/** 30 standard diurnal days. */
function mes30DiasDiurnos() {
  return Array.from({ length: 30 }, () => diaDiurno8h());
}

/**
 * Builds a realistic employee whose CONTRATO carries `regimen_laboral`.
 *
 * Crucially, this sets `regimen_laboral` ON THE CONTRATO — the field under test.
 * `null` makes the path fall back to the empresa default (case 2).
 */
function construirEmpleado(
  regimenContrato: RegimenLaboralPrisma | null,
): EmpleadoFlujo {
  const empleado = {
    sueldo_base: 3000,
    fecha_ingreso: null,
    fecha_cese: null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: REGIMEN_ONP,
    contratos: [
      {
        regimen_laboral: regimenContrato,
        fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
        fecha_fin: null,
      },
    ],
    tareos: [{ detalles: mes30DiasDiurnos() }],
  };
  return empleado as unknown as EmpleadoFlujo;
}

/**
 * Runs the assembled per-employee path for July (gratificación month) so the
 * régimen-distinctive concepts (grati/CTS/EsSalud) actually diverge.
 */
function calcularFlujo(
  empleado: EmpleadoFlujo,
  empresa: EmpresaConRegimenDefault,
): Record<string, number> {
  return calcularDetalleEmpleado({
    empleado,
    empresa,
    mes: 7,
    anio: 2026,
    acumuladoRenta: 18000,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    parametros,
  }) as Record<string, number>;
}

const EMPRESA_GENERAL: EmpresaConRegimenDefault = {
  regimen_laboral_default: 'GENERAL',
};

describe('Flujo de régimen laboral — cableado real API→servicio→motor', () => {
  // Baseline: GENERAL résult via the SAME path. Used as the comparison oracle so
  // the other régimenes are asserted RELATIVE to it (proving divergence, not
  // hardcoded magic numbers).
  const general = calcularFlujo(construirEmpleado('GENERAL'), EMPRESA_GENERAL);

  it('GENERAL sigue igual: paga gratificación completa, EsSalud 9% y CTS (mes julio)', () => {
    // Sanity floor: if these were 0 the comparisons below would be meaningless.
    expect(general.gratificacion_monto).toBeGreaterThan(0);
    expect(general.essalud_empleador).toBeGreaterThan(0);
    expect(general.bonif_extraordinaria).toBeGreaterThan(0);
  });

  it('Caso 1 — el override del CONTRATO fluye: PEQUENA_EMPRESA aplica reglas REMYPE (gratificación a fracción 0.5), NO GENERAL', () => {
    const empleado = construirEmpleado('PEQUENA_EMPRESA');
    // Empresa default GENERAL a propósito: el override del contrato debe ganar.
    const dto = calcularFlujo(empleado, EMPRESA_GENERAL);

    // REMYPE pequeña = medio beneficio. Si el régimen NO fluyera por el cable,
    // este monto sería igual al de GENERAL y la prueba fallaría.
    expect(dto.gratificacion_monto).toBeCloseTo(
      general.gratificacion_monto * 0.5,
      2,
    );
    expect(dto.gratificacion_monto).toBeGreaterThan(0);
    expect(dto.gratificacion_monto).not.toBe(general.gratificacion_monto);

    // La bonificación extraordinaria (Ley 30334) se deriva de la grati reducida →
    // ronda la mitad (tolerancia amplia por el redondeo a céntimo de cada concepto;
    // si el régimen NO fluyera valdría lo mismo que GENERAL, muy fuera de tolerancia).
    expect(dto.bonif_extraordinaria).toBeGreaterThan(0);
    expect(dto.bonif_extraordinaria).toBeCloseTo(
      general.bonif_extraordinaria * 0.5,
      1,
    );

    // EsSalud 9% es igual a GENERAL en pequeña empresa (mismo concepto de salud):
    // confirma que NO degradó a un régimen distinto por accidente.
    expect(dto.essalud_empleador).toBe(general.essalud_empleador);
  });

  it('Caso 2 — el DEFAULT de la empresa se hereda: contrato sin régimen + empresa MICROEMPRESA → reglas microempresa (sin grati/CTS, salud SIS no EsSalud)', () => {
    const empleado = construirEmpleado(null); // contrato sin régimen
    const empresaMicro: EmpresaConRegimenDefault = {
      regimen_laboral_default: 'MICROEMPRESA',
    };
    const dto = calcularFlujo(empleado, empresaMicro);

    // Microempresa NO paga gratificación ni CTS. Diferencia load-bearing con
    // GENERAL: prueba que el default de empresa se resolvió y fluyó al motor.
    expect(dto.gratificacion_monto).toBe(0);
    expect(dto.bonif_extraordinaria).toBe(0);
    expect(dto.cts_monto).toBe(0);

    // Salud microempresa = SIS (monto fijo del empleador), NO EsSalud 9% →
    // essalud_empleador queda en 0, distinto de GENERAL (> 0).
    expect(dto.essalud_empleador).toBe(0);
    expect(general.essalud_empleador).toBeGreaterThan(0);
  });

  it('Caso 3 — régimen NO certificado se BLOQUEA en el camino real: AGRARIO lanza RegimenNoCertificadoError ANTES de emitir DTO', () => {
    const empleado = construirEmpleado('AGRARIO');

    let dto: unknown;
    let error: unknown;
    try {
      dto = calcularFlujo(empleado, EMPRESA_GENERAL);
    } catch (e) {
      error = e;
    }

    // La guardia debe interrumpir el cable ANTES de producir nada.
    expect(dto).toBeUndefined();
    expect(error).toBeInstanceOf(RegimenNoCertificadoError);
    expect((error as RegimenNoCertificadoError).regimen).toBe('AGRARIO');
  });

  it('Caso 3b — CONSTRUCCION_CIVIL (también no certificado) se bloquea por el mismo camino', () => {
    const empleado = construirEmpleado('CONSTRUCCION_CIVIL');

    expect(() => calcularFlujo(empleado, EMPRESA_GENERAL)).toThrow(
      RegimenNoCertificadoError,
    );
  });

  it('Caso 3c — el bloqueo también aplica si el régimen no certificado viene del DEFAULT de empresa (no solo del contrato)', () => {
    const empleado = construirEmpleado(null); // sin override de contrato
    const empresaAgraria: EmpresaConRegimenDefault = {
      regimen_laboral_default: 'AGRARIO',
    };

    expect(() => calcularFlujo(empleado, empresaAgraria)).toThrow(
      RegimenNoCertificadoError,
    );
  });
});
