import { redondear2 } from './planilla-auditable-formulas';
import type { ReferenciasParametros } from './planilla-auditable-formulas';
import type { ReferenciasEscalaIr } from './planilla-auditable-hojas';
import {
  COLUMNA,
  ConstructorHoja,
  MESES_CORTOS,
  escribirHistorial,
  escribirTareo,
  fechaLocal,
  formulaConteoCodigos,
  ref,
  type Linea,
  type RefsHistorial,
  type RefsTareo,
} from './planilla-trabajador-modelo';
import type {
  CabeceraExportacion,
  ComisionAfpExportacion,
  DetalleExportacion,
  PeriodoExportacion,
  TramoIrExportacion,
  TrazabilidadTrabajador,
} from './planilla-export-tipos';

/**
 * Conceptos de la hoja por trabajador, en el orden en que se leen: de dónde
 * viene cada sol del neto. Módulo PURO: arma filas con fórmulas y calcula en
 * JavaScript el importe que cada fórmula debería dar, para que
 * `ConstructorHoja.linea` decida si la fórmula reproduce al sistema.
 *
 * Las fórmulas replican la aritmética del motor INCLUIDOS sus redondeos
 * intermedios (`calcular-detalle-completo.ts`): el valor hora se redondea antes
 * de aplicar la sobretasa, el valor día antes de multiplicar por los feriados.
 * Si el motor cambia un redondeo, la fórmula deja de reproducirlo y la celda se
 * marca divergente — que es exactamente lo que debe pasar.
 */

export interface ContextoTrabajador {
  cabecera: CabeceraExportacion;
  periodo: PeriodoExportacion | null;
  referencias: ReferenciasParametros;
  valores: Readonly<Record<string, number>>;
  comisiones: readonly ComisionAfpExportacion[];
  escalaIr: ReferenciasEscalaIr | null;
  tramos: readonly TramoIrExportacion[];
  deduccionUit: number;
  aportaSenati: boolean;
}

interface RefsCabecera {
  sueldo: string;
  valorDia: string;
  valorHora: string;
  valorMinuto: string;
  mes: string;
  administradora: string;
  modalidad: string;
}

const SOBRETASA_NOCTURNA = 0.35;
const TASA_NO_DOMICILIADO = 0.3;
const DIAS_SEMANA_LABORAL = 6;

const num = (v: number | null | undefined): number => Number(v) || 0;

// ─── Cabecera ────────────────────────────────────────────────────────────────

function escribirCabecera(
  h: ConstructorHoja,
  d: DetalleExportacion,
  t: TrazabilidadTrabajador,
  ctx: ContextoTrabajador,
): { refs: RefsCabecera; celdaNetoFormulas: ReturnType<ConstructorHoja['pendiente']>; celdaDivergentes: ReturnType<ConstructorHoja['pendiente']> } {
  const { cabecera: cab, periodo } = ctx;
  const etiquetaPeriodo = `${MESES_CORTOS[cab.mes - 1].toUpperCase()} ${cab.anio}`;
  const ventana = periodo
    ? ` · ventana ${periodo.fecha_inicio.split('-').reverse().join('/')} al ${periodo.fecha_fin.split('-').reverse().join('/')}`
    : '';

  h.titulo(
    `${d.nombres_apellidos} — ${d.documento}`,
    `${cab.empresa?.razon_social ?? ''} · Planilla ${etiquetaPeriodo}${ventana} · estado ${cab.estado}`,
  );

  // Resultado al frente: lo primero que se lee es si la hoja cierra.
  h.vacia();
  const filaResultado = h.filaActual;
  const celdaNetoFormulas = h.pendiente({ columna: COLUMNA.importe, formato: 'moneda', estilo: 'formula' });
  h.agregar([
    { columna: COLUMNA.etiqueta, valor: 'NETO A PAGAR según el sistema', estilo: 'total' },
    { columna: COLUMNA.cantidad, valor: d.neto_pagar, formato: 'moneda', estilo: 'sistema' },
    { columna: COLUMNA.factor, valor: 'según las fórmulas →', estilo: 'nota' },
    celdaNetoFormulas,
    {
      columna: COLUMNA.diferencia,
      formula: `ROUND(${ref(COLUMNA.importe, filaResultado)}-${ref(COLUMNA.cantidad, filaResultado)},2)`,
      formato: 'moneda',
      estilo: 'diferencia',
    },
    { columna: COLUMNA.origen, valor: '← la diferencia debe ser 0.00', estilo: 'nota', mergeHasta: COLUMNA.ultima },
  ], 20);
  const celdaDivergentes = h.pendiente({ columna: COLUMNA.cantidad, formato: 'entero', estilo: 'dato' });
  h.agregar([
    { columna: COLUMNA.etiqueta, valor: 'Importes que la fórmula NO reproduce (en rojo)', estilo: 'etiqueta' },
    celdaDivergentes,
    {
      columna: COLUMNA.origen,
      valor: 'Si es mayor a cero, alguien editó un importe a mano o el motor cambió una regla: revisar las celdas rojas.',
      estilo: 'nota',
      mergeHasta: COLUMNA.ultima,
    },
  ]);

  h.seccion('DATOS DEL TRABAJADOR Y DEL PERÍODO');
  h.dato('Cargo', d.cargo || '—', { origen: `Situación: ${d.situacion}` });
  const pension = d.sistema_pensionario === 'AFP'
    ? `AFP · ${d.nombre_sistema_pensionario}`
    : d.sistema_pensionario || 'Sin régimen';
  h.dato('Régimen pensionario', pension);
  const administradora = h.dato('Administradora (para la tabla de comisiones)', d.nombre_sistema_pensionario || '—');
  const modalidad = h.dato(
    'Modalidad de comisión AFP',
    d.sistema_pensionario === 'AFP' ? d.tipo_comision_afp || 'FLUJO' : '—',
    { origen: 'Ley 29903: define cuál de las dos comisiones de la administradora se retiene.' },
  );
  h.dato('Fecha de ingreso', d.fecha_ingreso ? fechaLocal(d.fecha_ingreso) : '—', { formato: 'fecha' });
  if (d.fecha_cese) h.dato('Fecha de cese', fechaLocal(d.fecha_cese), { formato: 'fecha' });
  h.dato('Condición fiscal (renta de 5.ª)', t.domiciliado ? 'DOMICILIADO' : 'NO DOMICILIADO', {
    origen: t.domiciliado
      ? 'Proyección anual con deducción de 7 UIT (LIR art. 46 y 53).'
      : 'Retención definitiva del 30 % sin deducción (LIR art. 54 inc. f y 76).',
  });
  const mes = h.dato('Mes del ejercicio', cab.mes, { formato: 'entero' });
  if (periodo) h.dato('Días de la ventana del período', periodo.dias, { formato: 'entero' });

  const sueldo = h.dato('Sueldo básico', d.rem_basica, {
    formato: 'moneda',
    insumo: true,
    origen: 'Remuneración pactada en el contrato vigente. Editable: al cambiarlo se recalcula toda la hoja.',
  });
  const valorDia = h.dato('Valor día', null, {
    formula: `ROUND(${sueldo}/30,2)`,
    formato: 'moneda',
    origen: 'Sueldo ÷ 30, siempre en treintavos aunque el mes tenga 28 o 31 días.',
  });
  const valorHora = h.dato('Valor hora', null, {
    formula: `ROUND(${sueldo}/30/8,2)`,
    formato: 'moneda',
    origen: 'Valor día ÷ 8 (jornada ordinaria, D.S. 007-2002-TR).',
  });
  const valorMinuto = h.dato('Valor minuto', null, {
    formula: `${sueldo}/30/8/60`,
    formato: 'fraccion',
    origen: 'Sin redondear: el descuento por tiempo no laborado no puede exceder el tiempo real.',
  });

  return {
    refs: { sueldo, valorDia, valorHora, valorMinuto, mes, administradora, modalidad },
    celdaNetoFormulas,
    celdaDivergentes,
  };
}

