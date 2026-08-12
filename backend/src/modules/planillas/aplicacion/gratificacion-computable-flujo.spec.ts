/**
 * Flujo REAL de la REMUNERACIÓN COMPUTABLE de la gratificación ordinaria, en
 * sus dos reglas:
 *
 *  1. D.S. 005-2002-TR art. 4 — las remuneraciones de naturaleza VARIABLE o
 *     imprecisa (horas extras) se incorporan a la computable si se percibieron
 *     cuando menos en TRES meses del semestre; se suman los montos y el
 *     resultado se divide entre SEIS.
 *  2. D.S. 005-2002-TR art. 3.2 — la remuneración computable es la VIGENTE AL
 *     30 DE JUNIO (gratificación de julio) o al 30 DE NOVIEMBRE (la de
 *     diciembre). Un aumento posterior al cierre no entra a ese semestre.
 *
 * Se ejercita `calcularDetalleEmpleado` — el camino REAL de producción — para
 * cubrir los DOS motores a la vez: el DTO completo (`calcularDetalleCompleto`)
 * y el overlay del motor de régimen (`calcular-boleta`), que es el que manda
 * sobre `gratificacion_monto` y `bonif_extraordinaria`.
 *
 * Los números salen del comparativo contra la planilla real de BENITES MALPICA
 * INGENIEROS S.A.C. (julio 2026).
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ContratoVigencia } from './cierre-semestre-gratificacion';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';
import { VariablesSemestreGratificacion } from '../dominio/conceptos/remuneracion-variable';

const PARAMS = new ParametrosLegalesEnMemoria();

/** Concepto variable sin percepción alguna en el semestre. */
const SIN_PERCEPCION = { totalSemestre: 0, mesesPercibidos: 0 };

function variables(
  horasExtras: VariablesSemestreGratificacion['horasExtras'],
): VariablesSemestreGratificacion {
  return {
    horasExtras,
    comisiones: SIN_PERCEPCION,
    bonificaciones: SIN_PERCEPCION,
  };
}

