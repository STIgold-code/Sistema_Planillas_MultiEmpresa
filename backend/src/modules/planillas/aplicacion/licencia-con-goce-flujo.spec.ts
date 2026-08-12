/**
 * Flujo completo de la LICENCIA CON GOCE (LF, LP, LCG) por el camino REAL de
 * producción (`calcularDetalleEmpleado`: motor del DTO completo + overlay del
 * motor de régimen).
 *
 * REGLA LEGAL: la licencia con goce es remuneración ordinaria por días no
 * laborados. El día se paga UNA sola vez y es computable para AFP/ONP, EsSalud
 * y renta de 5ta, igual que cualquier día laborado.
 *
 * DEFECTO QUE ESTOS TESTS FIJAN (comparativo BENITES MALPICA, mayo/julio 2026):
 * la nomenclatura marca LCG como `es_laborable`, así que el día ya entraba a
 * `dias_trabajados` y se pagaba dentro del sueldo proporcional; encima el motor
 * sumaba `licencia_goce_monto` por esos MISMOS días. Resultado: 34 días pagados
 * en un mes de 30 (S/ 1 550.00 de sobrepago en dos meses).
 *
 * PARIDAD DUAL-MOTOR: `haber_mensual`, `onp` y `essalud_empleador` del DTO final
 * los produce el MOTOR DE RÉGIMEN (`calcular-boleta`), mientras que
 * `total_ingresos_afectos` y `licencia_goce_monto` los produce el motor del DTO
 * completo (`calcularDetalleCompleto`). Que las cotizaciones del primero cuadren
 * exactamente con la base del segundo es la prueba de que ambos caminos ven la
 * MISMA remuneración afecta.
 */
import {
  calcularDetalleEmpleado,
  ParametrosCalculoDetalle,
} from './calcular-detalle-empleado';
import {
  ParametrosLegalesEnMemoria,
  ValorVigente,
} from '../infraestructura/parametros-legales-en-memoria';
import { TramoIR } from '../dominio/tipos';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';
import {
  construirEmpleadoBm,
  REGIMEN_ONP_BM,
} from '../calculos/__fixtures__/benites-malpica.fixture';

const uno = <T>(valor: T): ValorVigente<T>[] => [
  { valor, vigenciaDesde: new Date('2000-01-01') },
];

const TRAMOS: TramoIR[] = [
  { hasta: 5, tasa: 0.08 },
  { hasta: 20, tasa: 0.14 },
  { hasta: 35, tasa: 0.17 },
  { hasta: 45, tasa: 0.2 },
  { hasta: Infinity, tasa: 0.3 },
];

/** Mismos parámetros que la planilla real de BM (RMV 1130 → asig. fam. 113). */
const parametros = new ParametrosLegalesEnMemoria({
  rmv: uno(1130),
  uit: uno(5500),
  asignacionFamiliar: uno(113),
  essaludTasa: uno(0.09),
  essaludMinimo: uno(101.7),
  sisMicroempresa: uno(15),
  tramosIR: uno(TRAMOS),
  sctrSalud: uno(0.015),
  sctrPension: uno(0.02),
  vidaLeyTasa: uno(0.0053),
  senatiTasa: uno(0.0075),
});

const SUELDO = 2600;
const ASIG_FAM = 113;
const TASA_ONP = 0.13;
const TASA_ESSALUD = 0.09;