// ─── Resumen del tareo ───────────────────────────────────────────────────────

interface RefsResumenTareo {
  diasDevengan: Linea;
  he25Diurnas: string;
  he25Nocturnas: string;
  he35Diurnas: string;
  he35Nocturnas: string;
  turnosNoche: string;
  feriados: Linea;
}

function escribirResumenTareo(h: ConstructorHoja, d: DetalleExportacion, tareo: RefsTareo): RefsResumenTareo {
  const c = tareo.conteo;
  h.vacia();
  const diasDevengan = h.linea({
    etiqueta: 'Días que devengan (suman a días trabajados)',
    formula: `SUM(${tareo.rangoDevenga})`,
    esperado: c.devengan,
    sistema: d.dias_trabajados,
    formato: 'entero',
    origen: 'Cuenta los días con "Devenga = 1". Las ausencias sin goce, vacaciones y subsidios quedan fuera: se pagan por su propio concepto o no se pagan.',
  });
  h.linea({
    etiqueta: 'Ausencias sin goce (faltas, suspensiones, licencias sin goce)',
    formula: `SUM(${tareo.rangoSinGoce})`,
    esperado: c.sinGoce,
    sistema: d.faltas + d.suspension + d.licencia_sin_goce,
    formato: 'entero',
    origen: 'No devengan y además recortan el descanso dominical de su semana (D.L. 713 art. 4).',
  });
  const he25Diurnas = h.dato('Horas extras al 25 % (diurnas)', null, { formula: `SUMPRODUCT(${tareo.rangoHe25}*(1-${tareo.rangoNocturno}))`, formato: 'horas' });
  const he25Nocturnas = h.dato('Horas extras al 25 % (nocturnas)', null, { formula: `SUMPRODUCT(${tareo.rangoHe25}*${tareo.rangoNocturno})`, formato: 'horas' });
  const he35Diurnas = h.dato('Horas extras al 35 % (diurnas)', null, { formula: `SUMPRODUCT(${tareo.rangoHe35}*(1-${tareo.rangoNocturno}))`, formato: 'horas' });
  const he35Nocturnas = h.dato('Horas extras al 35 % (nocturnas)', null, { formula: `SUMPRODUCT(${tareo.rangoHe35}*${tareo.rangoNocturno})`, formato: 'horas' });
  const turnosNoche = h.dato('Turnos nocturnos devengados', null, { formula: `SUMPRODUCT(${tareo.rangoDevenga}*${tareo.rangoNocturno})`, formato: 'entero' });
  const feriados = h.linea({
    etiqueta: 'Feriados trabajados',
    formula: `SUM(${tareo.rangoFeriado})`,
    esperado: c.feriados,
    sistema: d.cant_feriados,
    formato: 'entero',
  });
  return { diasDevengan, he25Diurnas, he25Nocturnas, he35Diurnas, he35Nocturnas, turnosNoche, feriados };
}

// ─── Ingresos ────────────────────────────────────────────────────────────────

interface RefsIngresos {
  totalAfectos: Linea;
  totalIngresos: Linea;
  gratificacion: Linea;
  bonificacionExtraordinaria: Linea;
}

