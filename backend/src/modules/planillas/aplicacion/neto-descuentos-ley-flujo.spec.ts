/**
 * Flujo del NETO y del TOTAL DE DESCUENTOS DE LEY por el camino REAL de
 * producción (`calcularDetalleEmpleado`: motor del DTO completo + overlay del
 * motor de régimen).
 *
 * REGLA: `total_descuentos_ley` es la SUMA de las columnas de descuento que ya
 * viven en el detalle (`afp_aporte`, `afp_prima`, `afp_comision`, `onp`,
 * `renta_5ta`) — las mismas que imprime la boleta. Nunca un recálculo paralelo
 * con tasas. Y `neto_pagar = total_ingresos − total_descuentos`.
 *
 * DEFECTO QUE ESTOS TESTS FIJAN (comparativo BENITES MALPICA, gap C3, S/ 323.05):
 * `calcularDetalleCompleto` calculaba el total de ley aplicando las tasas sobre
 * SU propia remuneración afecta, y ese total quedaba congelado ANTES de que
 * `extraerMontosLoadBearing` pisara las columnas `onp`/`afp_*`/`renta_5ta` con
 * los valores del motor de régimen. Resultado: la boleta imprimía un descuento
 * y el neto respondía a otro.
 *
 * CASO REPRODUCTOR (fila real GUERRERO, julio 2026): con días de vacaciones
 * gozadas los dos motores ven bases distintas — el motor de régimen cuenta el
 * día de vacaciones como devengado y el motor del DTO lo manda a los ingresos
 * NO afectos. Ese desfase es el que destapa el descuadre. El fix NO decide cuál
 * de las dos bases es la correcta (esa es otra brecha, ver `total_ingresos_afectos`):
 * garantiza que el total y el neto siempre cuadren con las columnas persistidas.
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

/** AFP con comisión de flujo: aporte 10%, prima 1.37%, comisión 1.47%. */
const REGIMEN_AFP_BM = {
  tipo: 'AFP' as const,
  aporte_obligatorio: 10,
  prima_seguro: 1.37,
  comision_flujo: 1.47,
};

const SUELDO = 1800;
const ASIG_FAM = 113;
const DIAS_VACACIONES = 2;
const TASA_ONP = 0.13;

const redondear2 = (v: number) => Math.round(v * 100) / 100;

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
 * Día de descanso vacacional. La nomenclatura del cliente lo declara
 * `es_laborable = true` (el descanso vacacional se asimila a tiempo laborado),
 * pero el clasificador del DTO lo saca de los días laborables y lo valoriza
 * aparte como `remuneracion_vacacional` (ingreso NO afecto).
 */
