import { formatDateSafe } from '@/lib/utils';
import { ESTILOS } from './planilla-export-estilos';
import type { DetalleExportacion } from './planilla-export-tipos';

/**
 * Layout de la hoja de detalle de planilla: columnas, anchos y agrupadores.
 * Vive aparte porque lo comparten el export normal y el export AUDITABLE — si
 * cada uno tuviera el suyo, una columna nueva desalinearía uno de los dos.
 *
 * DESCANSO TRAB., D. DOMIN. y SENATI figuran como columna propia a propósito:
 * los tres suman en un total (TOT. AFEC., TOT. OTR. y TOT. AP.) y antes viajaban
 * escondidos, así que el contador no podía cuadrar el total contra lo visible.
 */

/** Índice 1-based de cada columna. Única fuente de verdad de las posiciones. */
export const COL = {
  numero: 1,
  situacion: 2,
  dni: 3,
  nombre: 4,
  cliente: 5,
  sede: 6,
  cargo: 7,
  fechaIngreso: 8,
  fechaCese: 9,
  pension: 10,
  administradora: 11,
  cuspp: 12,
  diasMes: 13,
  diasTrabajados: 14,
  turnoDia: 15,
  turnoNoche: 16,
  dias8h: 17,
  faltas: 18,
  vacaciones: 19,
  diasDescansoMedico: 20,
  diasSubsidioIncapacidad: 21,
  diasSubsidioMaternidad: 22,
  licenciaSinGoce: 23,
  licenciaConGoce: 24,
  suspension: 25,
  feriados: 26,
  remBasica: 27,
  estructuraInicio: 27,
  estructuraFin: 39,
  totalEstructura: 39,
  haberMensual: 40,
  afectosInicio: 40,
  sueldoNocturno: 41,
  he25Monto: 42,
  he35Monto: 43,
  feriadoTrabajado: 44,
  descansoTrabajado: 45,
  descansoMedicoMonto: 46,
  subsidioIncapacidadMonto: 47,
  subsidioMaternidadMonto: 48,
  asigFamiliar: 49,
  licenciaGoceMonto: 50,
  afectosFin: 50,
  totalAfectos: 51,
  noAfectosInicio: 52,
  remVacacional: 52,
  compVacacional: 53,
  ctsMonto: 54,
  gratificacion: 55,
  bonifExtraordinaria: 56,
  movilidad: 57,
  refrigerio: 58,
  bonoDesempeno: 59,
  asigCliente: 60,
  bonoProductividad: 61,
  bonoArmado: 62,
  bonoReferido: 63,
  reintegros: 64,
  ventaVacaciones: 65,
  noAfectosFin: 65,
  totalNoAfectos: 66,
  totalIngresos: 67,
  afpAporte: 68,
  leyInicio: 68,
  afpPrima: 69,
  afpComision: 70,
  onp: 71,
  renta5ta: 72,
  leyFin: 72,
  totalLey: 73,
  otrosInicio: 74,
  adelantoQuincena: 74,
  adelantoVacacional: 75,
  adelantoCts: 76,
  adelantoGratificacion: 77,
  otrosAdelantos: 78,
  descuentoFaltas: 79,
  descuentoDominical: 80,
  descuentoPermisos: 81,
  descuentoTardanzas: 82,
  descuentoSobregiro: 83,
  descuentoReintegro: 84,
  prestamo: 85,
  retencionJudicial: 86,
  otrosDescuentos: 87,
  otrosFin: 87,
  totalOtros: 88,
  totalDescuentos: 89,
  neto: 90,
  essalud: 91,
  aportesInicio: 91,
  sctrSalud: 92,
  sctrPension: 93,
  vidaLey: 94,
  senati: 95,
  aportesFin: 95,
  totalAportes: 96,
  remAfecta: 97,
  remComputable: 98,
  banco: 99,
  cuenta: 100,
  cci: 101,
} as const;