function escribirIngresos(
  h: ConstructorHoja,
  d: DetalleExportacion,
  ctx: ContextoTrabajador,
  cab: RefsCabecera,
  tareo: RefsTareo,
  r: RefsResumenTareo,
): RefsIngresos {
  const S = d.rem_basica;
  const vd = redondear2(S / 30);
  const vh = redondear2(S / 30 / 8);
  const c = tareo.conteo;
  const tasa = (codigo: string): string | undefined => ctx.referencias.tasa[codigo];
  const valor = (codigo: string): number | undefined => ctx.valores[codigo];

  h.seccion('INGRESOS AFECTOS — base de las cotizaciones y de la renta');
  const afectos: Linea[] = [];

  // El sistema expone en `haber_mensual` el importe del motor de régimen, que
  // cuenta como pagados también los días de vacaciones, descanso médico y
  // subsidio. El desglose por concepto (y el neto) los paga en líneas propias,
  // así que la fórmula sigue al desglose y, si no coincide, lo dice.
  const haberEsperado = (S / 30) * c.devengan;
  const haberDiverge = Math.abs(redondear2(haberEsperado) - d.haber_mensual) > 0.01;
  afectos.push(h.linea({
    etiqueta: 'Haber mensual (sueldo proporcional)',
    cantidad: { formula: r.diasDevengan.refImporte, formato: 'entero' },
    factor: { formula: `${cab.sueldo}/30` },
    formula: `ROUND(${cab.sueldo}/30*${r.diasDevengan.refImporte},2)`,
    esperado: haberEsperado,
    sistema: d.haber_mensual,
    origen: haberDiverge
      ? 'Sueldo ÷ 30 × días que devengan. El sistema muestra acá el haber del motor de régimen, que cuenta como pagados los días de vacaciones, descanso médico o subsidio; esos días se pagan abajo en sus propias líneas y el neto se arma con ese desglose.'
      : 'Sueldo ÷ 30 × días que devengan. Una falta NO se descuenta aparte: su día simplemente no entra acá.',
  }));

  if (d.sueldo_nocturno > 0 || c.turnosNoche > 0) {
    afectos.push(h.linea({
      etiqueta: 'Bonificación nocturna',
      cantidad: { formula: r.turnosNoche, formato: 'entero' },
      factor: { formula: `ROUND(${cab.sueldo}*${SOBRETASA_NOCTURNA}/30,2)` },
      formula: `ROUND(ROUND(${cab.sueldo}*${SOBRETASA_NOCTURNA}/30,2)*${r.turnosNoche},2)`,
      esperado: redondear2((S * SOBRETASA_NOCTURNA) / 30) * c.turnosNoche,
      sistema: d.sueldo_nocturno,
      origen: 'Sobretasa del 35 % sobre el valor día por cada turno nocturno (D.S. 007-2002-TR art. 8).',
    }));
  }

  const v25 = redondear2(vh * 1.25);
  const v35 = redondear2(vh * 1.35);
  const vn25 = redondear2(vh * (1 + SOBRETASA_NOCTURNA) * 1.25);
  const vn35 = redondear2(vh * (1 + SOBRETASA_NOCTURNA) * 1.35);
  afectos.push(h.linea({
    etiqueta: 'Horas extras al 25 % (dos primeras del día)',
    cantidad: { formula: `${r.he25Diurnas}+${r.he25Nocturnas}`, formato: 'horas' },
    factor: { formula: `ROUND(${cab.valorHora}*1.25,2)` },
    formula: `ROUND(ROUND(${r.he25Diurnas}*ROUND(${cab.valorHora}*1.25,2),2)+ROUND(${r.he25Nocturnas}*ROUND(${cab.valorHora}*${1 + SOBRETASA_NOCTURNA}*1.25,2),2),2)`,
    esperado: redondear2(c.he25Diurnas * v25) + redondear2(c.he25Nocturnas * vn25),
    sistema: d.he_25_monto,
    origen: 'Horas del tareo × valor hora × 1.25. Las nocturnas llevan además la sobretasa del 35 %.',
  }));
  afectos.push(h.linea({
    etiqueta: 'Horas extras al 35 % (a partir de la tercera)',
    cantidad: { formula: `${r.he35Diurnas}+${r.he35Nocturnas}`, formato: 'horas' },
    factor: { formula: `ROUND(${cab.valorHora}*1.35,2)` },
    formula: `ROUND(ROUND(${r.he35Diurnas}*ROUND(${cab.valorHora}*1.35,2),2)+ROUND(${r.he35Nocturnas}*ROUND(${cab.valorHora}*${1 + SOBRETASA_NOCTURNA}*1.35,2),2),2)`,
    esperado: redondear2(c.he35Diurnas * v35) + redondear2(c.he35Nocturnas * vn35),
    sistema: d.he_35_monto,
  }));

  if (d.feriado_trabajado > 0 || c.feriados > 0) {
    afectos.push(h.linea({
      etiqueta: 'Feriado trabajado (pago doble)',
      cantidad: { formula: r.feriados.refImporte, formato: 'entero' },
      factor: { formula: `${cab.valorDia}*2` },
      formula: `ROUND(${cab.valorDia}*2*${r.feriados.refImporte},2)`,
      esperado: vd * 2 * c.feriados,
      sistema: d.feriado_trabajado,
      origen: 'Además del día ya devengado: valor día × 2 por feriado laborado sin descanso sustitutorio (D.L. 713 art. 9).',
    }));
  }

  const porDias = (etiqueta: string, codigos: string[], factor: 'doble' | 'simple', sistema: number, origen: string): void => {
    const n = c.porCodigo(codigos);
    if (sistema <= 0 && n === 0) return;
    const conteo = formulaConteoCodigos(tareo, codigos);
    const base = factor === 'doble' ? `${cab.valorDia}*2` : `${cab.sueldo}/30`;
    afectos.push(h.linea({
      etiqueta,
      cantidad: { formula: conteo, formato: 'entero' },
      factor: { formula: base },
      formula: `ROUND(${base}*(${conteo}),2)`,
      esperado: factor === 'doble' ? vd * 2 * n : (S / 30) * n,
      sistema,
      origen,
    }));
  };
  porDias('Descanso semanal trabajado (DT)', ['DT'], 'doble', d.descanso_trabajado_monto, 'Valor día × 2 por descanso laborado a elección del trabajador (D.L. 713 art. 3).');
  porDias('Descanso médico (DM)', ['DM'], 'simple', d.descanso_medico_monto, 'Los primeros 20 días de incapacidad los paga el empleador (Ley 26790 art. 12). No devengan en el haber: se pagan por este concepto.');
  porDias('Subsidio por incapacidad (SI)', ['SI', 'S-ENF'], 'simple', d.subsidio_incapacidad_monto, 'A partir del día 21 lo reembolsa EsSalud.');
  porDias('Subsidio por maternidad (SM)', ['SM', 'S-MAT'], 'simple', d.subsidio_maternidad_monto, 'Ley 26790 · Ley 30367.');

  const refAsig = tasa('asignacionFamiliar');
  const valorAsig = valor('asignacionFamiliar');
  if (d.asig_familiar_monto > 0) {
    afectos.push(h.linea({
      etiqueta: 'Asignación familiar',
      factor: refAsig ? { formula: refAsig } : undefined,
      formula: refAsig ? `IF(${r.diasDevengan.refImporte}>0,${refAsig},0)` : null,
      esperado: valorAsig === undefined ? null : c.devengan > 0 ? valorAsig : 0,
      sistema: d.asig_familiar_monto,
      origen: '10 % de la RMV por tener hijos menores de 18 (Ley 25129). Monto fijo, no se prorratea.',
    }));
  } else {
    afectos.push(h.linea({
      etiqueta: 'Asignación familiar',
      formula: '0',
      esperado: 0,
      sistema: d.asig_familiar_monto,
      origen: 'No registra carga familiar.',
    }));
  }

  if (d.licencia_goce_monto > 0) {
    afectos.push(h.insumo('Licencia con goce (monto aparte)', d.licencia_goce_monto, 'Días de licencia con goce que NO entraron al haber proporcional y se pagan como concepto separado. Ver "Cómo se calcula".'));
  }
  if (d.pasaje_especial > 0) afectos.push(h.insumo('Pasaje especial', d.pasaje_especial, 'Ingreso registrado manualmente en la planilla.'));

  const totalAfectos = h.suma('TOTAL INGRESOS AFECTOS', afectos, d.total_ingresos_afectos,
    'Base de ONP/AFP, EsSalud y renta de 5.ª.');

  // ── No afectos ──
  h.seccion('INGRESOS NO AFECTOS — no cotizan a pensión ni a EsSalud');
  const noAfectos: Linea[] = [];
  const nVac = c.porCodigo(['V', 'VAC']);
  if (d.remun_vacacional > 0 || nVac > 0) {
    const conteo = formulaConteoCodigos(tareo, ['V', 'VAC']);
    noAfectos.push(h.linea({
      etiqueta: 'Remuneración vacacional',
      cantidad: { formula: conteo, formato: 'entero' },
      factor: { formula: `${cab.sueldo}/30` },
      formula: `ROUND(${cab.sueldo}/30*(${conteo}),2)`,
      esperado: (S / 30) * nVac,
      sistema: d.remun_vacacional,
      origen: 'Sueldo ÷ 30 × días de vacaciones del tareo (D.L. 713 art. 15).',
    }));
  }
  const gratificacion = h.insumo(
    'Gratificación',
    d.gratificacion_monto,
    'Remuneración computable del semestre ÷ 6 × meses completos (Ley 27735). Sale de los antecedentes de arriba y del contrato: ver hoja "Cómo se calcula".',
  );
  noAfectos.push(gratificacion);
  const refBonif = tasa('bonificacionExtraordinaria');
  const valorBonif = valor('bonificacionExtraordinaria');
  const bonificacionExtraordinaria = h.linea({
    etiqueta: 'Bonificación extraordinaria (Ley 30334)',
    factor: refBonif ? { formula: refBonif, formato: 'porcentaje' } : undefined,
    formula: refBonif ? `ROUND(${gratificacion.refImporte}*${refBonif},2)` : null,
    esperado: valorBonif === undefined ? null : d.gratificacion_monto * valorBonif,
    sistema: d.bonif_extraordinaria,
    origen: 'Gratificación × tasa de EsSalud: lo que el empleador habría aportado se entrega al trabajador. Inafecta a pensión, pero SÍ grava renta de 5.ª.',
  });
  noAfectos.push(bonificacionExtraordinaria);
  if (d.cts_monto > 0) noAfectos.push(h.insumo('CTS', d.cts_monto, 'Remuneración computable × meses ÷ 12 (D.S. 001-97-TR). Se deposita en mayo y noviembre.'));

  const otrosNoAfectos: [string, number][] = [
    ['Compensación vacacional', d.compen_vacacional],
    ['Movilidad', d.movilidad_monto],
    ['Refrigerio', d.refrigerio_monto],
    ['Bono de productividad', d.bono_productividad_monto],
    ['Bono de desempeño', d.bono_desempeno_monto],
    ['Bono de armado', d.bono_armado_monto],
    ['Bono por referido', d.bono_referido],
    ['Asignación del cliente', d.asig_cliente_monto],
    ['Reintegro de días trabajados', d.reintegro_dias_trab],
    ['Reintegro inafecto', d.reintegro_inafecto],
    ['Venta de vacaciones', d.venta_vacaciones],
  ];
  otrosNoAfectos.forEach(([etiqueta, monto]) => {
    if (num(monto) > 0) noAfectos.push(h.insumo(etiqueta, monto, 'Ingreso registrado en la planilla.'));
  });

  const totalNoAfectos = h.suma('TOTAL INGRESOS NO AFECTOS', noAfectos, d.total_ingresos_no_afectos);
  h.vacia();
  const totalIngresos = h.suma('TOTAL INGRESOS', [totalAfectos, totalNoAfectos], d.total_ingresos);

  return { totalAfectos, totalIngresos, gratificacion, bonificacionExtraordinaria };
}