function diaVacaciones() {
  return {
    horas: 0,
    tipo_marcacion: {
      codigo: 'V',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: 8,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/** Mes de 30 días: los primeros trabajados, los últimos de vacaciones. */
function mesConVacaciones(diasVacaciones: number) {
  return [
    ...Array.from({ length: 30 - diasVacaciones }, () => diaTrabajado()),
    ...Array.from({ length: diasVacaciones }, () => diaVacaciones()),
  ];
}

function calcular(
  regimenPensionario: typeof REGIMEN_ONP_BM | typeof REGIMEN_AFP_BM,
  diasVacaciones = DIAS_VACACIONES,
) {
  const empleado = construirEmpleadoBm({
    sueldoBase: SUELDO,
    regimenPensionario,
    detalles: mesConVacaciones(diasVacaciones),
    asignacionFamiliar: true,
  });
  return calcularDetalleEmpleado({
    empleado: empleado as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle,
    empresa: { regimen_laboral_default: 'GENERAL' },
    // Abril: sin gratificación (julio/diciembre) ni CTS (mayo/noviembre), para
    // que el escenario aísle el descuadre del neto.
    mes: 4,
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

const num = (v: unknown) => Number(v);

describe('neto y descuentos de ley — ONP con días de vacaciones (fila real GUERRERO)', () => {
  const dto = calcular(REGIMEN_ONP_BM);

  it('los dos motores ven bases distintas: ese desfase es el que destapa el descuadre', () => {
    // Motor del DTO: el día de vacaciones sale de los laborables y su valor va a
    // los ingresos NO afectos.
    expect(dto.dias_trabajados).toBe(30 - DIAS_VACACIONES);
    expect(num(dto.remuneracion_vacacional)).toBe(
      redondear2((SUELDO / 30) * DIAS_VACACIONES),
    );
    expect(num(dto.total_ingresos_afectos)).toBe(
      redondear2((SUELDO / 30) * (30 - DIAS_VACACIONES)) + ASIG_FAM,
    );

    // Motor de régimen (fuente de verdad de la columna `onp`): cuenta el día de
    // vacaciones como devengado, así que cotiza sobre el mes completo.
    expect(num(dto.onp)).toBe(redondear2((SUELDO + ASIG_FAM) * TASA_ONP));
    expect(num(dto.onp)).not.toBe(
      redondear2(num(dto.total_ingresos_afectos) * TASA_ONP),
    );
  });

  it('total_descuentos_ley es la SUMA de las columnas, no un recálculo con tasas', () => {
    expect(num(dto.total_descuentos_ley)).toBe(
      redondear2(
        num(dto.afp_aporte) +
          num(dto.afp_prima) +
          num(dto.afp_comision) +
          num(dto.onp) +
          num(dto.renta_5ta),
      ),
    );
  });

  it('total_descuentos = ley + otros', () => {
    expect(num(dto.total_descuentos)).toBe(
      redondear2(
        num(dto.total_descuentos_ley) + num(dto.total_descuentos_otros),
      ),
    );
  });

  it('el neto cuadra al céntimo con lo que suma e imprime la boleta', () => {
    // La boleta imprime las COLUMNAS y cierra con `neto_pagar`: el neto tiene
    // que ser exactamente ingresos menos esas columnas, no menos otro total.
    const descuentosImpresos = redondear2(
      num(dto.afp_aporte) +
        num(dto.afp_prima) +
        num(dto.afp_comision) +
        num(dto.onp) +
        num(dto.renta_5ta) +
        num(dto.total_descuentos_otros),
    );
    expect(num(dto.neto_pagar)).toBe(
      redondear2(num(dto.total_ingresos) - descuentosImpresos),
    );
    expect(num(dto.neto_pagar)).toBe(
      redondear2(num(dto.total_ingresos) - num(dto.total_descuentos)),
    );
    expect(num(dto.neto_mes)).toBe(num(dto.neto_pagar));
  });

  it('`quinta_categoria` sigue a `renta_5ta` (espejo legacy que la boleta usa de respaldo)', () => {
    expect(num(dto.quinta_categoria)).toBe(num(dto.renta_5ta));
  });
});

describe('neto y descuentos de ley — AFP con días de vacaciones', () => {
  const dto = calcular(REGIMEN_AFP_BM);

  it('suma aporte + prima + comisión, y NO cuenta `afp_seguro` (espejo de la prima)', () => {
    const base = SUELDO + ASIG_FAM;
    expect(num(dto.afp_aporte)).toBe(redondear2(base * 0.1));
    expect(num(dto.afp_prima)).toBe(redondear2(base * 0.0137));
    expect(num(dto.afp_seguro)).toBe(num(dto.afp_prima));
    expect(num(dto.afp_comision)).toBe(redondear2(base * 0.0147));

    expect(num(dto.total_descuentos_ley)).toBe(
      redondear2(
        num(dto.afp_aporte) + num(dto.afp_prima) + num(dto.afp_comision),
      ),
    );
  });

  it('el neto cuadra al céntimo con lo que suma e imprime la boleta', () => {
    expect(num(dto.neto_pagar)).toBe(
      redondear2(num(dto.total_ingresos) - num(dto.total_descuentos)),
    );
  });
});

describe('neto y descuentos de ley — mes sin desfase entre motores (no hay regresión)', () => {
  const dto = calcular(REGIMEN_ONP_BM, 0);

  it('mes completo trabajado: total de ley y neto se mantienen', () => {
    expect(num(dto.onp)).toBe(redondear2((SUELDO + ASIG_FAM) * TASA_ONP));
    expect(num(dto.total_descuentos_ley)).toBe(num(dto.onp));
    expect(num(dto.neto_pagar)).toBe(
      redondear2(num(dto.total_ingresos) - num(dto.total_descuentos)),
    );
  });
});
