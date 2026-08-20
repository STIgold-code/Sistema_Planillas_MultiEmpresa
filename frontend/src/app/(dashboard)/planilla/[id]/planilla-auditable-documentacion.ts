/**
 * Contenido de la hoja "Cómo se calcula": los conceptos que NO se reducen a una
 * sola fórmula de celda, explicados con su norma. Vive aparte del generador del
 * libro para que ese archivo siga siendo código y no un muro de texto legal.
 */

export interface PasoCalculo {
  titulo: string;
  detalle: string;
}

export interface ConceptoDocumentado {
  concepto: string;
  base_legal: string;
  resumen: string;
  pasos: PasoCalculo[];
  nota?: string;
}

export const CONCEPTOS_DOCUMENTADOS: readonly ConceptoDocumentado[] = [
  {
    concepto: 'Gratificación (julio y diciembre)',
    base_legal: 'Ley 27735 · D.S. 005-2002-TR arts. 3.2, 3.4 y 4',
    resumen:
      'Una remuneración por semestre, proporcional a los meses efectivamente laborados.',
    pasos: [
      {
        titulo: '1. Remuneración computable',
        detalle:
          'Remuneración básica vigente al 30 de junio o al 30 de noviembre, según el semestre, más la asignación familiar y el promedio de las remuneraciones variables o imprecisas percibidas en el semestre (art. 3.2). No se recalcula con el sueldo del mes de pago.',
      },
      {
        titulo: '2. Meses computables',
        detalle:
          'Un sexto por cada mes calendario completo laborado en el semestre. El mes se pierde solo por días NO considerados tiempo efectivamente laborado (art. 3.4): faltas, suspensión de labores y licencia sin goce. Vacaciones, subsidios y licencias con goce sí computan (art. 2).',
      },
      {
        titulo: '3. Gratificación',
        detalle:
          'Remuneración computable ÷ 6 × meses computables. Si el semestre está completo, equivale a una remuneración íntegra.',
      },
      {
        titulo: '4. Bonificación extraordinaria',
        detalle:
          'La gratificación está inafecta a aportes (art. 4 y Ley 30334). Lo que el empleador habría aportado a EsSalud se entrega al trabajador como bonificación extraordinaria: gratificación × tasa de EsSalud. Figura en la hoja de fórmulas como columna BON. EXT.',
      },
    ],
    nota: 'Al cese se paga la gratificación TRUNCA por los meses del semestre en curso.',
  },
  {
    concepto: 'Renta de quinta categoría',
    base_legal:
      'LIR arts. 46 y 75 · D.S. 122-94-EF art. 40 incisos a) y e) · Ley 30334',
    resumen:
      'Retención mensual sobre la proyección anual de la remuneración, no sobre el sueldo del mes.',
    pasos: [
      {
        titulo: '1. Proyección anual (art. 40 inc. a)',
        detalle:
          'Remuneración del mes × los meses que faltan del ejercicio (incluido el mes que se calcula), más las remuneraciones ya percibidas en los meses anteriores y las 2 gratificaciones ordinarias del ejercicio.',
      },
      {
        titulo: '2. Deducción de 7 UIT (LIR art. 46)',
        detalle:
          'A la renta bruta proyectada se le restan 7 UIT. Si el resultado es cero o menor, no hay retención.',
      },
      {
        titulo: '3. Impuesto anual por tramos',
        detalle:
          'Se aplica la escala progresiva acumulativa sobre la renta neta: 8 % hasta 5 UIT, 14 % de 5 a 20 UIT, 17 % de 20 a 35 UIT, 20 % de 35 a 45 UIT y 30 % por el exceso.',
      },
      {
        titulo: '4. Retención del mes',
        detalle:
          'El impuesto anual se divide entre los meses del ejercicio según la fracción que corresponde al mes (art. 40) y se le restan las retenciones ya efectuadas en meses anteriores.',
      },
      {
        titulo: '5. Ingresos extraordinarios (art. 40 inc. e)',
        detalle:
          'La bonificación extraordinaria de la Ley 30334 NO entra en la proyección: se grava íntegra en el mes en que se percibe. Su inafectación alcanza a EsSalud, ONP y AFP, no al impuesto a la renta.',
      },
    ],
  },
  {
    concepto: 'Horas extras',
    base_legal: 'D.S. 007-2002-TR arts. 10 y 11',
    resumen:
      'Sobretasa mínima de 25 % por las dos primeras horas y 35 % por las restantes.',
    pasos: [
      {
        titulo: '1. Valor hora ordinaria',
        detalle:
          'Remuneración básica ÷ 30 ÷ jornada diaria (8 horas). En la hoja de fórmulas es la base de las columnas HE 25 % y HE 35 % del bloque ESTRUCTURA SALARIAL.',
      },
      {
        titulo: '2. Sobretasa (art. 10)',
        detalle:
          'Las dos primeras horas extras de la jornada se pagan con un recargo mínimo de 25 %; a partir de la tercera, 35 %. El convenio puede mejorar estos porcentajes, nunca reducirlos.',
      },
      {
        titulo: '3. Trabajo en horario nocturno (art. 8)',
        detalle:
          'Si la hora extra cae en horario nocturno, la sobretasa se aplica sobre el valor hora ya incrementado por la bonificación nocturna.',
      },
      {
        titulo: '4. Importe del mes (art. 11)',
        detalle:
          'Valor hora con sobretasa × horas extras registradas en el tareo del período. El resultado son las columnas HE 25 % y HE 35 % del bloque INGRESOS AFECTOS.',
      },
    ],
  },
  {
    concepto: 'Descuento dominical',
    base_legal: 'D.Leg. 713 art. 4',
    resumen:
      'La ausencia injustificada recorta, además del día no trabajado, la parte proporcional del descanso semanal remunerado.',
    pasos: [
      {
        titulo: '1. Qué se recorta',
        detalle:
          'El día no laborado ya quedó fuera del haber del mes, porque el sueldo se devenga sobre los días efectivamente trabajados. El descuento dominical es un concepto DISTINTO: alcanza al séptimo día (descanso semanal) de la semana en la que se produjo la ausencia.',
      },
      {
        titulo: '2. Proporción',
        detalle:
          'El descanso semanal se reduce en tantos sextos como días de ausencia sin goce tuvo esa semana. Con seis o más días de ausencia se pierde el descanso completo.',
      },
      {
        titulo: '3. Importe',
        detalle:
          'Valor del día (remuneración básica ÷ 30) × la fracción perdida, sumado por todas las semanas del período. Figura en la hoja de fórmulas como columna D. DOMIN., dentro de OTROS DESC.',
      },
    ],
    nota: 'Solo se aplica si el trabajador tiene días devengados en el período: sin días trabajados no hay descanso que recortar.',
  },
];