// ─── Descuentos que nacen del tareo ──────────────────────────────────────────

function escribirDescuentosTareo(
  h: ConstructorHoja,
  d: DetalleExportacion,
  t: TrazabilidadTrabajador,
  cab: RefsCabecera,
  tareo: RefsTareo,
): Linea[] {
  const S = d.rem_basica;
  const vd = redondear2(S / 30);
  const lineas: Linea[] = [];

  h.seccion(
    'DESCUENTOS QUE NACEN DEL TAREO',
    'La falta tiene DOS efectos: su día no entra al haber (ya está aplicado arriba) y recorta en sextos el descanso dominical de su semana. Por eso "descuento por faltas" vale 0.00 y el dominical va aparte: no es doble castigo, son dos conceptos distintos.',
  );

  lineas.push(h.linea({
    etiqueta: 'Faltas (día no devengado)',
    formula: '0',
    esperado: 0,
    sistema: d.faltas_monto,
    origen: 'Siempre 0.00: el día no trabajado nunca se pagó. Descontarlo otra vez sería cobrarlo dos veces e inflaría la base de EsSalud, AFP y renta.',
  }));

  // Dominical, semana por semana (D.L. 713 art. 4).
  h.encabezado([null, 'Semana calendario (lunes → domingo)', 'Ausencias sin goce', 'Fracción perdida', null, null, null, 'Regla']);
  const filasSextos: string[] = [];
  let sextosEsperados = 0;
  tareo.semanas.forEach((semana) => {
    const fila = h.filaActual;
    const rLunes = ref(COLUMNA.numero, fila);
    const rAusencias = ref(COLUMNA.cantidad, fila);
    h.agregar([
      { columna: COLUMNA.numero, valor: semana.lunes, formato: 'fecha', estilo: 'dato' },
      { columna: COLUMNA.etiqueta, valor: `Semana del lunes ${semana.lunes.getDate()}/${semana.lunes.getMonth() + 1}`, estilo: 'etiqueta' },
      { columna: COLUMNA.cantidad, formula: `SUMPRODUCT((${tareo.rangoLunes}=${rLunes})*${tareo.rangoSinGoce})`, formato: 'entero', estilo: 'formula' },
      { columna: COLUMNA.factor, formula: `MIN(1,${rAusencias}/${DIAS_SEMANA_LABORAL})`, formato: 'fraccion', estilo: 'formula' },
      { columna: COLUMNA.origen, valor: 'Ausencias ÷ 6, con tope de un dominical por semana.', estilo: 'nota', mergeHasta: COLUMNA.ultima },
    ]);
    filasSextos.push(ref(COLUMNA.factor, fila));
    sextosEsperados += Math.min(1, semana.ausenciasSinGoce / DIAS_SEMANA_LABORAL);
  });
  const filaDominical = h.filaActual;
  lineas.push(h.linea({
    etiqueta: 'Descuento dominical (D.L. 713 art. 4)',
    cantidad: { formula: filasSextos.length > 0 ? `SUM(${filasSextos.join(',')})` : '0', formato: 'fraccion' },
    factor: { formula: cab.valorDia },
    formula: `ROUND(${cab.valorDia}*${ref(COLUMNA.cantidad, filaDominical)},2)`,
    esperado: vd * sextosEsperados,
    sistema: d.dominical_monto,
    origen: 'Valor día × suma de las fracciones perdidas. El séptimo día se paga en proporción a los días efectivamente trabajados de cada semana.',
  }));

  const filaTardanzas = h.filaActual;
  lineas.push(h.linea({
    etiqueta: 'Tardanzas',
    cantidad: { valor: t.minutos_tardanza, formato: 'entero' },
    factor: { formula: cab.valorMinuto, formato: 'fraccion' },
    formula: `ROUND(${ref(COLUMNA.cantidad, filaTardanzas)}*${cab.valorMinuto},2)`,
    esperado: (t.minutos_tardanza * S) / 30 / 8 / 60,
    sistema: d.tardanzas_monto,
    origen: 'Minutos no laborados × valor minuto, sin redondeo intermedio. Más que eso sería una multa, y las multas al trabajador están prohibidas. No recorta el dominical: el día se trabajó.',
  }));

  const filaPermisos = h.filaActual;
  lineas.push(h.linea({
    etiqueta: 'Permisos sin goce (días completos)',
    cantidad: { valor: t.dias_permiso, formato: 'entero' },
    factor: { formula: `${cab.sueldo}/30` },
    formula: `ROUND(${cab.sueldo}/30*${ref(COLUMNA.cantidad, filaPermisos)},2)`,
    esperado: (S / 30) * t.dias_permiso,
    sistema: d.permisos_monto,
  }));

  return lineas;
}