function fila(dia: number, codigo = 'A') {
  const trabajado = codigo === 'A';
  return {
    dia,
    horas: trabajado ? 8 : 0,
    tipo_marcacion: {
      codigo,
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: trabajado ? 8 : 0,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

const TAREO_COMPLETO = Array.from({ length: 30 }, (_, i) => fila(i + 1));

function empleado(
  sueldoBase: number,
  tieneAsignacionFamiliar: boolean,
): EmpleadoParaMapeo & EmpleadoParaDetalle {
  return {
    sueldo_base: sueldoBase,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    fecha_cese: null,
    asignacion_familiar: tieneAsignacionFamiliar,
    sctr: false,
    regimen_pensionario: null,
    contratos: [
      { fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null },
    ],
    tareos: [{ detalles: TAREO_COMPLETO }],
  } as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle;
}

function calcular(args: {
  sueldoBase: number;
  mes?: number;
  asignacionFamiliar?: boolean;
  diasNoLaboradosMesesPrevios?: Record<number, number>;
  variablesSemestre?: VariablesSemestreGratificacion;
  contratosVigencia?: ContratoVigencia[];
}) {
  return calcularDetalleEmpleado({
    empleado: empleado(args.sueldoBase, args.asignacionFamiliar ?? true),
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes: args.mes ?? 7,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
      variablesSemestre: args.variablesSemestre,
    },
    diasNoLaboradosMesesPrevios: args.diasNoLaboradosMesesPrevios,
    contratosVigencia: args.contratosVigencia,
    parametros: PARAMS,
  });
}

describe('promedio de horas extras en la computable (D.S. 005-2002-TR art. 4)', () => {
  it('FRANCISCO: el promedio del semestre entra a la grati pagada, no solo a la columna', () => {
    // Computable = 2700 + 113 (AF) + 1111.50/6 = 2813 + 185.25 = 2998.25
    // Grati = 2998.25 × 173/180 = 2881.65 ; bonif 9% = 259.35
    const dto = calcular({
      sueldoBase: 2700,
      diasNoLaboradosMesesPrevios: { 2: 4, 4: 3 },
      variablesSemestre: variables({
        totalSemestre: 1111.5,
        mesesPercibidos: 6,
      }),
    });

    expect(dto.rem_computable_gratificacion).toBe(2998.25);
    expect(dto.gratificacion_monto).toBe(2881.65);
    expect(dto.bonif_extraordinaria).toBe(259.35);
  });

  it('GARRO: mismo criterio con 8 días no laborados (172/180)', () => {
    // Computable = 2600 + 113 + 788.46/6 = 2713 + 131.41 = 2844.41
    // Grati = 2844.41 × 172/180 = 2717.99 ; bonif 9% = 244.62
    const dto = calcular({
      sueldoBase: 2600,
      diasNoLaboradosMesesPrevios: { 3: 5, 5: 3 },
      variablesSemestre: variables({
        totalSemestre: 788.46,
        mesesPercibidos: 6,
      }),
    });

    expect(dto.rem_computable_gratificacion).toBe(2844.41);
    expect(dto.gratificacion_monto).toBe(2717.99);
    expect(dto.bonif_extraordinaria).toBe(244.62);
  });

  it('con solo 2 meses de percepción NO es remuneración regular: no computa', () => {
    const dto = calcular({
      sueldoBase: 2700,
      diasNoLaboradosMesesPrevios: { 2: 4, 4: 3 },
      variablesSemestre: variables({
        totalSemestre: 1111.5,
        mesesPercibidos: 2,
      }),
    });

    expect(dto.rem_computable_gratificacion).toBe(2813);
    expect(dto.gratificacion_monto).toBe(2703.61); // 2813 × 173/180
    expect(dto.bonif_extraordinaria).toBe(243.32);
  });

  it('con exactamente 3 meses de percepción SÍ computa, y el divisor sigue siendo 6', () => {
    const dto = calcular({
      sueldoBase: 2700,
      variablesSemestre: variables({ totalSemestre: 600, mesesPercibidos: 3 }),
    });

    expect(dto.rem_computable_gratificacion).toBe(2913); // 2813 + 600/6
    expect(dto.gratificacion_monto).toBe(2913);
  });

  it('sin datos de variables del semestre la computable es solo la remuneración regular', () => {
    const dto = calcular({ sueldoBase: 2700 });
    expect(dto.rem_computable_gratificacion).toBe(2813);
    expect(dto.gratificacion_monto).toBe(2813);
  });
});

describe('remuneración vigente al cierre del semestre (D.S. 005-2002-TR art. 3.2)', () => {
  /** Aumento que entra en vigencia DESPUÉS del 30 de junio. */
  const aumentoEnJulio = (
    anterior: number,
    nuevo: number,
  ): ContratoVigencia[] => [
    {
      fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
      fecha_fin: new Date(Date.UTC(2026, 5, 30)),
      remuneracion: anterior,
    },
    {
      fecha_inicio: new Date(Date.UTC(2026, 6, 1)),
      fecha_fin: null,
      remuneracion: nuevo,
    },
  ];

  it('SANCHEZ: paga con el sueldo de 1800 vigente al 30-jun, no con los 2000 de julio', () => {
    // Computable = 1800 + 113 = 1913 ; grati = 1913 × 175/180 = 1859.86
    const dto = calcular({
      sueldoBase: 2000,
      diasNoLaboradosMesesPrevios: { 1: 3, 6: 2 },
      contratosVigencia: aumentoEnJulio(1800, 2000),
    });

    expect(dto.rem_computable_gratificacion).toBe(1913);
    expect(dto.gratificacion_monto).toBe(1859.86);
    expect(dto.bonif_extraordinaria).toBe(167.39);
  });

  it('GUERRERO: 1600 al 30-jun aunque en julio cobre 1800', () => {
    // Computable = 1600 + 113 = 1713 ; grati = 1713 × 177/180 = 1684.45
    const dto = calcular({
      sueldoBase: 1800,
      diasNoLaboradosMesesPrevios: { 5: 3 },
      contratosVigencia: aumentoEnJulio(1600, 1800),
    });

    expect(dto.rem_computable_gratificacion).toBe(1713);
    expect(dto.gratificacion_monto).toBe(1684.45);
    expect(dto.bonif_extraordinaria).toBe(151.6);
  });

  it('el sueldo del mes sigue siendo el ACTUAL: el cierre solo manda en la grati', () => {
    const dto = calcular({
      sueldoBase: 2000,
      contratosVigencia: aumentoEnJulio(1800, 2000),
    });

    expect(dto.haber_mensual).toBe(2000);
    expect(dto.sueldo_base).toBe(2000);
    expect(dto.gratificacion_monto).toBe(1913); // 1800 + 113
  });

  it('un aumento ANTERIOR al 30-jun sí integra la computable', () => {
    const dto = calcular({
      sueldoBase: 2000,
      contratosVigencia: [
        {
          fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
          fecha_fin: new Date(Date.UTC(2026, 2, 31)),
          remuneracion: 1800,
        },
        {
          fecha_inicio: new Date(Date.UTC(2026, 3, 1)),
          fecha_fin: null,
          remuneracion: 2000,
        },
      ],
    });

    expect(dto.gratificacion_monto).toBe(2113); // 2000 + 113
  });

  it('la gratificación de diciembre se corta al 30 de noviembre', () => {
    const dto = calcular({
      sueldoBase: 2000,
      mes: 12,
      contratosVigencia: [
        {
          fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
          fecha_fin: new Date(Date.UTC(2026, 10, 30)),
          remuneracion: 1800,
        },
        {
          fecha_inicio: new Date(Date.UTC(2026, 11, 1)),
          fecha_fin: null,
          remuneracion: 2000,
        },
      ],
    });

    expect(dto.gratificacion_monto).toBe(1913); // 1800 + 113
  });

  it('REGRESIÓN: sin historial de contratos se usa el sueldo actual', () => {
    const dto = calcular({ sueldoBase: 2000 });
    expect(dto.gratificacion_monto).toBe(2113);
  });

  it('REGRESIÓN: fuera de julio y diciembre no hay cierre ni gratificación', () => {
    const dto = calcular({
      sueldoBase: 2000,
      mes: 5,
      contratosVigencia: aumentoEnJulio(1800, 2000),
    });
    expect(dto.gratificacion_monto).toBe(0);
  });
});
