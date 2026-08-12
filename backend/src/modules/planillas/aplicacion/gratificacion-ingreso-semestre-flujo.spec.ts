/**
 * Flujo completo de la PROPORCIONALIDAD DE LA GRATIFICACIÓN por meses
 * calendario completos laborados en el semestre (Ley 27735 art. 6 +
 * D.S. 005-2002-TR art. 3.3-3.4), desde la fecha de ingreso del trabajador
 * hasta el DTO persistido.
 *
 * Se ejercita `calcularDetalleEmpleado` — el camino REAL de producción — porque
 * es el único que expone el bug de raíz: el DTO completo
 * (`calcularDetalleCompleto`) SÍ resolvía los meses del semestre, pero el motor
 * de régimen (`calcular-boleta`) asumía siempre 6/6 y SOBREESCRIBE
 * `gratificacion_monto` en el overlay. El monto persistido era el inflado.
 *
 * Computable 1800 → sexto = S/ 300; un treintavo del sexto = 1800/180 = S/ 10.
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { calcularDetalleCompleto } from '../dominio/detalle/calcular-detalle-completo';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import {
  EmpleadoParaDetalle,
  mapearEntradaDetalle,
} from './mapear-entrada-detalle';

const PARAMS = new ParametrosLegalesEnMemoria();
const SUELDO = 1800;

const PROMEDIOS = {
  promedioHorasExtras: 0,
  promedioComisiones: 0,
  promedioBonificaciones: 0,
  ultimaGratificacion: 0,
};

const fechaUtc = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

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

function tareo30(codigosPorOrdinal: Record<number, string> = {}) {
  return Array.from({ length: 30 }, (_, i) =>
    fila(i + 1, codigosPorOrdinal[i + 1] ?? 'A'),
  );
}

function empleado(args: {
  fechaIngreso: Date | null;
  codigos?: Record<number, string>;
}): EmpleadoParaMapeo & EmpleadoParaDetalle {
  return {
    sueldo_base: SUELDO,
    fecha_ingreso: args.fechaIngreso,
    fecha_cese: null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: null,
    contratos: [
      {
        regimen_laboral: null,
        // El contrato arranca con el vínculo laboral: el ingreso a mitad de
        // semestre no debe generar días "nuevo no laborado" en el mes de la
        // gratificación (ese trabajador ya lleva meses en planilla).
        fecha_inicio: args.fechaIngreso ?? fechaUtc(2020, 1, 1),
        fecha_fin: null,
      },
    ],
    tareos: [{ detalles: tareo30(args.codigos) }],
  };
}

interface CasoCalculo {
  mes: number;
  fechaIngreso: Date | null;
  codigos?: Record<number, string>;
  diasNoLaboradosMesesPrevios?: Record<number, number>;
}

/** Camino REAL: DTO completo + overlay del motor de régimen (lo que se persiste). */
function calcular(caso: CasoCalculo) {
  return calcularDetalleEmpleado({
    empleado: empleado(caso),
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes: caso.mes,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: PROMEDIOS,
    diasNoLaboradosMesesPrevios: caso.diasNoLaboradosMesesPrevios,
    parametros: PARAMS,
  });
}

/** Camino de DETALLE aislado (sin overlay), para contrastar ambos motores. */
function calcularSoloDetalle(caso: CasoCalculo) {
  return calcularDetalleCompleto(
    mapearEntradaDetalle({
      empleado: empleado(caso),
      mes: caso.mes,
      anio: 2026,
      acumuladoRenta: 0,
      retencionesPreviasRenta: 0,
      promedios: PROMEDIOS,
      diasNoLaboradosMesesPrevios: caso.diasNoLaboradosMesesPrevios,
    }),
    PARAMS,
  );
}