// ─── Descuentos de ley ───────────────────────────────────────────────────────

function impuestoPorTramos(rentaNeta: number, uit: number, tramos: readonly TramoIrExportacion[]): number {
  let impuesto = 0;
  let anterior = 0;
  tramos.forEach((tramo) => {
    const limInf = tramo.desde_uit * uit;
    const diferencial = tramo.tasa - anterior;
    if (rentaNeta > limInf) impuesto += (rentaNeta - limInf) * diferencial;
    anterior = tramo.tasa;
  });
  return impuesto;
}

function escribirDescuentosLey(
  h: ConstructorHoja,
  d: DetalleExportacion,
  t: TrazabilidadTrabajador,
  ctx: ContextoTrabajador,
  cab: RefsCabecera,
  ingresos: RefsIngresos,
  historial: RefsHistorial,
): Linea {
  const tasa = (codigo: string): string | undefined => ctx.referencias.tasa[codigo];
  const valor = (codigo: string): number | undefined => ctx.valores[codigo];
  const lineas: Linea[] = [];

  h.seccion('DESCUENTOS DE LEY — pensión y renta de 5.ª');
  const remAfecta = h.linea({
    etiqueta: 'Remuneración afecta (base)',
    formula: ingresos.totalAfectos.refImporte,
    esperado: ingresos.totalAfectos.valorCelda,
    sistema: d.rem_afecta,
    origen: 'Es el total de ingresos afectos de arriba.',
  });
  const baseAfecta = remAfecta.valorCelda;

  if (d.sistema_pensionario === 'ONP') {
    const refOnp = tasa('onp');
    const valorOnp = valor('onp');
    lineas.push(h.linea({
      etiqueta: 'ONP — aporte obligatorio',
      cantidad: { formula: remAfecta.refImporte, formato: 'moneda' },
      factor: refOnp ? { formula: refOnp, formato: 'porcentaje' } : undefined,
      formula: refOnp ? `ROUND(${remAfecta.refImporte}*${refOnp},2)` : null,
      esperado: valorOnp === undefined ? null : baseAfecta * valorOnp,
      sistema: d.snp_onp,
      origen: 'Remuneración afecta × 13 % (D.L. 19990). Tasa en la hoja "Parámetros".',
    }));
  } else if (d.sistema_pensionario === 'AFP') {
    const comision = ctx.comisiones.find((c) => c.administradora === d.nombre_sistema_pensionario);
    const esMixta = d.tipo_comision_afp === 'MIXTA';
    const buscar = (columna: number | string): string =>
      `VLOOKUP(${cab.administradora},${ctx.referencias.rangoAfp},${columna},FALSE)`;
    const afp = (etiqueta: string, columna: number | string, factor: number | undefined, sistema: number, origen: string): void => {
      lineas.push(h.linea({
        etiqueta,
        cantidad: { formula: remAfecta.refImporte, formato: 'moneda' },
        factor: { formula: buscar(columna), formato: 'porcentaje' },
        formula: comision ? `ROUND(${remAfecta.refImporte}*${buscar(columna)},2)` : null,
        esperado: factor === undefined ? null : baseAfecta * factor,
        sistema,
        origen,
      }));
    };
    afp('AFP — aporte obligatorio', 2, comision?.aporte, d.afp_aporte, 'Remuneración afecta × 10 % (D.L. 25897). Va a la cuenta individual del trabajador.');
    afp('AFP — prima de seguro', 3, comision?.prima, d.afp_prima, 'Seguro de invalidez y sobrevivencia.');
    afp(
      'AFP — comisión',
      `IF(${cab.modalidad}="MIXTA",5,4)`,
      comision ? (esMixta ? comision.comision_mixta : comision.comision_flujo) : undefined,
      d.afp_comision,
      'La modalidad del trabajador (flujo o mixta) elige qué comisión de la tabla se aplica.',
    );
  }

  // ── Renta de 5.ª ──
  const refUit = tasa('uit');
  const uit = valor('uit');
  const escala = ctx.escalaIr;
  const mesActual = ctx.cabecera.mes;
  const anio = ctx.cabecera.anio;
  const bonif = ingresos.bonificacionExtraordinaria;

  h.vacia();
  h.agregar([{ columna: COLUMNA.etiqueta, valor: 'Renta de 5.ª categoría — LIR art. 53 · D.S. 122-94-EF art. 40', estilo: 'encabezado', mergeHasta: COLUMNA.ultima }]);

  if (!t.domiciliado) {
    lineas.push(h.linea({
      etiqueta: 'Retención renta 5.ª (no domiciliado, 30 % plano)',
      cantidad: { formula: `${remAfecta.refImporte}+${bonif.refImporte}`, formato: 'moneda' },
      factor: { valor: TASA_NO_DOMICILIADO, formato: 'porcentaje' },
      formula: `ROUND((${remAfecta.refImporte}+${bonif.refImporte})*${TASA_NO_DOMICILIADO},2)`,
      esperado: (baseAfecta + bonif.valorCelda) * TASA_NO_DOMICILIADO,
      sistema: d.renta_5ta,
      origen: 'Sin deducción ni proyección (LIR art. 54 inc. f y art. 76).',
    }));
  } else {
    const puede = refUit !== undefined && uit !== undefined && escala !== null && ctx.tramos.length > 0;
    const paso = (etiqueta: string, formula: string | null, esperado: number | null, origen?: string, formato?: 'moneda' | 'entero'): string => {
      const fila = h.filaActual;
      h.agregar([
        { columna: COLUMNA.etiqueta, valor: etiqueta, estilo: 'etiqueta' },
        formula !== null && puede
          ? { columna: COLUMNA.importe, formula, formato: formato ?? 'moneda', estilo: 'formula' }
          : { columna: COLUMNA.importe, valor: esperado ?? 0, formato: formato ?? 'moneda', estilo: 'divergente', nota: 'Sin escala o UIT en los parámetros: no se pudo construir la fórmula.' },
        ...(origen ? [{ columna: COLUMNA.origen, valor: origen, estilo: 'nota' as const, mergeHasta: COLUMNA.ultima }] : []),
      ]);
      return ref(COLUMNA.importe, fila);
    };

    const acumuladoPrevio = t.renta.acumulado_previo;
    const retencionesPrevias = t.renta.retenciones_previas;
    const mesesRestantes = 12 - mesActual + 1;
    const gratisProyectadas = (mesActual <= 7 ? 1 : 0) + 1;
    const uitValor = uit ?? 0;
    const deduccion = uitValor * ctx.deduccionUit;
    const rentaProyectadaEsp = acumuladoPrevio + baseAfecta * mesesRestantes;
    const gratificacionesEsp = baseAfecta * gratisProyectadas;
    const brutaEsp = rentaProyectadaEsp + gratificacionesEsp;
    const netaEsp = Math.max(0, brutaEsp - deduccion);
    const impuestoEsp = impuestoPorTramos(netaEsp, uitValor, ctx.tramos);
    const pendienteEsp = Math.max(0, impuestoEsp - retencionesPrevias);
    const cuotaEsp = pendienteEsp / mesesRestantes;
    const netaExtEsp = Math.max(0, brutaEsp + bonif.valorCelda - deduccion);
    const impuestoExtEsp = impuestoPorTramos(netaExtEsp, uitValor, ctx.tramos);
    const adicionalEsp = bonif.valorCelda <= 0 ? 0 : Math.max(0, impuestoExtEsp - impuestoEsp);

    const rAcum = paso('(1) Remuneración afecta acumulada de los meses previos del año', `SUMIFS(${historial.rangoRemAfecta},${historial.rangoAnio},${anio},${historial.rangoMes},"<"&${cab.mes})`, acumuladoPrevio, 'Suma de los antecedentes del mismo ejercicio con mes anterior al actual.');
    const rRet = paso('(2) Retenciones ya efectuadas en el año', `SUMIFS(${historial.rangoRenta},${historial.rangoAnio},${anio},${historial.rangoMes},"<"&${cab.mes})`, retencionesPrevias);
    const rMr = paso('(3) Meses restantes del ejercicio (incluido este)', `12-${cab.mes}+1`, mesesRestantes, 'Art. 40 inc. d).', 'entero');
    const rProy = paso('(4) Renta proyectada = (1) + afecta del mes × (3)', `${rAcum}+${remAfecta.refImporte}*${rMr}`, rentaProyectadaEsp);
    const rGrat = paso('(5) Gratificaciones proyectadas', `${remAfecta.refImporte}*(IF(${cab.mes}<=7,1,0)+1)`, gratificacionesEsp, 'Julio (si aún no se pagó) y diciembre: 12 sueldos + 2 gratificaciones (art. 40 inc. a).');
    const rBruta = paso('(6) Renta bruta anual = (4) + (5)', `${rProy}+${rGrat}`, brutaEsp);
    const rDed = paso('(7) Deducción de 7 UIT', escala ? escala.deduccionSoles : null, deduccion, 'LIR art. 46. Quien proyecta menos que esto no tributa.');
    const rNeta = paso('(8) Renta neta anual = MÁX(0, (6) − (7))', `MAX(0,${rBruta}-${rDed})`, netaEsp);
    const rImp = paso('(9) Impuesto anual según la escala', escala ? `SUMPRODUCT((${rNeta}>${escala.limiteInferior})*(${rNeta}-${escala.limiteInferior})*${escala.tasaDiferencial})` : null, impuestoEsp, 'Cada tramo grava solo la porción de renta que cae dentro de él (8 / 14 / 17 / 20 / 30 %). Escala en la hoja "Parámetros".');
    const rPend = paso('(10) Impuesto pendiente = MÁX(0, (9) − (2))', `MAX(0,${rImp}-${rRet})`, pendienteEsp);
    const rCuota = paso('(11) Cuota ordinaria del mes = (10) ÷ (3)', `${rPend}/${rMr}`, cuotaEsp);
    const rNetaExt = paso('(12) Renta neta CON la bonificación extraordinaria', `MAX(0,${rBruta}+${bonif.refImporte}-${rDed})`, netaExtEsp, 'Inciso e): el extraordinario del mes no se proyecta, se suma entero a la renta del año.');
    const rImpExt = paso('(13) Impuesto anual CON la bonificación', escala ? `SUMPRODUCT((${rNetaExt}>${escala.limiteInferior})*(${rNetaExt}-${escala.limiteInferior})*${escala.tasaDiferencial})` : null, impuestoExtEsp);
    const rAdic = paso('(14) Impuesto adicional del extraordinario = (13) − (9)', `IF(${bonif.refImporte}<=0,0,MAX(0,${rImpExt}-${rImp}))`, adicionalEsp, 'Se retiene ÍNTEGRO en el mes en que se paga la bonificación. Por eso julio y diciembre saltan.');

    lineas.push(h.linea({
      etiqueta: 'Retención renta 5.ª del mes = (11) + (14)',
      formula: puede ? `ROUND(${rCuota}+${rAdic},2)` : null,
      esperado: puede ? cuotaEsp + adicionalEsp : null,
      sistema: d.renta_5ta,
      total: true,
    }));
  }

  return h.suma('TOTAL DESCUENTOS DE LEY', lineas, d.total_descuentos_ley);
}

