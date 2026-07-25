/**
 * Integration parity for the real production per-employee path.
 *
 * `calcularDetalleEmpleado` is the exact path the service runs WITHOUT the legacy
 * engine: pure full-DTO engine (`calcularDetalleCompleto`) + régimen motor overlay
 * of the load-bearing amounts. This test feeds the SAME golden fixtures and
 * asserts that the FINAL DTO equals the cent-accurate oracle
 * (`calcularDetalleOraculo`, the ex-legacy contract) on the load-bearing amounts
 * AND preserves the auxiliary fields (vida ley, computables).
 */
import { RegimenLaboral as RegimenLaboralPrisma } from '@prisma/client';
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import {
  ESCENARIOS_GENERAL,
  calcularDetalleOraculo,
} from '../calculos/__fixtures__/empleados-general.fixture';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';

const parametros = new ParametrosLegalesEnMemoria();

const CAMPOS_LOAD_BEARING = [
  'haber_mensual',
  'horas_extras_25',
  'horas_extras_35',
  'horas_extras',
  'bonificacion_nocturna',
  'gratificacion_monto',
  'cts_monto',
  'essalud_empleador',
  'afp_aporte',
  'afp_prima',
  'afp_seguro',
  'afp_comision',
  'onp',
  'renta_5ta',
] as const;

describe('calcularDetalleEmpleado — paridad del DTO real (motor puro + overlay régimen)', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'los montos load-bearing del DTO final = oráculo: %s',
    (_nombre, escenario) => {
      const oraculo = calcularDetalleOraculo(escenario);

      const dto = calcularDetalleEmpleado({
        empleado: escenario.empleado as unknown as EmpleadoParaMapeo &
          EmpleadoParaDetalle,
        empresa: { regimen_laboral_default: 'GENERAL' },
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
        parametros,
      });

      for (const campo of CAMPOS_LOAD_BEARING) {
        expect(dto[campo]).toBe(oraculo[campo as keyof typeof oraculo]);
      }

      expect(dto.bonif_extraordinaria).toBe(
        oraculo.gratificacion_monto > 0 ? oraculo.bonif_extraordinaria : 0,
      );

      // Campos auxiliares conservados del motor puro del DTO completo.
      expect(dto.vida_ley_empleador).toBe(oraculo.vida_ley_empleador);
      expect(dto.rem_computable_cts).toBe(oraculo.rem_computable_cts);
    },
  );
});

describe('calcularDetalleEmpleado — aporte SENATI (configuración por empresa)', () => {
  const escenario = ESCENARIOS_GENERAL[0];

  const calcular = (aportaSenati: boolean | undefined) =>
    calcularDetalleEmpleado({
      empleado: escenario.empleado as unknown as EmpleadoParaMapeo &
        EmpleadoParaDetalle,
      empresa: {
        regimen_laboral_default: 'GENERAL',
        ...(aportaSenati === undefined ? {} : { aporta_senati: aportaSenati }),
      },
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
      parametros,
    });

  const redondear2 = (v: number) => Math.round(v * 100) / 100;

  it('calcula SENATI sobre la remuneración afecta cuando la empresa lo aporta', () => {
    const dto = calcular(true);
    const fecha = new Date(escenario.anio, escenario.mes - 1, 1);
    const esperado = redondear2(
      Number(dto.total_ingresos_afectos) * parametros.senatiTasa(fecha),
    );
    expect(esperado).toBeGreaterThan(0);
    expect(dto.senati_empleador).toBe(esperado);
  });

  it('incluye el SENATI en el total de aportes del empleador', () => {
    const sinSenati = calcular(false);
    const conSenati = calcular(true);
    expect(
      redondear2(
        Number(conSenati.total_aportes_empleador) -
          Number(sinSenati.total_aportes_empleador),
      ),
    ).toBe(Number(conSenati.senati_empleador));
  });

  it('no aporta SENATI cuando la empresa no lo tiene activado', () => {
    expect(calcular(false).senati_empleador).toBe(0);
  });

  it('no aporta SENATI por defecto (empresa sin el flag)', () => {
    expect(calcular(undefined).senati_empleador).toBe(0);
  });
});

describe('calcularDetalleEmpleado — trabajador no domiciliado (IR 5ta 30% plano)', () => {
  const escenario = ESCENARIOS_GENERAL[0];

  const calcular = (domiciliado: boolean | undefined) =>
    calcularDetalleEmpleado({
      empleado: {
        ...(escenario.empleado as object),
        ...(domiciliado === undefined ? {} : { domiciliado }),
      } as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle,
      empresa: { regimen_laboral_default: 'GENERAL' },
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
      parametros,
    });

  const redondear2 = (v: number) => Math.round(v * 100) / 100;

  it('retiene 30% plano de la remuneración afecta cuando NO es domiciliado', () => {
    const dto = calcular(false);
    const esperado = redondear2(Number(dto.total_ingresos_afectos) * 0.3);
    expect(esperado).toBeGreaterThan(0);
    expect(dto.renta_5ta).toBe(esperado);
  });

  it('mantiene el cálculo progresivo cuando es domiciliado (default)', () => {
    const conFlagTrue = calcular(true);
    const sinFlag = calcular(undefined);
    expect(conFlagTrue.renta_5ta).toBe(sinFlag.renta_5ta);
  });
});