describe('gratificación proporcional por meses del semestre — flujo real (Ley 27735 art. 6)', () => {
  it('REGRESIÓN: ingreso anterior al semestre paga el íntegro y la bonif 9% completa', () => {
    const dto = calcular({ mes: 7, fechaIngreso: fechaUtc(2020, 1, 1) });
    expect(dto.gratificacion_monto).toBe(1800);
    expect(dto.bonif_extraordinaria).toBe(162);
  });

  it('REGRESIÓN: ingreso el 01-ene paga 6/6 (todos los empleados en producción)', () => {
    const dto = calcular({ mes: 7, fechaIngreso: fechaUtc(2026, 1, 1) });
    expect(dto.gratificacion_monto).toBe(1800);
  });

  it('REGRESIÓN: sin fecha de ingreso registrada paga 6/6', () => {
    const dto = calcular({ mes: 7, fechaIngreso: null });
    expect(dto.gratificacion_monto).toBe(1800);
  });

  it('ingreso el 01-abr paga 3/6 en la gratificación de julio', () => {
    const dto = calcular({ mes: 7, fechaIngreso: fechaUtc(2026, 4, 1) });
    expect(dto.gratificacion_monto).toBe(900);
    expect(dto.bonif_extraordinaria).toBe(81);
  });

  // D.S. 005-2002-TR art. 3.4: la unidad es el mes calendario COMPLETO; los días
  // sueltos de marzo no generan sexto.
  it('ingreso el 15-mar paga 3/6: marzo incompleto no suma sexto', () => {
    const dto = calcular({ mes: 7, fechaIngreso: fechaUtc(2026, 3, 15) });
    expect(dto.gratificacion_monto).toBe(900);
  });

  // Art. 3.3: se requiere al menos un mes calendario completo en el período.
  it('ingreso el 01-jul no devenga gratificación de julio (0/6)', () => {
    const dto = calcular({ mes: 7, fechaIngreso: fechaUtc(2026, 7, 1) });
    expect(dto.gratificacion_monto).toBe(0);
    expect(dto.bonif_extraordinaria).toBe(0);
  });

  it('ingreso el 01-oct paga 3/6 en la gratificación de diciembre', () => {
    const dto = calcular({ mes: 12, fechaIngreso: fechaUtc(2026, 10, 1) });
    expect(dto.gratificacion_monto).toBe(900);
    expect(dto.bonif_extraordinaria).toBe(81);
  });
});

describe('gratificación proporcional — interacción con la deducción de treintavos (art. 3.4)', () => {
  it('ingreso el 01-abr + 2 faltas en mayo → 3/6 menos 2 treintavos', () => {
    const dto = calcular({
      mes: 7,
      fechaIngreso: fechaUtc(2026, 4, 1),
      diasNoLaboradosMesesPrevios: { 5: 2 },
    });
    expect(dto.gratificacion_monto).toBe(880); // 900 − 2 × 10
    expect(dto.bonif_extraordinaria).toBe(79.2);
  });

  // No se castiga dos veces la misma ausencia: los meses previos al ingreso ya
  // no suman sexto, así que sus días tampoco pueden deducir treintavos.
  it('las ausencias de meses ANTERIORES al ingreso no deducen otra vez', () => {
    const dto = calcular({
      mes: 7,
      fechaIngreso: fechaUtc(2026, 4, 1),
      diasNoLaboradosMesesPrevios: { 2: 3 },
    });
    expect(dto.gratificacion_monto).toBe(900);
  });

  it('REGRESIÓN: con 6/6 las ausencias de todo el semestre siguen deduciendo', () => {
    const dto = calcular({
      mes: 7,
      fechaIngreso: fechaUtc(2020, 1, 1),
      diasNoLaboradosMesesPrevios: { 2: 3, 4: 2 },
    });
    expect(dto.gratificacion_monto).toBe(1750); // 1800 × 175/180
  });
});

describe('PARIDAD detalle ↔ motor de régimen con ingreso a mitad de semestre', () => {
  const casos: CasoCalculo[] = [
    { mes: 7, fechaIngreso: fechaUtc(2026, 4, 1) },
    { mes: 7, fechaIngreso: fechaUtc(2026, 3, 15) },
    { mes: 7, fechaIngreso: fechaUtc(2026, 7, 1) },
    { mes: 12, fechaIngreso: fechaUtc(2026, 10, 1) },
    {
      mes: 7,
      fechaIngreso: fechaUtc(2026, 4, 1),
      diasNoLaboradosMesesPrevios: { 5: 2 },
    },
  ];

  const ESSALUD = 0.09;

  it.each(
    casos.map(
      (c) =>
        [
          `mes ${c.mes}, ingreso ${c.fechaIngreso?.toISOString().slice(0, 10)}`,
          c,
        ] as const,
    ),
  )('ambos motores dan el MISMO monto (%s)', (_nombre, caso) => {
    const soloDetalle = calcularSoloDetalle(caso);
    const conOverlay = calcular(caso);

    expect(conOverlay.gratificacion_monto).toBe(
      soloDetalle.gratificacion_monto,
    );
    // La bonificación 30334 se deriva de la gratificación YA proporcionada.
    // NOTA: el campo `bonif_extraordinaria` del DTO completo NO sirve como
    // oráculo aquí — cuando no hay gratificación que pagar, el DTO lo reutiliza
    // como REMUNERACIÓN COMPUTABLE de referencia (9% del sueldo, ver
    // `calcular-detalle-completo`). El monto realmente pagado es el del motor.
    expect(conOverlay.bonif_extraordinaria).toBe(
      Math.round(Number(soloDetalle.gratificacion_monto) * ESSALUD * 100) / 100,
    );
  });
});