// ─── Préstamos, adelantos y otros ────────────────────────────────────────────

function escribirPrestamosYOtros(h: ConstructorHoja, d: DetalleExportacion, t: TrazabilidadTrabajador): Linea[] {
  const lineas: Linea[] = [];
  const hayVigentes = t.prestamos.some((p) => p.origen === 'VIGENTE');
  h.seccion(
    'PRÉSTAMOS Y ADELANTOS',
    hayVigentes
      ? 'La planilla aún no registró sus cargos (no está aprobada): se muestran los préstamos ACTIVOS de los que el cálculo tomó la cuota, con su convenio de descuento firmado.'
      : 'Cargos que esta planilla aplicó sobre préstamos y adelantos vigentes del trabajador, con su convenio de descuento firmado.',
  );
  // La tabla deja libre la columna G (diferencia), que en esta hoja se reserva
  // para las líneas de concepto; el cargo va en H y el saldo en I.
  const COL_CARGO = COLUMNA.origen;
  const COL_SALDO = COLUMNA.origen + 1;
  h.encabezado([null, 'Tipo', 'Otorgado', 'Monto total', 'Cuota mensual', 'Cuota N°', null, 'Cargo del mes', 'Saldo actual']);
  const primera = h.filaActual;
  if (t.prestamos.length === 0) {
    h.agregar([
      { columna: COLUMNA.etiqueta, valor: 'Sin préstamos ni adelantos cargados en este período', estilo: 'nota' },
      { columna: COL_CARGO, valor: 0, formato: 'moneda', estilo: 'dato' },
    ]);
  }
  t.prestamos.forEach((p) => {
    h.agregar([
      { columna: COLUMNA.etiqueta, valor: p.tipo, estilo: 'etiqueta' },
      { columna: COLUMNA.cantidad, valor: fechaLocal(p.fecha_otorgado), formato: 'fecha', estilo: 'dato' },
      { columna: COLUMNA.factor, valor: p.monto_total, formato: 'moneda', estilo: 'dato' },
      { columna: COLUMNA.importe, valor: p.cuota_mensual, formato: 'moneda', estilo: 'dato' },
      { columna: COLUMNA.sistema, valor: p.cuotas_previstas ? `${p.cuota_numero} de ${p.cuotas_previstas}` : String(p.cuota_numero), estilo: 'dato' },
      { columna: COL_CARGO, valor: p.cargo, formato: 'moneda', estilo: 'insumo' },
      { columna: COL_SALDO, valor: p.saldo_actual, formato: 'moneda', estilo: 'dato' },
    ]);
  });
  const ultima = h.filaActual - 1;
  const rangoTipo = h.rango(COLUMNA.etiqueta, primera, ultima);
  const rangoCargo = h.rango(COL_CARGO, primera, ultima);
  const sumaTipo = (tipo: string): number =>
    t.prestamos.filter((p) => p.tipo === tipo).reduce((acc, p) => acc + p.cargo, 0);

  h.vacia();
  const porTipo = (etiqueta: string, tipo: string, sistema: number): void => {
    lineas.push(h.linea({
      etiqueta,
      formula: `SUMIF(${rangoTipo},"${tipo}",${rangoCargo})`,
      esperado: sumaTipo(tipo),
      sistema,
      origen: `Suma de los cargos de tipo ${tipo} de la tabla.`,
    }));
  };
  porTipo('Cuotas de préstamos', 'PRESTAMO', d.prestamo);
  porTipo('Adelanto de sueldo', 'ADELANTO_SUELDO', d.adelanto_quincena);
  porTipo('Adelanto de gratificación', 'ADELANTO_GRATIFICACION', d.adelanto_gratificacion);

  const otros: [string, number, string][] = [
    ['Adelanto vacacional', d.adelanto_vacacional, 'Registrado manualmente en la planilla.'],
    ['Adelanto de CTS', d.adelanto_cts, 'Registrado manualmente en la planilla.'],
    ['Otros adelantos', d.otros_adelantos, 'Registrado manualmente en la planilla.'],
    ['Otros descuentos', d.otros_descuentos, 'Registrado manualmente en la planilla.'],
    ['Retención judicial', d.retencion_judicial, 'Mandato judicial (alimentos u otros).'],
    ['Descuento por sobregiro', d.dcts_sobregiro, 'Registrado manualmente en la planilla.'],
    ['Descuento por reintegro', d.dcts_reintegro, 'Registrado manualmente en la planilla.'],
  ];
  otros.forEach(([etiqueta, monto, origen]) => {
    if (num(monto) > 0) lineas.push(h.insumo(etiqueta, monto, origen));
  });
  return lineas;
}

