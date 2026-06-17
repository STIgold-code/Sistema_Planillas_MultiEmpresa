import { Prisma } from '@prisma/client';
import {
  ahoraPeru,
  leerFechaPrisma,
} from '../../../common/utils/datetime.util';
import {
  ESSALUD_PORCENTAJE,
  ESSALUD_MINIMO,
  RMV,
  SCTR_SALUD_TASA,
  SCTR_PENSION_TASA,
  VIDA_LEY_TASA,
  SOBRETASA_NOCTURNA,
  calcularIR5taCategoria,
  round2,
  safeNumber,
} from '../planillas.config';
import { calcularDeducciones } from './deducciones';
import { calcularHorasExtras } from './horas-extras';
import { calcularGratificacion } from './gratificaciones';
import { calcularCts } from './cts';
import { calcularBeneficiosTruncos } from './beneficios-truncos';

// Tipo para empleado con relaciones necesarias para cálculo de planilla
export type EmpleadoParaCalculo = Prisma.EmpleadoGetPayload<{
  include: {
    regimen_pensionario: true;
    banco_haberes: true;
    contratos: true;
    tareos: {
      include: {
        detalles: {
          include: {
            tipo_marcacion: true;
          };
        };
      };
    };
  };
}>;

// Interfaz para promedios históricos de los últimos 6 meses
export interface PromediosHistoricos {
  promedioHorasExtras: number;
  promedioComisiones: number;
  promedioBonificaciones: number;
  // Datos para calcular meses trabajados en semestre
  mesesTrabajadosSemestre: number;
  diasTrabajadosSemestre: number;
  // Última gratificación para cálculo de CTS
  ultimaGratificacion: number;
}

// Códigos que NO cuentan como día laborable aunque tengan es_laborable=true en BD
// Se excluyen del cálculo de diasTrabajados para evitar pagos dobles
const CODIGOS_NO_LABORABLES = [
  'DL', // Descanso Laboral (domingo/descanso semanal)
  'N', // No laborable
  'SC', // Sin cobertura/contrato
  'Q', // Quincena (marca administrativa)
  'DM', // Descanso Médico (se paga como concepto separado)
  'SI', // Subsidio Incapacidad (paga EsSalud)
  'S-ENF', // Subsidio Enfermedad (paga EsSalud)
  'SM', // Subsidio Maternidad (paga EsSalud)
  'S-MAT', // Subsidio Maternidad alternativo (paga EsSalud)
  'VAC', // Vacaciones (se paga como concepto separado)
  'V', // Vacaciones alternativo
  'H', // Feriado NO trabajado (no genera pago extra)
];