describe('calcularDetalleEmpleado — faltas reducen la base devengada (cuadre BM)', () => {
  const dia = (codigo: string, horas: number) => ({
    horas,
    tipo_marcacion: {
      codigo,
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: horas,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  });

  const empleadoConFaltas = {
    sueldo_base: 2700,
    fecha_ingreso: null,
    fecha_cese: null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: {
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
    },
    contratos: [
      {
        fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
        fecha_fin: null,
        regimen_laboral: null,
      },
    ],
    // 28 días asistidos + 2 faltas: mes de 30 con 2 'F'.
    tareos: [
      {
        detalles: [
          ...Array.from({ length: 28 }, () => dia('A', 8)),
          dia('F', 0),
          dia('F', 0),
        ],
      },
    ],
  } as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle;

  const calcular = () =>
    calcularDetalleEmpleado({
      empleado: empleadoConFaltas,
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
    });

  it('el haber mensual es el devengado: sueldo/30 × 28 días (no el mes completo)', () => {
    expect(calcular().haber_mensual).toBe(2520);
  });

  it('EsSalud y ONP cotizan sobre la base devengada, no la completa', () => {
    const dto = calcular();
    expect(dto.essalud_empleador).toBe(226.8); // 2520 × 9%
    expect(dto.onp).toBe(327.6); // 2520 × 13%
  });

  it('la falta ya no se descuenta aparte (evita el doble castigo)', () => {
    const dto = calcular();
    expect(dto.dias_falta).toBe(2); // informativo, se conserva
    expect(dto.descuento_faltas).toBe(0); // la base devengada ya la excluye
  });
});

describe('calcularDetalleEmpleado — la asignación familiar cotiza (base afecta completa)', () => {
  const dia8h = () => ({
    horas: 8,
    tipo_marcacion: {
      codigo: 'A',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: 8,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  });

  const empleado = (conAsignacion: boolean) =>
    ({
      sueldo_base: 2600,
      fecha_ingreso: null,
      fecha_cese: null,
      asignacion_familiar: conAsignacion,
      sctr: false,
      regimen_pensionario: {
        tipo: 'ONP',
        aporte_obligatorio: 13,
        prima_seguro: 0,
        comision_flujo: 0,
      },
      contratos: [
        {
          fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
          fecha_fin: null,
          regimen_laboral: null,
        },
      ],
      tareos: [{ detalles: Array.from({ length: 30 }, () => dia8h()) }],
    }) as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle;

  const calcular = (conAsignacion: boolean) =>
    calcularDetalleEmpleado({
      empleado: empleado(conAsignacion),
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
    });

  // Caso real: fila 85 del Excel de BM (CABRERA, sueldo 2600, mes completo,
  // con asignación familiar). Base afecta = 2600 + 113 = 2713.
  it('EsSalud cotiza sobre sueldo + asignación familiar (celda CN del Excel)', () => {
    expect(calcular(true).essalud_empleador).toBe(244.17); // 2713 × 9%
  });

  it('ONP cotiza sobre sueldo + asignación familiar (celda BE del Excel)', () => {
    expect(calcular(true).onp).toBe(352.69); // 2713 × 13%
  });

  it('sin asignación familiar la base no cambia (sin regresión)', () => {
    const dto = calcular(false);
    expect(dto.essalud_empleador).toBe(234); // 2600 × 9%
    expect(dto.onp).toBe(338); // 2600 × 13%
  });
});

describe('calcularDetalleEmpleado — snapshot del régimen laboral resuelto', () => {
  const escenario = ESCENARIOS_GENERAL[0];

  const calcular = (
    contratos: { regimen_laboral: RegimenLaboralPrisma | null }[],
    regimenDefaultEmpresa: RegimenLaboralPrisma,
  ) => {
    const empleado = {
      ...(escenario.empleado as object),
      contratos,
    } as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle;

    return calcularDetalleEmpleado({
      empleado,
      empresa: { regimen_laboral_default: regimenDefaultEmpresa },
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
      parametros,
    });
  };

  it('persiste el régimen del contrato cuando lo declara (PEQUENA_EMPRESA)', () => {
    const dto = calcular([{ regimen_laboral: 'PEQUENA_EMPRESA' }], 'GENERAL');
    expect(dto.regimen_laboral).toBe('PEQUENA_EMPRESA');
  });

  it('persiste el régimen por defecto de la empresa cuando el contrato no lo declara', () => {
    const dto = calcular([{ regimen_laboral: null }], 'MICROEMPRESA');
    expect(dto.regimen_laboral).toBe('MICROEMPRESA');
  });

  it('persiste GENERAL cuando ese es el régimen efectivo resuelto', () => {
    const dto = calcular([{ regimen_laboral: null }], 'GENERAL');
    expect(dto.regimen_laboral).toBe('GENERAL');
  });
});
