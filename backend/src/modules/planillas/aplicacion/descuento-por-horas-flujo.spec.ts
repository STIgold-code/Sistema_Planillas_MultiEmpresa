/**
 * Flujo completo del DESCUENTO POR HORAS (tardanzas y permisos parciales) desde
 * las filas de tareo hasta el DTO de planilla.
 *
 * BASE LEGAL Y LÍMITE DURO: descontar por tardanza es legal porque se deja de
 * pagar tiempo que no se trabajó, no porque se sancione al trabajador. Las
 * sanciones pecuniarias están prohibidas, así que el descuento NO PUEDE EXCEDER
 * el valor del tiempo efectivamente no laborado — ni un céntimo, ni por
 * redondeo. Ese es el invariante que fija este spec.
 *
 * Dos efectos que NO ocurren, y que también se verifican acá:
 *  - La tardanza NO saca el día de la base: el trabajador asistió, el día
 *    devenga completo y el descuento sale por su propia columna.
 *  - La tardanza NO recorta el dominical (D.L. 713 art. 4): el descanso semanal
 *    se prorratea por días efectivamente trabajados, y quien llega tarde
 *    trabajó ese día.
 */
import { calcularVentanaPeriodo } from '../../tareo/ventana-periodo';
import { calcularDetalleCompleto } from '../dominio/detalle/calcular-detalle-completo';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './mapear-entrada-detalle';

const PARAMS = new ParametrosLegalesEnMemoria();

/** Sueldo elegido para que la aritmética sea verificable a mano. */
const SUELDO = 3000;
const VALOR_DIA = SUELDO / 30; // 100.00
const VALOR_HORA = VALOR_DIA / 8; // 12.50