export function calcularEmpleado(
  empleado: EmpleadoParaCalculo,
  mes: number = 1,
  anio: number = ahoraPeru().year,
  acumuladoRemuneracion: number = 0,
  acumuladoRetenciones: number = 0,
  promedios: PromediosHistoricos = {
    promedioHorasExtras: 0,
    promedioComisiones: 0,
    promedioBonificaciones: 0,
    mesesTrabajadosSemestre: 6,
    diasTrabajadosSemestre: 0,
    ultimaGratificacion: 0,
  },
) {
  // Funciones auxiliares importadas desde planillas.config.ts:
  // - safeNumber: convierte valores a números de forma segura
  // - round2: redondea a 2 decimales de forma segura

  const sueldoBase = safeNumber(empleado.sueldo_base);

  // Calcular fechas del período para días de ingreso/cese
  const fechaInicioPeriodo = new Date(anio, mes - 1, 1);
  const fechaFinPeriodo = new Date(anio, mes, 0); // Último día del mes
  const diasDelMes = fechaFinPeriodo.getDate();

  // =============================================
  // DÍAS DEL PERÍODO - desde tareo
  // =============================================
  const totalDias = 30; // Mes estándar
  let diasFalta = 0;
  let diasSuspension = 0;
  let diasVacaciones = 0;
  let diasSubsidioIncapacidad = 0;
  let diasSubsidioMaternidad = 0;
  let diasDescansoMedico = 0;
  let diasLicenciaSinGoce = 0;
  let diasLicenciaFallecimiento = 0;
  let diasLicenciaPaternidad = 0;
  let diasLicenciaConGoce = 0;
  let turnoDia = 0;
  let turnoNoche = 0;
  let horas8 = 0; // Días con jornada de exactamente 8 horas (sin horas extras)
  let cantidadFeriados = 0;
  // Nuevas nomenclaturas
  let diasDescansoTrabajado = 0; // DT - Genera pago doble
  let diasHorasExtra = 0; // E - Día con horas extras (se procesa con horas del detalle)
  let diasFaltaJustificada = 0; // FJ - No descuenta pero no paga
  let diasPermiso = 0; // P - Permiso sin goce
  let diasPegada = 0; // PG - Pegada/Reenganche (pago adicional)
  let diasRetenido = 0; // RET - Trabajo detenido por causa externa
  let minutosTardanza = 0; // T - Acumulador de minutos de tardanza
  let diasFeriadoNoTrabajado = 0; // H - Feriado no trabajado (se paga normal)
  let tieneAdelantoQuincenal = false; // Q - Indica que recibió adelanto de quincena
  // Nomenclaturas NO_LABORABLE
  let diasDescansoLaboral = 0; // DL - Descanso laboral programado
  let diasNoLabora = 0; // N - Día que no le corresponde trabajar
  let diasSinContrato = 0; // SC - Sin contrato vigente

  // Procesar tareo si existe
  let diasLaborables = 0; // Contador de días laborables para asignar turnos después
  // Acumuladores de horas extras según ley peruana (D.S. 007-2002-TR)
  // Separamos HE diurnas y nocturnas para aplicar sobretasa combinada
  let totalHorasExtrasDiurnas25 = 0; // HE diurnas primeras 2 horas
  let totalHorasExtrasDiurnas35 = 0; // HE diurnas desde 3ra hora
  let totalHorasExtrasNocturnas25 = 0; // HE nocturnas primeras 2 horas
  let totalHorasExtrasNocturnas35 = 0; // HE nocturnas desde 3ra hora

  if (empleado.tareos && empleado.tareos.length > 0) {
    const tareo = empleado.tareos[0];
    if (tareo.detalles && tareo.detalles.length > 0) {
      for (const detalle of tareo.detalles) {
        if (detalle.tipo_marcacion) {
          const codigo = detalle.tipo_marcacion.codigo;

          // Contar tipos de días según código de nomenclatura
          if (codigo === 'F') diasFalta++;
          else if (codigo === 'S' || codigo === 'SUS') diasSuspension++;
          else if (codigo === 'V' || codigo === 'VAC') diasVacaciones++;
          else if (codigo === 'SI' || codigo === 'S-ENF')
            diasSubsidioIncapacidad++;
          else if (codigo === 'SM' || codigo === 'S-MAT')
            diasSubsidioMaternidad++;
          else if (codigo === 'DM') diasDescansoMedico++;
          else if (codigo === 'LSG') diasLicenciaSinGoce++;
          else if (codigo === 'LF' || codigo === 'LIC-F')
            diasLicenciaFallecimiento++;
          else if (codigo === 'LP' || codigo === 'LIC-P')
            diasLicenciaPaternidad++;
          else if (codigo === 'LCG' || codigo === 'LIC-G')
            diasLicenciaConGoce++;
          // Nuevas nomenclaturas
          else if (codigo === 'DT')
            diasDescansoTrabajado++; // Descanso trabajado (pago doble)
          else if (codigo === 'E')
            diasHorasExtra++; // Día con horas extras
          else if (codigo === 'FJ')
            diasFaltaJustificada++; // Falta justificada (no descuenta ni paga)
          else if (codigo === 'P')
            diasPermiso++; // Permiso sin goce
          else if (codigo === 'PG')
            diasPegada++; // Pegada/Reenganche
          else if (codigo === 'RET')
            diasRetenido++; // Retenido por causa externa
          else if (codigo === 'Q')
            tieneAdelantoQuincenal = true; // Quincena (adelanto)
          else if (codigo === 'T') {
            // Tardanza: acumular minutos (se descuenta proporcional)
            // Los minutos de tardanza vienen en el campo horas del detalle
            minutosTardanza += safeNumber(detalle.horas) * 60; // Convertir horas a minutos
          } else if (codigo === 'H')
            diasFeriadoNoTrabajado++; // Feriado no trabajado
          // Nomenclaturas NO_LABORABLE - no cuentan como día trabajado ni como falta
          else if (codigo === 'DL')
            diasDescansoLaboral++; // Descanso laboral programado
          else if (codigo === 'N')
            diasNoLabora++; // No le corresponde trabajar
          else if (codigo === 'SC') diasSinContrato++; // Sin contrato vigente

          // Feriados trabajados (cualquier código con sufijo H: AH, CH, A8H, etc.)
          if (detalle.tipo_marcacion.es_feriado_trabajado) cantidadFeriados++;

          // Contar días laborables y horas
          // Excluir códigos NO_LABORABLE aunque tengan es_laborable=true en BD
          const esCodigoNoLaborable = CODIGOS_NO_LABORABLES.includes(codigo);
          if (detalle.tipo_marcacion.es_laborable && !esCodigoNoLaborable) {
            diasLaborables++;

            // Obtener horas del día desde la NOMENCLATURA (tipo_marcacion)
            // Prioridad: 1) detalle.horas, 2) horas_diurnas+nocturnas, 3) horas_default
            const horasDelDetalle = safeNumber(detalle.horas);
            const horasDiurnas = detalle.tipo_marcacion.horas_diurnas ?? 0;
            const horasNocturnas = detalle.tipo_marcacion.horas_nocturnas ?? 0;
            const horasDeNomenclatura = horasDiurnas + horasNocturnas;
            const horasDefault = detalle.tipo_marcacion.horas_default ?? 8;

            // Usar horas del detalle si existe, sino de la nomenclatura
            const horasDia =
              horasDelDetalle > 0
                ? horasDelDetalle
                : horasDeNomenclatura > 0
                  ? horasDeNomenclatura
                  : horasDefault;

            // Determinar si es jornada nocturna (tiene horas nocturnas)
            const esJornadaNocturna = horasNocturnas > 0;

            // Calcular horas extras del día según ley peruana (D.S. 007-2002-TR)
            // Jornada máxima: 8 horas diarias
            // HE 25%: primeras 2 horas extras (hora 9 y 10)
            // HE 35%: desde la 3ra hora extra (hora 11 en adelante)
            if (horasDia === 8) {
              horas8++;
            } else if (horasDia > 8) {
              const horasExtrasDia = horasDia - 8;
              // Primeras 2 horas al 25%
              const he25Dia = Math.min(2, horasExtrasDia);
              // Resto al 35%
              const he35Dia = Math.max(0, horasExtrasDia - 2);

              // Separar en diurnas o nocturnas según el tipo de jornada
              if (esJornadaNocturna) {
                totalHorasExtrasNocturnas25 += he25Dia;
                totalHorasExtrasNocturnas35 += he35Dia;
              } else {
                totalHorasExtrasDiurnas25 += he25Dia;
                totalHorasExtrasDiurnas35 += he35Dia;
              }
            }

            // Derivar turno día/noche DIRECTAMENTE desde la nomenclatura
            // Solo suma a turno si el tipo de marcación tiene horas configuradas
            // (Faltas, licencias, vacaciones, etc. con horas=0 no suman a ningún turno)
            if (horasNocturnas > 0) {
              turnoNoche++;
            } else if (horasDiurnas > 0) {
              turnoDia++;
            }
            // Si ambos = 0, no suma a ningún turno (comportamiento correcto)
          }
        }
      }
    }
  }

  // Días que no se trabajaron (para calcular deducción del sueldo)
  // Calcular días por ingreso a mitad de mes
  let diasNuevoNoLab = 0;
  if (empleado.contratos && empleado.contratos.length > 0) {
    const contrato = empleado.contratos[0];
    const fechaInicioContratoLux = leerFechaPrisma(contrato.fecha_inicio);
    // Si el contrato inicia después del primer día del mes
    if (fechaInicioContratoLux.toJSDate() > fechaInicioPeriodo) {
      // Días antes del ingreso que no se trabajan
      diasNuevoNoLab = Math.min(fechaInicioContratoLux.day - 1, diasDelMes);
    }
  } else if (empleado.fecha_ingreso) {
    // Fallback a fecha_ingreso del empleado si no hay contrato
    const fechaIngresoLux = leerFechaPrisma(empleado.fecha_ingreso);
    if (
      fechaIngresoLux.toJSDate() > fechaInicioPeriodo &&
      fechaIngresoLux.toJSDate() <= fechaFinPeriodo
    ) {
      diasNuevoNoLab = fechaIngresoLux.day - 1;
    }
  }

  // Calcular días por cese a mitad de mes
  let diasCesadoNoLab = 0;
  if (empleado.contratos && empleado.contratos.length > 0) {
    const contrato = empleado.contratos[0];
    if (contrato.fecha_fin) {
      const fechaFinContratoLux = leerFechaPrisma(contrato.fecha_fin);
      // Si el contrato termina antes del último día del mes
      if (
        fechaFinContratoLux.toJSDate() >= fechaInicioPeriodo &&
        fechaFinContratoLux.toJSDate() < fechaFinPeriodo
      ) {
        // Días después del cese que no se trabajan
        diasCesadoNoLab = diasDelMes - fechaFinContratoLux.day;
      }
    }
  } else if (empleado.fecha_cese) {
    // Fallback a fecha_cese del empleado si no hay contrato
    const fechaCeseLux = leerFechaPrisma(empleado.fecha_cese);
    if (
      fechaCeseLux.toJSDate() >= fechaInicioPeriodo &&
      fechaCeseLux.toJSDate() < fechaFinPeriodo
    ) {
      diasCesadoNoLab = diasDelMes - fechaCeseLux.day;
    }
  }

  const diasSinCobertura = 0;

  // Cálculo de días trabajados
  // IMPORTANTE: Los días trabajados son EXACTAMENTE los días marcados como laborables en el tareo
  // No usamos fórmula de "30 - faltas" porque eso asume trabajo si no hay faltas
  // El tareo es la fuente de verdad: si no hay días laborables marcados, diasTrabajados = 0
  const diasNoTrabajados =
    diasCesadoNoLab +
    diasNuevoNoLab +
    diasSinCobertura +
    diasFalta +
    diasSuspension +
    diasLicenciaSinGoce;

  const diasSubsidio =
    diasSubsidioIncapacidad + diasSubsidioMaternidad + diasDescansoMedico;

  // diasTrabajados = días marcados como laborables en el tareo (no fórmula restando)
  const diasTrabajados = diasLaborables;

  // =============================================
  // ESTRUCTURA SALARIAL
  // =============================================
  // IMPORTANTE: La planilla SOLO refleja lo que está en el tareo
  // Los campos que NO vienen del tareo (bonos, asig.familiar, adelantos) son 0
  // Esto permite validar que las nomenclaturas funcionan correctamente
  const hayDiasTrabajados = diasTrabajados > 0;

  // remBasica: solo como referencia para calcular proporcional
  const remBasica = hayDiasTrabajados ? sueldoBase : 0;

  // ESTOS CAMPOS NO VIENEN DEL TAREO - se dejan en 0 para validación
  // El usuario puede editarlos manualmente después si es necesario
  const bonoProductividadBase = 0; // No viene del tareo
  const bonoDesempenoBase = 0; // No viene del tareo
  const bonoMovilidadBase = 0; // No viene del tareo
  const bonoRefrigerioBase = 0; // No viene del tareo
  const asigFamClienteBase = 0; // No viene del tareo
  const bonoArmadoBase = 0; // No viene del tareo

  // Horas extras estructura - SÍ vienen del tareo (días con >8 horas)
  const he25Estructura = hayDiasTrabajados
    ? round2((sueldoBase / 30 / 8) * 1.25)
    : 0;
  const he35Estructura = hayDiasTrabajados
    ? round2((sueldoBase / 30 / 8) * 1.35)
    : 0;
  // Sobretasa nocturna - SOLO si hay días de noche
  const bonifNocturnaBase =
    turnoNoche > 0 ? round2((sueldoBase * SOBRETASA_NOCTURNA) / 30) : 0;

  // Bases para beneficios sociales (sin asig.familiar porque no viene del tareo)
  const vacBase = hayDiasTrabajados ? sueldoBase : 0;
  const gratBase = hayDiasTrabajados ? sueldoBase : 0; // Sin asig.familiar
  const ctsBase = hayDiasTrabajados ? sueldoBase : 0; // Sin asig.familiar

  // Total estructura salarial (solo rem.básica, sin bonos)
  const totalSueldoEstructura = remBasica;

  // Proporciones por días trabajados
  const porDiasTrab = round2((remBasica / 30) * diasTrabajados);
  const diferenciaEstructura = round2(remBasica - porDiasTrab);
  const sueldoNetoEstructura = porDiasTrab;

  // =============================================
  // INGRESOS AFECTOS (Fórmulas según Excel de la empresa)
  // =============================================
  // Haber Mensual = (Rem.Básica / 30) × Días_Trab
  const sueldoProporcional = round2((sueldoBase / 30) * diasTrabajados);
  const haberMensual = sueldoProporcional;

  // S.Nocturno = (Bonif.Noct.Base / 30) × Turno_Noche
  // Nota: bonifNocturnaBase = sueldoBase × SOBRETASA_NOCTURNA / 30 (D.S. 007-2002-TR)
  const sueldoNocturno =
    turnoNoche > 0 ? round2(bonifNocturnaBase * turnoNoche) : 0;
  const bonificacionNocturna = sueldoNocturno;

  const pasajeEspecial = 0;

  // =============================================
  // HORAS EXTRAS según Ley Peruana (D.S. 007-2002-TR)
  // =============================================
  const he = calcularHorasExtras(sueldoBase, {
    totalHorasExtrasDiurnas25,
    totalHorasExtrasDiurnas35,
    totalHorasExtrasNocturnas25,
    totalHorasExtrasNocturnas35,
  });
  const {
    horasExtras25,
    horasExtras35,
    horasExtras,
    horasExtrasDiurnas25,
    horasExtrasDiurnas35,
    horasExtrasNocturnas25,
    horasExtrasNocturnas35,
  } = he;
  const he25Base = he.valorHoraExtra25;
  const he35Base = he.valorHoraExtra35;

  // =============================================
  // FERIADO TRABAJADO según Ley Peruana
  // =============================================
  // Se paga: día normal + 100% sobretasa = doble
  // Fórmula: (Sueldo / 30) × 2 × cantidad de feriados
  const valorDiaNormal = round2(sueldoBase / 30);
  const feriadoTrabajado =
    cantidadFeriados > 0 ? round2(valorDiaNormal * 2 * cantidadFeriados) : 0;

  // =============================================
  // DESCANSO TRABAJADO (DT) según Ley Peruana
  // =============================================
  // Trabajar en día de descanso semanal sin compensación
  // Se paga: día normal + 100% sobretasa = doble (igual que feriado)
  // Base legal: Art. 3 D.Leg. 713
  const descansoTrabajadoMonto =
    diasDescansoTrabajado > 0
      ? round2(valorDiaNormal * 2 * diasDescansoTrabajado)
      : 0;

  // =============================================
  // NOTA: E (Horas Extra) se procesa automáticamente
  // =============================================
  // El código E indica un día con horas extras.
  // Las horas extras se calculan en el bucle de tareo cuando es_laborable=true
  // y las horas del día superan 8. No requiere cálculo adicional aquí.

  // D.Médico = (Rem.Básica / 30) × Días_Descanso_Médico
  // Los primeros 20 días de incapacidad son pagados por el empleador
  const descansoMedicoMonto =
    diasDescansoMedico > 0 ? round2((sueldoBase / 30) * diasDescansoMedico) : 0;

  // Subsidio por Incapacidad Temporal (desde día 21, pagado por EsSalud)
  // Fórmula: (Promedio remunerativo / 30) × días de subsidio
  // Nota: Usamos sueldo actual como aproximación del promedio de 12 meses
  const subsidioIncapacidadMonto =
    diasSubsidioIncapacidad > 0
      ? round2((sueldoBase / 30) * diasSubsidioIncapacidad)
      : 0;

  // Subsidio por Maternidad (98 días, pagado por EsSalud)
  // Fórmula: (Promedio remunerativo / 30) × días de subsidio
  const subsidioMaternidadMonto =
    diasSubsidioMaternidad > 0
      ? round2((sueldoBase / 30) * diasSubsidioMaternidad)
      : 0;

  // Asig.Familiar: NO viene del tareo - se deja en 0 para validación
  // El usuario puede editarlo manualmente después si es necesario
  const asignacionFamiliar = 0; // No viene del tareo

  // Licencia Goce = (Rem.Básica / 30) × (Lic.Fall + Lic.Pat + Lic.ConGoce)
  const licenciaGoceMonto = round2(
    (sueldoBase / 30) *
      (diasLicenciaFallecimiento +
        diasLicenciaPaternidad +
        diasLicenciaConGoce),
  );
  const bonificaciones = 0;
  const otrosIngresos = 0;

  const totalIngresosAfectos = round2(
    haberMensual +
      sueldoNocturno +
      pasajeEspecial +
      horasExtras25 +
      horasExtras35 +
      feriadoTrabajado +
      descansoTrabajadoMonto + // DT - Descanso trabajado (pago doble)
      descansoMedicoMonto +
      subsidioIncapacidadMonto +
      subsidioMaternidadMonto +
      asignacionFamiliar +
      licenciaGoceMonto +
      bonificaciones +
      otrosIngresos,
  );

  // =============================================
  // INGRESOS NO AFECTOS (Fórmulas según Excel de la empresa)
  // =============================================
  const remuneracionVacacional = round2((sueldoBase / 30) * diasVacaciones);
  const compensacionVacacional = 0;

  // =============================================
  // GRATIFICACIÓN (Julio y Diciembre) - Ley 27735 + Ley 30334
  // =============================================
  const grat = calcularGratificacion(
    mes,
    anio,
    gratBase,
    empleado.fecha_ingreso,
    promedios.promedioHorasExtras,
    promedios.promedioComisiones,
    promedios.promedioBonificaciones,
  );
  const { gratificacionMonto, bonifExtraordinariaMonto, mesesGratificacion } =
    grat;

  // =============================================
  // CTS (Mayo y Noviembre) - D.S. 001-97-TR
  // =============================================
  const sextoGratificacionCts =
    promedios.ultimaGratificacion > 0
      ? round2(promedios.ultimaGratificacion / 6)
      : round2(gratBase / 6);

  const ctsResult = calcularCts(
    mes,
    anio,
    ctsBase,
    sextoGratificacionCts,
    promedios.promedioHorasExtras,
    promedios.promedioComisiones,
    empleado.fecha_ingreso,
  );
  const { ctsMonto } = ctsResult;
  const mesesCtsCalc = ctsResult.mesesCts;
  const diasCtsCalc = ctsResult.diasCts;

  // Movilidad = (Bono_Movilidad / 30) × Turno_Día
  const movilidad =
    turnoDia > 0 ? round2((bonoMovilidadBase / 30) * turnoDia) : 0;

  // Refrigerio = (Bono_Refrigerio / 30) × Días_Trab
  const refrigerio =
    diasTrabajados > 0 ? round2((bonoRefrigerioBase / 30) * diasTrabajados) : 0;

  const bonoDesempenoMonto = bonoDesempenoBase;

  // Asig.Cliente: NO viene del tareo - se deja en 0 para validación
  const asignacionCliente = 0; // No viene del tareo

  // PG - Pegada/Reenganche: SÍ viene del tareo (código PG)
  const pegadaReenganche =
    diasPegada > 0 ? round2(valorDiaNormal * diasPegada) : 0;
  // Bonos: NO vienen del tareo - se dejan en 0 para validación
  const bonoProductividadMonto = 0; // No viene del tareo
  const bonoArmadoMonto = 0; // No viene del tareo
  const bonosModulo = 0; // Bonos se agregan manualmente en la planilla
  const bonoReferido = 0;
  const reintegroDiasTrab = 0;
  const reintegroInafecto = 0;
  const ingresoSobregiro = 0;
  const ventaVacaciones = 0;

  // Ingresos específicos para planilla
  const vacacionesIngreso = remuneracionVacacional;
  const gratificacionIngreso = gratificacionMonto + bonifExtraordinariaMonto;
  const ctsIngreso = ctsMonto;
  const bonoArmadoIngreso = bonoArmadoMonto;

  const totalIngresosNoAfectos = round2(
    remuneracionVacacional +
      compensacionVacacional +
      ctsMonto +
      gratificacionMonto +
      bonifExtraordinariaMonto + // Bonificación extraordinaria del 9%
      movilidad +
      refrigerio +
      bonoDesempenoMonto +
      asignacionCliente +
      pegadaReenganche +
      bonoProductividadMonto +
      bonoArmadoMonto +
      bonoReferido +
      bonosModulo +
      reintegroDiasTrab +
      reintegroInafecto +
      ingresoSobregiro +
      ventaVacaciones,
  );

  const totalIngresos = round2(totalIngresosAfectos + totalIngresosNoAfectos);
  const remuneracionAfecta = totalIngresosAfectos;
  const totalHaberes = totalIngresos;

  // =============================================
  // DESCUENTOS OBLIGATORIOS (AFP/ONP)
  // =============================================
  const deducciones = calcularDeducciones(
    remuneracionAfecta,
    empleado.regimen_pensionario,
  );
  const { afpAporte, afpPrima, afpSeguro, afpComision, onp } = deducciones;
  const essalud = 0;

  // IR 5ta categoría según legislación peruana
  // Usa la remuneración afecta y el acumulado de meses anteriores del año
  // para calcular la retención mensual de forma precisa
  const renta5ta = calcularIR5taCategoria(
    remuneracionAfecta,
    mes,
    acumuladoRemuneracion,
    acumuladoRetenciones,
  );
  const quintaCategoria = renta5ta;

  // =============================================
  // DESCUENTOS - ADELANTOS
  // =============================================
  // ADELANTOS: NO vienen del tareo - se dejan en 0 para validación
  // El usuario puede editarlos manualmente después si es necesario
  const adelantos = 0; // No viene del tareo
  const adelantoQuincena = 0; // No viene del tareo
  const adelantoVacacional = 0;
  const otrosAdelantos = 0;
  const adelantoCts = 0;
  const adelantoGratificacion = 0;

  // =============================================
  // DESCUENTOS - OTROS
  // =============================================
  // Préstamo (unificado - prestamos es alias de prestamo)
  const prestamo = 0; // Editable manualmente via DTO
  const prestamos = prestamo; // Sincronizado para consistencia

  const otrosDescuentos = 0;
  // Solo calcular descuentos si hay días trabajados
  const descuentoFaltas = hayDiasTrabajados
    ? round2((sueldoBase / 30) * diasFalta)
    : 0;
  // Permiso sin goce (P) - se descuenta igual que una falta
  const descuentoPermisos = hayDiasTrabajados
    ? round2((sueldoBase / 30) * diasPermiso)
    : 0;
  // Tardanzas (T) - descuento proporcional por minutos
  // Fórmula: (Sueldo / 30 / 8 / 60) × minutos de tardanza
  const valorMinuto = hayDiasTrabajados ? round2(sueldoBase / 30 / 8 / 60) : 0;
  const descuentoTardanzas = hayDiasTrabajados
    ? round2(valorMinuto * minutosTardanza)
    : 0;
  const descuentoSobregiro = 0;
  const descuentoReintegro = 0;
  const retencionJudicial = 0;
  const descuentoFeriado = 0;

  // SCTR - Seguro Complementario de Trabajo de Riesgo
  // Nota: El SCTR normalmente es aporte del empleador, no descuento al trabajador
  // Este campo se deja en 0 para descuentos, pero se calcula en aportes empleador
  const sctr = 0;

  // Totales de descuentos
  const totalDescuentosLey = round2(
    afpAporte + afpPrima + afpComision + onp + renta5ta,
  );
  const totalDescuentosOtros = round2(
    adelantoQuincena +
      adelantoVacacional +
      otrosAdelantos +
      adelantoCts +
      adelantoGratificacion +
      otrosDescuentos +
      descuentoFaltas +
      descuentoPermisos + // P - Permiso sin goce
      descuentoTardanzas + // T - Tardanzas
      descuentoSobregiro +
      descuentoReintegro +
      prestamo +
      retencionJudicial +
      sctr,
  );
  const totalDescuentos = round2(totalDescuentosLey + totalDescuentosOtros);

  // =============================================
  // APORTES EMPLEADOR (no descuenta al trabajador)
  // =============================================
  // Essalud = IF(Rem_Afecta < RMV, ESSALUD_MINIMO, Rem_Afecta × 9%)
  const essaludEmpleador =
    remuneracionAfecta < RMV
      ? ESSALUD_MINIMO
      : round2(remuneracionAfecta * ESSALUD_PORCENTAJE);

  // SCTR - Solo si el empleado tiene activado SCTR (Ley 26790, D.S. 009-97-SA)
  // Tasas configurables según nivel de riesgo de la actividad económica:
  // - Nivel I (bajo): 0.63%
  // - Nivel II (moderado): 1.23%
  // - Nivel III (alto): 1.53%
  // - Nivel IV (muy alto): 1.83%
  // Las tasas se configuran en planillas.config.ts o vía variables de entorno
  const sctrSaludEmpleador = empleado.sctr
    ? round2(remuneracionAfecta * SCTR_SALUD_TASA)
    : 0;
  const sctrPensionEmpleador = empleado.sctr
    ? round2(remuneracionAfecta * SCTR_PENSION_TASA)
    : 0;

  // VIDA LEY - Obligatorio desde primer día (D.U. 044-2019)
  // Prima configurable según aseguradora (típico 0.5% - 1.5%)
  // La tasa se configura en planillas.config.ts o vía PLANILLA_VIDA_LEY_TASA
  const vidaLeyEmpleador = round2(remuneracionAfecta * VIDA_LEY_TASA);
  const totalAportesEmpleador = round2(
    essaludEmpleador +
      sctrSaludEmpleador +
      sctrPensionEmpleador +
      vidaLeyEmpleador,
  );

  // =============================================
  // REMUNERACIÓN COMPUTABLE (según tipo de beneficio)
  // =============================================
  // Para Vacaciones: sueldo base
  const remComputableVacaciones = sueldoBase;

  // Para Gratificación: sueldo + asig.familiar + promedios de remuneraciones variables
  const remComputableGratificacion =
    gratBase +
    promedios.promedioHorasExtras +
    promedios.promedioComisiones +
    promedios.promedioBonificaciones;

  // 1/6 de gratificación para CTS
  const sextoGratificacion =
    promedios.ultimaGratificacion > 0
      ? round2(promedios.ultimaGratificacion / 6)
      : round2(gratBase / 6);

  // Para CTS: sueldo + asig.familiar + 1/6 gratificación + promedios
  const remComputableCts =
    ctsBase +
    sextoGratificacion +
    promedios.promedioHorasExtras +
    promedios.promedioComisiones;

  // Para AFP: remuneración afecta del mes
  const remComputableAfp = remuneracionAfecta;
  // Para Renta 5ta: remuneración afecta del mes
  const remComputableRenta = remuneracionAfecta;

  // Promedios históricos para el detalle
  const promedioHorasExtrasVal = promedios.promedioHorasExtras;
  const promedioComisionesVal = promedios.promedioComisiones;

  // Usar la bonificación extraordinaria calculada o la base si no es mes de gratificación
  const bonifExtraordinaria =
    bonifExtraordinariaMonto > 0
      ? bonifExtraordinariaMonto
      : round2(gratBase * ESSALUD_PORCENTAJE);
  const treintavoDiario = round2(sueldoBase / 30);

  // CTS - usar valores calculados
  const mesesCts = mesesCtsCalc;
  const diasCts = diasCtsCalc;
  const ctsPeriodo = ctsMonto; // El monto calculado de CTS

  // =============================================
  // BENEFICIOS TRUNCOS (para empleados que cesan)
  // =============================================
  const fechaCeseJs = empleado.fecha_cese
    ? leerFechaPrisma(empleado.fecha_cese).toJSDate()
    : null;
  const empleadoCesa =
    diasCesadoNoLab > 0 ||
    (fechaCeseJs &&
      fechaCeseJs >= fechaInicioPeriodo &&
      fechaCeseJs <= fechaFinPeriodo);

  const truncos = calcularBeneficiosTruncos(
    !!empleadoCesa,
    mes,
    diasTrabajados,
    remComputableCts,
    remComputableGratificacion,
    sueldoBase,
    !!empleado.asignacion_familiar,
    !!empleado.fecha_ingreso,
  );
  const { ctsTrunca, gratTrunca, vacTruncas, totalBeneficiosSociales } =
    truncos;

  // =============================================
  // NETO A PAGAR
  // =============================================
  const netoPagar = round2(totalIngresos - totalDescuentos);
  const netoMes = netoPagar;

  return {
    // =============================================
    // DÍAS DEL PERÍODO
    // =============================================
    total_dias: totalDias,
    dias_trabajados: diasTrabajados,
    dias_no_laborados: diasNoTrabajados,
    dias_cesado_no_lab: diasCesadoNoLab,
    dias_nuevo_no_lab: diasNuevoNoLab,
    dias_sin_cobertura: diasSinCobertura,
    dias_falta: diasFalta,
    dias_suspension: diasSuspension,
    dias_vacaciones: diasVacaciones,
    dias_subsidio: diasSubsidio,
    dias_subsidio_incapacidad: diasSubsidioIncapacidad,
    dias_subsidio_maternidad: diasSubsidioMaternidad,
    dias_descanso_medico: diasDescansoMedico,
    dias_licencia_sin_goce: diasLicenciaSinGoce,
    dias_licencia_fallecimiento: diasLicenciaFallecimiento,
    dias_licencia_paternidad: diasLicenciaPaternidad,
    dias_licencia_con_goce: diasLicenciaConGoce,
    turno_dia: turnoDia,
    turno_noche: turnoNoche,
    horas_8: horas8,
    cantidad_feriados: cantidadFeriados,
    // Nuevas nomenclaturas
    dias_descanso_trabajado: diasDescansoTrabajado, // DT
    dias_horas_extra: diasHorasExtra, // E - Días con horas extras
    dias_falta_justificada: diasFaltaJustificada, // FJ
    dias_permiso: diasPermiso, // P
    dias_pegada: diasPegada, // PG - Pegada/Reenganche
    dias_retenido: diasRetenido, // RET
    minutos_tardanza: minutosTardanza, // T
    dias_feriado_no_trabajado: diasFeriadoNoTrabajado, // H
    tiene_adelanto_quincenal: tieneAdelantoQuincenal, // Q

    // =============================================
    // ESTRUCTURA (bases salariales)
    // =============================================
    rem_basica: round2(remBasica),
    bono_productividad_base: round2(bonoProductividadBase),
    bono_desempeno_base: round2(bonoDesempenoBase),
    bono_movilidad_base: round2(bonoMovilidadBase),
    bono_refrigerio_base: round2(bonoRefrigerioBase),
    asig_fam_cliente_base: round2(asigFamClienteBase),
    he_25_estructura: round2(he25Estructura),
    he_35_estructura: round2(he35Estructura),
    bonif_nocturna_base: round2(bonifNocturnaBase),
    vac_base: round2(vacBase),
    grat_base: round2(gratBase),
    cts_base: round2(ctsBase),
    bono_armado_base: round2(bonoArmadoBase),
    total_sueldo_estructura: round2(totalSueldoEstructura),
    diferencia_estructura: round2(diferenciaEstructura),
    por_dias_trab: round2(porDiasTrab),
    sueldo_neto_estructura: round2(sueldoNetoEstructura),

    // =============================================
    // INGRESOS AFECTOS
    // =============================================
    sueldo_base: round2(sueldoBase),
    sueldo_proporcional: round2(sueldoProporcional),
    haber_mensual: round2(haberMensual),
    sueldo_nocturno: round2(sueldoNocturno),
    pasaje_especial: round2(pasajeEspecial),
    horas_extras: round2(horasExtras),
    horas_extras_25: round2(horasExtras25),
    horas_extras_35: round2(horasExtras35),
    feriado_trabajado: round2(feriadoTrabajado),
    descanso_trabajado_monto: round2(descansoTrabajadoMonto), // DT
    descanso_medico_monto: round2(descansoMedicoMonto),
    subsidio_incapacidad: round2(subsidioIncapacidadMonto),
    subsidio_maternidad: round2(subsidioMaternidadMonto),
    asignacion_familiar: round2(asignacionFamiliar),
    licencia_goce_monto: round2(licenciaGoceMonto),
    bonificaciones: round2(bonificaciones),
    bonificacion_nocturna: round2(bonificacionNocturna),
    vacaciones_ingreso: round2(vacacionesIngreso),
    gratificacion_ingreso: round2(gratificacionIngreso),
    cts_ingreso: round2(ctsIngreso),
    bono_armado_ingreso: round2(bonoArmadoIngreso),
    otros_ingresos: round2(otrosIngresos),

    // =============================================
    // INGRESOS NO AFECTOS
    // =============================================
    remuneracion_vacacional: round2(remuneracionVacacional),
    compensacion_vacacional: round2(compensacionVacacional),
    cts_monto: round2(ctsMonto),
    gratificacion_monto: round2(gratificacionMonto),
    movilidad: round2(movilidad),
    refrigerio: round2(refrigerio),
    bono_desempeno_monto: round2(bonoDesempenoMonto),
    asignacion_cliente: round2(asignacionCliente),
    pegada_reenganche: round2(pegadaReenganche),
    bono_productividad_monto: round2(bonoProductividadMonto),
    bono_armado_monto: round2(bonoArmadoMonto),
    bono_referido: round2(bonoReferido),
    bonos_modulo: round2(bonosModulo),
    reintegro_dias_trab: round2(reintegroDiasTrab),
    reintegro_inafecto: round2(reintegroInafecto),
    ingreso_sobregiro: round2(ingresoSobregiro),
    venta_vacaciones: round2(ventaVacaciones),

    // =============================================
    // DESCUENTOS OBLIGATORIOS
    // =============================================
    afp_aporte: round2(afpAporte),
    afp_comision: round2(afpComision),
    afp_seguro: round2(afpSeguro),
    afp_prima: round2(afpPrima),
    onp: round2(onp),
    essalud: round2(essalud),
    renta_5ta: round2(renta5ta),

    // =============================================
    // DESCUENTOS - ADELANTOS
    // =============================================
    adelantos: round2(adelantos),
    adelanto_quincena: round2(adelantoQuincena),
    adelanto_vacacional: round2(adelantoVacacional),
    otros_adelantos: round2(otrosAdelantos),
    adelanto_cts: round2(adelantoCts),
    adelanto_gratificacion: round2(adelantoGratificacion),

    // =============================================
    // DESCUENTOS - OTROS
    // =============================================
    prestamos: round2(prestamos),
    prestamo: round2(prestamo),
    otros_descuentos: round2(otrosDescuentos),
    descuento_faltas: round2(descuentoFaltas),
    descuento_permisos: round2(descuentoPermisos), // P - Permiso sin goce
    descuento_tardanzas: round2(descuentoTardanzas), // T - Tardanzas
    descuento_sobregiro: round2(descuentoSobregiro),
    descuento_reintegro: round2(descuentoReintegro),
    retencion_judicial: round2(retencionJudicial),
    descuento_feriado: round2(descuentoFeriado),
    sctr: round2(sctr),
    quinta_categoria: round2(quintaCategoria),

    // =============================================
    // TOTALES
    // =============================================
    total_ingresos_afectos: round2(totalIngresosAfectos),
    total_ingresos_no_afectos: round2(totalIngresosNoAfectos),
    total_ingresos: round2(totalIngresos),
    total_descuentos: round2(totalDescuentos),
    total_descuentos_ley: round2(totalDescuentosLey),
    total_descuentos_otros: round2(totalDescuentosOtros),
    remuneracion_afecta: round2(remuneracionAfecta),
    neto_pagar: round2(netoPagar),
    neto_mes: round2(netoMes),
    total_haberes: round2(totalHaberes),

    // =============================================
    // APORTES EMPLEADOR
    // =============================================
    essalud_empleador: round2(essaludEmpleador),
    sctr_salud_empleador: round2(sctrSaludEmpleador),
    sctr_pension_empleador: round2(sctrPensionEmpleador),
    vida_ley_empleador: round2(vidaLeyEmpleador),
    total_aportes_empleador: round2(totalAportesEmpleador),

    // =============================================
    // REMUNERACIÓN COMPUTABLE
    // =============================================
    rem_computable_vacaciones: round2(remComputableVacaciones),
    rem_computable_gratificacion: round2(remComputableGratificacion),
    rem_computable_cts: round2(remComputableCts),
    rem_computable_afp: round2(remComputableAfp),
    rem_computable_renta: round2(remComputableRenta),
    promedio_horas_extras: round2(promedioHorasExtrasVal),
    promedio_comisiones: round2(promedioComisionesVal),
    sexto_gratificacion: round2(sextoGratificacion),
    bonif_extraordinaria: round2(bonifExtraordinaria),
    treintavo_diario: round2(treintavoDiario),
    meses_cts: mesesCts,
    dias_cts: diasCts,
    cts_periodo: round2(ctsPeriodo),
    cts_trunca: round2(ctsTrunca),
    grat_trunca: round2(gratTrunca),
    vac_truncas: round2(vacTruncas),
    total_beneficios_sociales: round2(totalBeneficiosSociales),

    // =============================================
    // OBSERVACIONES
    // =============================================
    observaciones: '',
  };
}