export const ENCABEZADOS: readonly string[] = [
  'N°', 'SITUACIÓN', 'DNI', 'APELLIDOS Y NOMBRES', 'CLIENTE', 'SEDE', 'CARGO',
  'F. INGRESO', 'F. CESE', 'PENSIÓN', 'AFP/ONP', 'CUSPP',
  'DÍAS MES', 'DÍAS TRAB.', 'T. DÍA', 'T. NOCHE', 'DÍAS 8H', 'FALTAS', 'VAC.',
  'D. MÉD.', 'SUB. INC.', 'SUB. MAT.', 'LIC. S/G', 'LIC. C/G', 'SUSP.', 'FERIADOS',
  'REM. BÁS.', 'B. PROD.', 'B. DESP.', 'B. MOV.', 'B. REF.', 'B. ARM.', 'HE 25%', 'HE 35%',
  'B. NOCT.', 'VAC', 'GRAT', 'CTS', 'TOT. ESTR.',
  'HAB. MENS.', 'S. NOCT.', 'HE 25%', 'HE 35%', 'FERIADO', 'DESCANSO TRAB.', 'D. MÉD.',
  'SUB. INC.', 'SUB. MAT.', 'ASIG. FAM.', 'LIC. GOCE', 'TOT. AFEC.',
  'REM. VAC.', 'COMP. VAC.', 'CTS', 'GRATIF.', 'BON. EXT.', 'MOVIL.', 'REFRIG.',
  'B. DESP.', 'ASIG. CLI.', 'B. PROD.', 'B. ARM.', 'B. REF.', 'REINT.', 'VTA. VAC.',
  'TOT. NO AF.',
  'TOT. ING.',
  'AFP AP.', 'AFP PR.', 'AFP COM.', 'ONP', 'RENTA 5TA', 'TOT. LEY',
  'AD. QUIN.', 'AD. VAC.', 'AD. CTS', 'AD. GRAT.', 'OTR. AD.', 'D. FALTAS', 'D. DOMIN.',
  'D. PERM.', 'D. TARD.', 'D. SOBR.', 'D. REINT.', 'PRÉST.', 'RET. JUD.', 'OTR. D.',
  'TOT. OTR.',
  'TOT. DESC.', 'NETO',
  'ESSALUD', 'SCTR S.', 'SCTR P.', 'VIDA LEY', 'SENATI', 'TOT. AP.',
  'REM. AF.', 'REM. COMP.',
  'BANCO', 'N° CTA.', 'CCI',
];

export const ANCHOS: readonly number[] = [
  5, 8, 10, 32, 18, 15, 15, 10, 10, 6, 12, 14,
  6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6,
  10, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 10,
  10, 9, 9, 9, 9, 14, 9, 9, 9, 9, 9, 10,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10,
  10,
  9, 9, 9, 8, 9, 10,
  9, 9, 9, 9, 9, 9, 11, 9, 9, 9, 9, 9, 9, 9, 10,
  10, 11,
  9, 9, 9, 9, 9, 10,
  10, 10,
  12, 14, 20,
];

/** Bloques agrupadores de la fila superior (columnas 1-based, inclusive). */
export const CATEGORIAS = [
  { start: COL.numero, end: COL.cuspp, label: 'DATOS DEL TRABAJADOR', style: ESTILOS.headerDatos },
  { start: COL.diasMes, end: COL.feriados, label: 'CONTROL DE DÍAS', style: ESTILOS.headerDias },
  { start: COL.estructuraInicio, end: COL.estructuraFin, label: 'ESTRUCTURA SALARIAL', style: ESTILOS.headerEstructura },
  { start: COL.afectosInicio, end: COL.totalAfectos, label: 'INGRESOS AFECTOS', style: ESTILOS.headerIngresos },
  { start: COL.noAfectosInicio, end: COL.totalNoAfectos, label: 'INGRESOS NO AFECTOS', style: ESTILOS.headerIngresos },
  { start: COL.totalIngresos, end: COL.totalIngresos, label: 'TOTAL', style: ESTILOS.headerIngresos },
  { start: COL.leyInicio, end: COL.totalLey, label: 'DESC. LEY', style: ESTILOS.headerDescuentos },
  { start: COL.otrosInicio, end: COL.totalOtros, label: 'OTROS DESC.', style: ESTILOS.headerDescuentos },
  { start: COL.totalDescuentos, end: COL.neto, label: 'TOTALES', style: ESTILOS.headerTotales },
  { start: COL.aportesInicio, end: COL.totalAportes, label: 'APORTES EMP.', style: ESTILOS.headerAportes },
  { start: COL.remAfecta, end: COL.remComputable, label: 'REM. COMP.', style: ESTILOS.headerDatos },
  { start: COL.banco, end: COL.cci, label: 'BANCO', style: ESTILOS.headerDatos },
];