/** Fila de tareo con su ordinal, su código y el tiempo no laborado del día. */
function fila(dia: number, codigo = 'A', minutosNoLaborados = 0) {
  const ausente = codigo === 'F' || codigo === 'LSG';
  return {
    dia,
    horas: ausente ? 0 : 8,
    minutos_no_laborados: minutosNoLaborados,
    tipo_marcacion: {
      codigo,
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: ausente ? 0 : 8,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/**
 * Tareo de 30 días. `marcas` mapea el ordinal del día a su código y, si
 * corresponde, a los minutos no laborados de ese día.
 */
function tareo30(marcas: Record<number, [string, number?]> = {}) {
  return Array.from({ length: 30 }, (_, i) => {
    const marca = marcas[i + 1];
    return marca ? fila(i + 1, marca[0], marca[1] ?? 0) : fila(i + 1);
  });
}

function empleado(detalles: ReturnType<typeof fila>[]): EmpleadoParaDetalle {
  return {
    sueldo_base: SUELDO,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    fecha_cese: null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: null,
    contratos: [
      { fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null },
    ],
    tareos: [{ detalles }],
  };
}

/** Junio 2026 como período calendario (01-jun cae lunes). */
function calcular(detalles: ReturnType<typeof fila>[]) {
  const entrada = mapearEntradaDetalle({
    empleado: empleado(detalles),
    mes: 6,
    anio: 2026,
    ventanaPeriodo: calcularVentanaPeriodo(2026, 6, null),
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
  });
  return calcularDetalleCompleto(entrada, PARAMS);
}

describe('descuento por tardanza (código T)', () => {
  it('REGRESIÓN: un mes sin tardanzas no descuenta ni un céntimo', () => {
    const dto = calcular(tareo30());
    expect(dto.descuento_tardanzas).toBe(0);
    expect(dto.minutos_tardanza).toBe(0);
  });

  it('una hora de tardanza cuesta EXACTAMENTE el valor de una hora', () => {
    // El invariante legal: 60 minutos no laborados valen 12.50, que es el valor
    // hora. Redondear el valor minuto antes de multiplicar daría 12.60 y eso
    // sería cobrarle al trabajador 10 céntimos que no corresponden.
    const dto = calcular(tareo30({ 3: ['T', 60] }));
    expect(dto.descuento_tardanzas).toBe(VALOR_HORA);
    expect(dto.minutos_tardanza).toBe(60);
  });

  it('una jornada completa de tardanza no puede costar más que el día', () => {
    // 480 minutos = 8 horas = la jornada entera. El tope natural del descuento
    // es el valor del día; si lo supera, dejó de ser descuento y es multa.
    const dto = calcular(tareo30({ 3: ['T', 480] }));
    expect(dto.descuento_tardanzas).toBe(VALOR_DIA);
  });

  it('descuenta los minutos exactos, con redondeo solo al final', () => {
    // 45 min × (3000 / 30 / 8 / 60) = 9.375 → 9.38
    const dto = calcular(tareo30({ 3: ['T', 45] }));
    expect(dto.descuento_tardanzas).toBe(9.38);
  });

  it('acumula las tardanzas de todo el período', () => {
    const dto = calcular(
      tareo30({ 3: ['T', 45], 10: ['T', 15], 17: ['T', 60] }),
    );
    expect(dto.minutos_tardanza).toBe(120);
    expect(dto.descuento_tardanzas).toBe(25); // 2 horas × 12.50
  });

  it('el día de la tardanza DEVENGA completo: el trabajador asistió', () => {
    const dto = calcular(tareo30({ 3: ['T', 120] }));
    expect(dto.dias_trabajados).toBe(30);
    expect(dto.haber_mensual).toBe(SUELDO);
  });

  it('la tardanza NO recorta el dominical (D.L. 713 art. 4)', () => {
    // El descanso semanal se prorratea por días efectivamente trabajados.
    // Llegar tarde no convierte el día en no trabajado.
    const dto = calcular(tareo30({ 3: ['T', 240] }));
    expect(dto.descuento_dominical).toBe(0);
  });

  it('marcar T y olvidar los minutos no inventa un descuento', () => {
    const dto = calcular(tareo30({ 3: ['T'] }));
    expect(dto.descuento_tardanzas).toBe(0);
  });

  it('el descuento entra al total y baja el neto en ese monto exacto', () => {
    const limpio = calcular(tareo30());
    const conTardanza = calcular(tareo30({ 3: ['T', 60] }));
    expect(conTardanza.total_descuentos_otros).toBe(VALOR_HORA);
    expect(limpio.neto_pagar - conTardanza.neto_pagar).toBeCloseTo(
      VALOR_HORA,
      2,
    );
  });
});

describe('descuento por permiso (código P)', () => {
  it('el permiso PARCIAL descuenta solo sus minutos y devenga el día', () => {
    // 3 horas de permiso sin goce: 180 min × 0.208333… = 37.50
    const dto = calcular(tareo30({ 5: ['P', 180] }));
    expect(dto.descuento_permisos).toBe(37.5);
    expect(dto.dias_trabajados).toBe(30);
  });

  it('el permiso SIN minutos sigue descontando el día completo', () => {
    // Compatibilidad con el comportamiento previo a los permisos por horas.
    const dto = calcular(tareo30({ 5: ['P'] }));
    expect(dto.descuento_permisos).toBe(VALOR_DIA);
  });

  it('el permiso parcial NO recorta el dominical', () => {
    // Mismo criterio que la tardanza: el día se trabajó, aunque parcialmente.
    // [ASUNCIÓN A VALIDAR CON EL CONTADOR — ver docs/descuento-por-horas-en-el-tareo.md]
    const dto = calcular(tareo30({ 5: ['P', 240] }));
    expect(dto.descuento_dominical).toBe(0);
  });

  it('suma permisos parciales y de día completo sin pisarse', () => {
    const dto = calcular(tareo30({ 5: ['P', 120], 12: ['P'] }));
    expect(dto.descuento_permisos).toBe(125); // 25.00 + 100.00
  });
});

describe('tardanzas y ausencias sin goce conviven sin interferirse', () => {
  it('la falta recorta el dominical y la tardanza no, en el mismo período', () => {
    // Falta el miércoles 03-jun (semana 01-07) + tardanza de 1h el 10-jun.
    const dto = calcular(tareo30({ 3: ['F'], 10: ['T', 60] }));
    expect(dto.descuento_dominical).toBe(16.67); // 100 × 1/6, solo por la falta
    expect(dto.descuento_tardanzas).toBe(VALOR_HORA);
    // La falta sale de la base; la tardanza no.
    expect(dto.dias_trabajados).toBe(29);
  });
});
