/**
 * Flujo completo de la DEDUCCIÓN DE DÍAS NO LABORADOS en la gratificación
 * (D.S. 005-2002-TR art. 3.4, texto según D.S. 017-2002-TR), desde las filas de
 * tareo y las planillas históricas del semestre hasta el DTO persistido.
 *
 * Se ejercita `calcularDetalleEmpleado` — el camino REAL de producción — para
 * cubrir los DOS motores a la vez: el DTO completo (`calcularDetalleCompleto`)
 * y el overlay del motor de régimen (`calcular-boleta`), que es el que manda
 * sobre `gratificacion_monto` y `bonif_extraordinaria`.
 *
 * Computable 1800 → un treintavo del sexto = 1800/180 = S/ 10 por día.
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';

const PARAMS = new ParametrosLegalesEnMemoria();
const SUELDO = 1800;

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

function empleado(
  detalles: ReturnType<typeof fila>[],
): EmpleadoParaMapeo & EmpleadoParaDetalle {
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
  } as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle;
}

function calcular(args: {
  mes: number;
  codigos?: Record<number, string>;
  diasNoLaboradosMesesPrevios?: Record<number, number>;
}) {
  return calcularDetalleEmpleado({
    empleado: empleado(tareo30(args.codigos)),
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes: args.mes,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    diasNoLaboradosMesesPrevios: args.diasNoLaboradosMesesPrevios,
    parametros: PARAMS,
  });
}

describe('gratificación con días no laborados — flujo real (D.S. 005-2002-TR art. 3.4)', () => {
  it('REGRESIÓN: semestre sin ausencias paga el íntegro y la bonif 9% completa', () => {
    const dto = calcular({ mes: 7 });
    expect(dto.gratificacion_monto).toBe(1800);
    expect(dto.bonif_extraordinaria).toBe(162);
  });

  it('julio con 5 días no laborados en enero-junio paga 175/180 (caso real FRANCISCO)', () => {
    const dto = calcular({
      mes: 7,
      diasNoLaboradosMesesPrevios: { 2: 3, 4: 2 },
    });
    expect(dto.gratificacion_monto).toBe(1750);
    expect(dto.bonif_extraordinaria).toBe(157.5);
  });

  it('diciembre suma las faltas del MES EN CURSO a las históricas (caso real GARRO: 9 días)', () => {
    const dto = calcular({
      mes: 12,
      codigos: { 5: 'F', 6: 'F' },
      diasNoLaboradosMesesPrevios: { 8: 5, 10: 2 },
    });
    expect(dto.dias_falta).toBe(2);
    expect(dto.gratificacion_monto).toBe(1710); // 1800 × 171/180
    expect(dto.bonif_extraordinaria).toBe(153.9);
  });

  it('julio NO deduce las faltas del propio julio: pertenecen al semestre siguiente', () => {
    const dto = calcular({ mes: 7, codigos: { 5: 'F', 6: 'F', 7: 'F' } });
    expect(dto.dias_falta).toBe(3);
    expect(dto.gratificacion_monto).toBe(1800);
  });

  it('las ausencias ASIMILADAS a tiempo laborado NO deducen (Ley 27735 art. 6)', () => {
    // Descanso médico, vacaciones, licencia con goce y subsidio: el art. 2 del
    // D.S. 005-2002-TR los cuenta como tiempo efectivamente laborado.
    const dto = calcular({
      mes: 12,
      codigos: { 3: 'DM', 4: 'V', 5: 'LCG', 6: 'SI' },
    });
    expect(dto.gratificacion_monto).toBe(1800);
  });

  it('la suspensión y la licencia SIN goce sí deducen, igual que la falta', () => {
    const dto = calcular({ mes: 12, codigos: { 3: 'S', 4: 'LSG' } });
    expect(dto.dias_suspension).toBe(1);
    expect(dto.dias_licencia_sin_goce).toBe(1);
    expect(dto.gratificacion_monto).toBe(1780); // 1800 − 2 × 10
  });

  it('sin datos históricos no deduce nada: ausencia de dato no es ausencia del trabajador', () => {
    const dto = calcular({ mes: 7, diasNoLaboradosMesesPrevios: undefined });
    expect(dto.gratificacion_monto).toBe(1800);
  });
});