/** Columnas con formato moneda: el bloque contiguo de importes. */
export const esColumnaMonetaria = (columna: number): boolean =>
  columna >= COL.remBasica && columna <= COL.remComputable;

/** Columnas de conteo de días, que sí se totalizan aunque no sean moneda. */
export const esColumnaDias = (columna: number): boolean =>
  columna >= COL.diasMes && columna <= COL.feriados;

export function estiloEncabezado(columna: number): Record<string, unknown> {
  if (columna <= COL.cuspp) return ESTILOS.headerDatos;
  if (columna <= COL.feriados) return ESTILOS.headerDias;
  if (columna <= COL.estructuraFin) return ESTILOS.headerEstructura;
  if (columna <= COL.totalIngresos) return ESTILOS.headerIngresos;
  if (columna <= COL.totalOtros) return ESTILOS.headerDescuentos;
  if (columna <= COL.neto) return ESTILOS.headerTotales;
  if (columna <= COL.totalAportes) return ESTILOS.headerAportes;
  return ESTILOS.headerDatos;
}

/** Letra de columna de Excel para un índice 1-based (1 → A, 101 → CW). */
export function letraColumna(columna: number): string {
  let n = columna;
  let letra = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

/** Valores de una fila de detalle, en el mismo orden que `ENCABEZADOS`. */
export function armarFila(d: DetalleExportacion, indice: number): (string | number)[] {
  return [
    indice + 1, d.situacion, d.documento, d.nombres_apellidos, d.cliente, d.sede, d.cargo,
    d.fecha_ingreso ? formatDateSafe(d.fecha_ingreso) : '',
    d.fecha_cese ? formatDateSafe(d.fecha_cese) : '',
    d.sistema_pensionario, d.nombre_sistema_pensionario, d.cuspp,
    d.total_dias, d.dias_trabajados, d.turno_dia, d.turno_noche, d.horas_8,
    d.faltas, d.dias_vacaciones, d.descanso_medico, d.subsidio_incapacidad, d.subsidio_maternidad,
    d.licencia_sin_goce, d.licencia_con_goce, d.suspension, d.cant_feriados,
    d.rem_basica, d.bono_productividad, d.bono_desempeno, d.bono_movilidad, d.bono_refrigerio,
    d.bono_armado, d.he_25, d.he_35, d.bonif_nocturna, d.vac, d.grat, d.cts, d.total_sueldo,
    d.haber_mensual, d.sueldo_nocturno, d.he_25_monto, d.he_35_monto, d.feriado_trabajado,
    d.descanso_trabajado_monto, d.descanso_medico_monto, d.subsidio_incapacidad_monto,
    d.subsidio_maternidad_monto, d.asig_familiar_monto, d.licencia_goce_monto,
    d.total_ingresos_afectos,
    d.remun_vacacional, d.compen_vacacional, d.cts_monto, d.gratificacion_monto,
    d.bonif_extraordinaria, d.movilidad_monto, d.refrigerio_monto, d.bono_desempeno_monto,
    d.asig_cliente_monto, d.bono_productividad_monto, d.bono_armado_monto, d.bono_referido,
    (d.reintegro_dias_trab || 0) + (d.reintegro_inafecto || 0), d.venta_vacaciones,
    d.total_ingresos_no_afectos,
    d.total_ingresos,
    d.afp_aporte, d.afp_prima, d.afp_comision, d.snp_onp, d.renta_5ta, d.total_descuentos_ley,
    d.adelanto_quincena, d.adelanto_vacacional, d.adelanto_cts, d.adelanto_gratificacion,
    d.otros_adelantos, d.faltas_monto, d.dominical_monto, d.permisos_monto,
    d.tardanzas_monto, d.dcts_sobregiro, d.dcts_reintegro,
    d.prestamo, d.retencion_judicial, d.otros_descuentos, d.total_descuentos_otros,
    d.total_descuentos, d.neto_pagar,
    d.essalud, d.sctr_salud_empleador, d.sctr_pension_empleador, d.vida_ley_empleador,
    d.senati_empleador, d.total_aportes_empleador,
    d.rem_afecta, d.rem_computable_afp,
    d.banco, d.cuenta, d.cci,
  ];
}