// ─── Aportes del empleador ───────────────────────────────────────────────────

function escribirAportes(
  h: ConstructorHoja,
  d: DetalleExportacion,
  ctx: ContextoTrabajador,
  remAfecta: string,
  baseAfecta: number,
  tieneTareo: boolean,
): void {
  const tasa = (codigo: string): string | undefined => ctx.referencias.tasa[codigo];
  const valor = (codigo: string): number | undefined => ctx.valores[codigo];
  const lineas: Linea[] = [];

  h.seccion('APORTES DEL EMPLEADOR — no se descuentan al trabajador');
  const refRmv = tasa('rmv');
  const refMin = tasa('essaludMinimo');
  const refTasa = tasa('essaludTasa');
  const vRmv = valor('rmv');
  const vMin = valor('essaludMinimo');
  const vTasa = valor('essaludTasa');
  const puedeEssalud = refRmv && refMin && refTasa && vRmv !== undefined && vMin !== undefined && vTasa !== undefined;
  // Sin tareo el sistema no calcula nada para el trabajador (todo queda en
  // cero); con tareo, el piso del 9 % de la RMV aplica aunque la afecta sea baja.
  lineas.push(h.linea({
    etiqueta: 'EsSalud (9 %)',
    cantidad: { formula: remAfecta, formato: 'moneda' },
    factor: refTasa ? { formula: refTasa, formato: 'porcentaje' } : undefined,
    formula: !tieneTareo
      ? '0'
      : puedeEssalud
        ? `IF(${remAfecta}<${refRmv},${refMin},ROUND(${remAfecta}*${refTasa},2))`
        : null,
    esperado: !tieneTareo
      ? 0
      : puedeEssalud
        ? (baseAfecta < (vRmv as number) ? (vMin as number) : baseAfecta * (vTasa as number))
        : null,
    sistema: d.essalud,
    origen: tieneTareo
      ? 'Ley 26790: 9 % de la remuneración afecta, con piso del 9 % de la RMV.'
      : 'Sin tareo en el período no hay remuneración ni aporte.',
  }));
  const sobreAfecta = (etiqueta: string, codigo: string, sistema: number, aplica: boolean, origen: string): void => {
    if (!aplica) return;
    const r = tasa(codigo);
    const v = valor(codigo);
    lineas.push(h.linea({
      etiqueta,
      cantidad: { formula: remAfecta, formato: 'moneda' },
      factor: r ? { formula: r, formato: 'porcentaje' } : undefined,
      formula: r ? `ROUND(${remAfecta}*${r},2)` : null,
      esperado: v === undefined ? null : baseAfecta * v,
      sistema,
      origen,
    }));
  };
  const aplicaSctr = d.sctr_salud_empleador > 0 || d.sctr_pension_empleador > 0;
  sobreAfecta('SCTR salud', 'sctrSalud', d.sctr_salud_empleador, aplicaSctr, 'Solo puestos de riesgo (Ley 26790 · D.S. 003-98-SA).');
  sobreAfecta('SCTR pensión', 'sctrPension', d.sctr_pension_empleador, aplicaSctr, 'Solo puestos de riesgo.');
  sobreAfecta('Vida Ley', 'vidaLeyTasa', d.vida_ley_empleador, true, 'D.Leg. 688: seguro de vida a cargo del empleador.');
  sobreAfecta('SENATI', 'senatiTasa', d.senati_empleador, ctx.aportaSenati, 'Ley 26272: empresas industriales.');
  h.suma('TOTAL APORTES DEL EMPLEADOR', lineas, d.total_aportes_empleador);
}