/** Día efectivamente trabajado (A, 8h diurnas). */
function diaTrabajado() {
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

/**
 * Día de licencia CON goce. `esLaborable` refleja cómo lo declara la
 * nomenclatura del cliente: en producción LCG viene con `es_laborable = true`
 * (seed `prisma/seed-tipos-marcacion.ts`).
 */
function diaLicenciaConGoce(codigo = 'LCG', esLaborable = true) {
  return {
    horas: 0,
    tipo_marcacion: {
      codigo,
      es_laborable: esLaborable,
      es_feriado_trabajado: false,
      horas_diurnas: 0,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/** Mes de 30 días: los primeros trabajados, los últimos de licencia con goce. */
function mesConLicencia(diasLicencia: number, esLaborable = true) {
  return [
    ...Array.from({ length: 30 - diasLicencia }, () => diaTrabajado()),
    ...Array.from({ length: diasLicencia }, () =>
      diaLicenciaConGoce('LCG', esLaborable),
    ),
  ];
}

function calcular(detalles: ReturnType<typeof mesConLicencia>) {
  const empleado = construirEmpleadoBm({
    sueldoBase: SUELDO,
    regimenPensionario: REGIMEN_ONP_BM,
    detalles,
    asignacionFamiliar: true,
  });
  return calcularDetalleEmpleado({
    empleado: empleado as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle,
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes: 5,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    parametros,
  } as ParametrosCalculoDetalle);
}

const redondear2 = (v: number) => Math.round(v * 100) / 100;

describe('licencia con goce — el día se paga UNA sola vez (caso real CABRERA, mayo 2026)', () => {
  // Fila real del comparativo: sueldo 2600, asignación familiar, ONP 13%,
  // 26 días trabajados + 4 de licencia con goce.
  const dto = calcular(mesConLicencia(4));

  it('los días de licencia con goce devengan y entran a los días trabajados', () => {
    expect(dto.dias_licencia_con_goce).toBe(4);
    expect(dto.dias_trabajados).toBe(30);
  });

  it('el sueldo proporcional paga el mes completo (30 días), no 34', () => {
    expect(dto.haber_mensual).toBe(SUELDO);
    expect(dto.por_dias_trab).toBe(SUELDO);
  });

  it('NO abona el concepto separado: esos días ya están en el proporcional', () => {
    // Antes del fix: 2600/30 × 4 = 346.67 pagados por SEGUNDA vez.
    expect(dto.licencia_goce_monto).toBe(0);
  });

  it('la remuneración afecta es 2713 (sueldo + asig. familiar), no 3059.67', () => {
    expect(dto.asignacion_familiar).toBe(ASIG_FAM);
    expect(dto.total_ingresos_afectos).toBe(SUELDO + ASIG_FAM);
  });

  it('PARIDAD DUAL-MOTOR: las cotizaciones del motor de régimen cuadran con la base del DTO', () => {
    const base = Number(dto.total_ingresos_afectos);
    // `onp` y `essalud_empleador` vienen del motor de régimen; `base` del motor
    // del DTO completo. Si un camino contara la licencia de más, no cuadrarían.
    expect(dto.onp).toBe(redondear2(base * TASA_ONP));
    expect(dto.essalud_empleador).toBe(redondear2(base * TASA_ESSALUD));
    expect(dto.onp).toBe(352.69);
    expect(dto.essalud_empleador).toBe(244.17);
  });

  it('el ingreso por el día de licencia sigue siendo computable (no se pierde)', () => {
    const sinLicencia = calcular(mesConLicencia(0));
    expect(dto.total_ingresos_afectos).toBe(sinLicencia.total_ingresos_afectos);
    expect(dto.neto_pagar).toBe(sinLicencia.neto_pagar);
  });
});

describe('licencia con goce declarada NO laborable — se paga por el concepto separado', () => {
  const dto = calcular(mesConLicencia(4, false));

  it('el día queda fuera del proporcional y lo abona `licencia_goce_monto`', () => {
    expect(dto.dias_trabajados).toBe(26);
    expect(dto.por_dias_trab).toBe(redondear2((SUELDO / 30) * 26));
    expect(dto.licencia_goce_monto).toBe(redondear2((SUELDO / 30) * 4));
  });

  it('el trabajador cobra el mes completo igual: ni de más ni de menos', () => {
    expect(dto.total_ingresos_afectos).toBe(SUELDO + ASIG_FAM);
  });
});