// ─── Hoja completa ───────────────────────────────────────────────────────────

export interface HojaTrabajador {
  constructor: ConstructorHoja;
  /** Fila donde quedó el neto según las fórmulas (para el índice). */
  filaNeto: number;
  divergentes: number;
}

export function construirHojaTrabajador(
  d: DetalleExportacion,
  t: TrazabilidadTrabajador,
  ctx: ContextoTrabajador,
): HojaTrabajador {
  const h = new ConstructorHoja();
  const { refs: cab, celdaNetoFormulas, celdaDivergentes } = escribirCabecera(h, d, t, ctx);
  const historial = escribirHistorial(h, t.historial);
  const tareo = escribirTareo(h, t.tareo);
  const resumen = escribirResumenTareo(h, d, tareo);
  const ingresos = escribirIngresos(h, d, ctx, cab, tareo, resumen);
  const descuentosTareo = escribirDescuentosTareo(h, d, t, cab, tareo);
  const totalLey = escribirDescuentosLey(h, d, t, ctx, cab, ingresos, historial);
  const prestamos = escribirPrestamosYOtros(h, d, t);

  h.vacia();
  const totalOtros = h.suma('TOTAL OTROS DESCUENTOS', [...descuentosTareo, ...prestamos], d.total_descuentos_otros,
    'Descuentos del tareo + préstamos y adelantos + descuentos manuales.');

  h.seccion('RESULTADO');
  const totalDescuentos = h.suma('TOTAL DESCUENTOS', [totalLey, totalOtros], d.total_descuentos);
  const neto = h.linea({
    etiqueta: 'NETO A PAGAR = total ingresos − total descuentos',
    formula: `ROUND(${ingresos.totalIngresos.refImporte}-${totalDescuentos.refImporte},2)`,
    esperado: ingresos.totalIngresos.valorCelda - totalDescuentos.valorCelda,
    sistema: d.neto_pagar,
    total: true,
  });

  escribirAportes(h, d, ctx, ingresos.totalAfectos.refImporte, ingresos.totalAfectos.valorCelda, t.tareo.length > 0);

  // Cierre del cuadro de resultado de la cabecera.
  celdaNetoFormulas.formula = neto.refImporte;
  celdaDivergentes.valor = h.divergentes;

  return { constructor: h, filaNeto: neto.fila, divergentes: h.divergentes };
}
