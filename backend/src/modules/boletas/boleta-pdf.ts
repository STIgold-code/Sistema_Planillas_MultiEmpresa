import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { Boleta, PlanillaDetalle } from '@prisma/client';
import { LOGO_ERMIR_PATH } from '../../common/utils/assets.util';

/**
 * Datos del empleado requeridos para dibujar la boleta.
 * Las relaciones (cargo, regimen_pensionario, banco_haberes) llegan según el
 * `include` de cada consulta, por eso se modelan como parciales opcionales.
 */
export interface EmpleadoBoletaPdf {
  apellido_paterno: string;
  apellido_materno: string | null;
  nombres: string;
  numero_documento: string | null;
  fecha_ingreso: Date | null;
  estado: string | null;
  // El número de cuenta de haberes aún no existe como campo del modelo Empleado;
  // se mantiene opcional para no romper el contrato cuando la consulta no lo provee.
  numero_cuenta_haberes?: string | null;
  cargo?: { nombre: string } | null;
  regimen_pensionario?: { nombre: string | null; tipo: string | null } | null;
  banco_haberes?: { nombre: string } | null;
}

/**
 * Datos de la empresa requeridos para dibujar la boleta.
 */
export interface EmpresaBoletaPdf {
  razon_social: string;
  ruc: string;
  direccion: string | null;
  logo_url: string | null;
  firma_representante_url: string | null;
}

/**
 * Dibuja una boleta individual en formato A4 horizontal - FORMATO ERMIR v2
 * Diseño aprobado: Paleta monocromática + 3 columnas (INGRESOS | AFP/ONP | DESCUENTOS)
 */
export function dibujarBoletaA4(
  doc: PDFKit.PDFDocument,
  startX: number,
  startY: number,
  boleta: Boleta,
  detalle: PlanillaDetalle,
  empleado: EmpleadoBoletaPdf,
  empresa: EmpresaBoletaPdf,
  anchoTotal: number,
  altoTotal: number,
  tipoCopia: 'EMPLEADOR' | 'EMPLEADO',
) {
  // =============================================
  // CONFIGURACIÓN DE ESTILOS - PALETA MONOCROMÁTICA
  // =============================================
  const titleFont = 'Helvetica-Bold';
  const normalFont = 'Helvetica';
  const lineWidth = 0.5;
  doc.lineWidth(lineWidth);

  // Paleta monocromática ERMIR (coherente con logo negro)
  const COLOR_NEGRO = '#000000';
  const COLOR_GRIS_OSCURO = '#333333';
  const COLOR_GRIS = '#999999';
  const COLOR_GRIS_CLARO = '#e0e0e0';
  const COLOR_GRIS_MUY_CLARO = '#f5f5f5';
  const COLOR_BLANCO = '#FFFFFF';

  // Helper: Formatear monto con separador de miles
  const formatMonto = (valor: number): string => {
    return valor.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper: Formatear fecha dd/mm/yyyy
  const formatFecha = (fecha: Date): string => {
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const y = fecha.getFullYear();
    return `${d}/${m}/${y}`;
  };

  let y = startY;

  // =============================================
  // HEADER: Logo + Empresa + Código
  // =============================================
  const logoPath = LOGO_ERMIR_PATH;
  const logoSize = 40;

  // Etiqueta EMPLEADOR/EMPLEADO (esquina superior derecha)
  doc.font(normalFont).fontSize(7).fillColor(COLOR_GRIS);
  doc.text(tipoCopia, startX + anchoTotal - 60, y, {
    width: 55,
    align: 'right',
  });

  // Dibujar logo
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, startX + 4, y + 4, {
        width: logoSize,
        height: logoSize,
      });
    } catch (e) {
      console.error('[BOLETA_PDF] Error cargando logo:', e);
    }
  }

  // Nombre empresa y RUC
  const empresaX = startX + logoSize + 12;
  const empresaW = anchoTotal - logoSize - 80;

  doc.font(titleFont).fontSize(11).fillColor(COLOR_NEGRO);
  doc.text(empresa.razon_social.toUpperCase(), empresaX, y + 6, {
    width: empresaW,
  });
  doc.font(normalFont).fontSize(8).fillColor(COLOR_GRIS_OSCURO);
  doc.text(`RUC: ${empresa.ruc}`, empresaX, y + 19);

  // Recuadro CÓDIGO + ID Empleado
  const codigoX = startX + anchoTotal - 50;
  doc.strokeColor(COLOR_NEGRO).lineWidth(1.5);
  doc.rect(codigoX, y + 8, 45, 30).stroke();
  doc.font(normalFont).fontSize(6).fillColor(COLOR_GRIS_OSCURO);
  doc.text('CÓDIGO', codigoX, y + 11, { width: 45, align: 'center' });
  doc.font(titleFont).fontSize(14).fillColor(COLOR_NEGRO);
  doc.text(String(boleta.empleado_id), codigoX, y + 21, {
    width: 45,
    align: 'center',
  });
  doc.lineWidth(lineWidth);

  y += logoSize + 10;

  // =============================================
  // TÍTULO: BOLETA DE REMUNERACIONES
  // =============================================
  const rowH = 14;
  doc.strokeColor(COLOR_NEGRO).lineWidth(1.5);
  doc.rect(startX, y, anchoTotal, rowH).fill(COLOR_GRIS_MUY_CLARO).stroke();
  doc.fillColor(COLOR_NEGRO);
  doc.font(titleFont).fontSize(10);
  doc.text('BOLETA DE REMUNERACIONES', startX, y + 3, {
    width: anchoTotal,
    align: 'center',
  });
  doc.lineWidth(lineWidth);
  y += rowH + 2;

  // =============================================
  // PERÍODO (MES | fecha inicio | AL | fecha fin)
  // =============================================
  const primerDia = new Date(boleta.anio, boleta.mes - 1, 1);
  const ultimoDia = new Date(boleta.anio, boleta.mes, 0);

  doc.font(titleFont).fontSize(8).fillColor(COLOR_NEGRO);
  doc.text('MES', startX + 10, y + 2);
  doc.strokeColor(COLOR_GRIS_OSCURO);
  doc.rect(startX + 35, y, 70, 13).stroke();
  doc.font(normalFont).fontSize(8);
  doc.text(formatFecha(primerDia), startX + 40, y + 3);

  doc.font(titleFont).fontSize(8);
  doc.text('AL', startX + 115, y + 2);
  doc.rect(startX + 130, y, 70, 13).stroke();
  doc.font(normalFont).fontSize(8);
  doc.text(formatFecha(ultimoDia), startX + 135, y + 3);

  y += 17;

  // =============================================
  // DATOS DEL EMPLEADO - FILA 1
  // Columnas: NOMBRES 40% | CARGO 25% | DNI 15% | REG.PENSIÓN 20%
  // =============================================
  const datosRowH = 18;
  const col1 = anchoTotal * 0.4;
  const col2 = anchoTotal * 0.25;
  const col3 = anchoTotal * 0.15;
  const col4 = anchoTotal * 0.2;

  doc.strokeColor(COLOR_NEGRO);
  doc.rect(startX, y, anchoTotal, datosRowH).stroke();

  // Helper para dibujar celda de datos
  const drawDatoCell = (
    x: number,
    w: number,
    label: string,
    valor: string,
    isLast = false,
  ) => {
    doc.font(normalFont).fontSize(6).fillColor(COLOR_GRIS);
    doc.text(label, x + 3, y + 2, { width: w - 6 });
    doc.font(titleFont).fontSize(7.5).fillColor(COLOR_NEGRO);
    doc.text(valor, x + 3, y + 9, { width: w - 6 });
    if (!isLast) {
      doc.strokeColor(COLOR_GRIS);
      doc
        .moveTo(x + w, y)
        .lineTo(x + w, y + datosRowH)
        .stroke();
    }
  };

  // APELLIDOS Y NOMBRES
  const nombreCompleto =
    `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`.toUpperCase();
  const nombreTruncado =
    nombreCompleto.length > 32
      ? nombreCompleto.substring(0, 30) + '..'
      : nombreCompleto;
  drawDatoCell(startX, col1, 'APELLIDOS Y NOMBRES', nombreTruncado);

  // CARGO
  const cargoNombre = (empleado.cargo?.nombre || '-').toUpperCase();
  const cargoTruncado =
    cargoNombre.length > 16 ? cargoNombre.substring(0, 14) + '..' : cargoNombre;
  drawDatoCell(startX + col1, col2, 'CARGO', cargoTruncado);

  // DNI
  drawDatoCell(
    startX + col1 + col2,
    col3,
    'DNI',
    empleado.numero_documento || '-',
  );

  // REG. PENSIÓN
  const regimenTipo = empleado.regimen_pensionario?.tipo || '';
  const regimenNombre =
    (empleado.regimen_pensionario?.nombre || '').split(' ')[0] || '';
  const regimenCorto = regimenTipo
    ? `${regimenTipo} ${regimenNombre}`.substring(0, 12)
    : '-';
  drawDatoCell(
    startX + col1 + col2 + col3,
    col4,
    'REG. PENSIÓN',
    regimenCorto.toUpperCase(),
    true,
  );

  y += datosRowH;

  // =============================================
  // DATOS DEL EMPLEADO - FILA 2
  // Columnas: F/INGRESO 25% | CONDICIÓN 25% | SUELDO BASE 25% | BANCO/CTA 25%
  // =============================================
  const col2W = anchoTotal / 4;

  doc.strokeColor(COLOR_NEGRO);
  doc.rect(startX, y, anchoTotal, datosRowH).stroke();

  // F/INGRESO
  let fechaIngresoStr = '-';
  if (empleado.fecha_ingreso) {
    const fi = new Date(empleado.fecha_ingreso);
    fechaIngresoStr = formatFecha(fi);
  }
  drawDatoCell(startX, col2W, 'F/INGRESO', fechaIngresoStr);

  // CONDICIÓN
  const condicion =
    empleado.estado === 'ACTIVO' ? 'ACTIVO' : empleado.estado || '-';
  drawDatoCell(startX + col2W, col2W, 'CONDICIÓN', condicion);

  // SUELDO BASE
  const sueldoBase =
    Number(detalle.sueldo_base) || Number(detalle.haber_mensual) || 0;
  drawDatoCell(
    startX + col2W * 2,
    col2W,
    'SUELDO BASE',
    `S/. ${formatMonto(sueldoBase)}`,
  );

  // BANCO / CTA
  const bancoNombre = empleado.banco_haberes?.nombre || '';
  const ctaBanco = empleado.numero_cuenta_haberes || '';
  const bancoCta = bancoNombre
    ? `${bancoNombre.substring(0, 4)} ${ctaBanco.substring(0, 8)}..`
    : '-';
  drawDatoCell(startX + col2W * 3, col2W, 'BANCO / CTA', bancoCta, true);

  y += datosRowH + 4;

  // =============================================
  // SECCIÓN DE DÍAS (2 columnas con 4 filas cada una)
  // =============================================
  const diasColW = anchoTotal / 2;
  const diasRowH = 44; // Altura para 4 filas de datos
  const diasLineH = 10;

  // Calcular valores
  const diasSubsid =
    (detalle.dias_subsidio_incapacidad || 0) +
    (detalle.dias_subsidio_maternidad || 0) +
    (detalle.dias_subsidio || 0);

  // Fondo gris claro para toda la sección
  doc.rect(startX, y, anchoTotal, diasRowH).fill(COLOR_GRIS_MUY_CLARO);
  doc.strokeColor(COLOR_GRIS);
  doc.rect(startX, y, anchoTotal, diasRowH).stroke();

  // Separador vertical entre columnas
  doc
    .moveTo(startX + diasColW, y)
    .lineTo(startX + diasColW, y + diasRowH)
    .stroke();

  // Helper para dibujar item de días
  const drawDiasItem = (
    colIndex: number,
    rowIndex: number,
    label: string,
    value: string | number,
  ) => {
    const padding = 5;
    const colX = startX + diasColW * colIndex + padding;
    const itemY = y + 4 + rowIndex * diasLineH;
    const valueWidth = 30;
    const labelWidth = diasColW - valueWidth - padding * 2;

    doc.font(normalFont).fontSize(7).fillColor(COLOR_GRIS_OSCURO);
    doc.text(label, colX, itemY, { width: labelWidth });
    doc.font(titleFont).fontSize(8).fillColor(COLOR_NEGRO);
    doc.text(String(value), colX + labelWidth, itemY, {
      width: valueWidth - padding,
      align: 'right',
    });
  };

  // Columna izquierda
  drawDiasItem(0, 0, 'DÍAS TRABAJADOS', detalle.dias_trabajados || 0);
  drawDiasItem(0, 1, 'DÍAS VACACIONES', detalle.dias_vacaciones || 0);
  drawDiasItem(0, 2, 'DÍAS FALTAS', detalle.dias_falta || 0);
  drawDiasItem(0, 3, 'DÍAS D. MÉDICO', detalle.dias_descanso_medico || 0);

  // Columna derecha
  drawDiasItem(1, 0, 'DÍAS SUBSIDIO', diasSubsid);
  drawDiasItem(1, 1, 'FERIADOS TRAB.', detalle.cantidad_feriados || 0);
  drawDiasItem(1, 2, 'TURNO DÍA', detalle.turno_dia || 0);
  drawDiasItem(1, 3, 'TURNO NOCHE', detalle.turno_noche || 0);

  y += diasRowH + 4;

  // =============================================
  // CONCEPTOS DE PAGO (3 COLUMNAS: INGRESOS | AFP/ONP | DESCUENTOS)
  // =============================================
  const col3W = anchoTotal / 3;
  const conceptColW = col3W - 45;
  const montoColW = 40;
  const conceptRowH = 10;
  const headerH = 14;

  // Encabezados con fondo negro
  doc.strokeColor(COLOR_NEGRO);
  doc.rect(startX, y, col3W, headerH).fill(COLOR_NEGRO);
  doc.rect(startX + col3W, y, col3W, headerH).fill(COLOR_NEGRO);
  doc.rect(startX + col3W * 2, y, col3W, headerH).fill(COLOR_NEGRO);

  doc.fillColor(COLOR_BLANCO);
  doc.font(titleFont).fontSize(8);
  doc.text('INGRESOS', startX, y + 3, { width: col3W, align: 'center' });
  doc.text('AFP / ONP', startX + col3W, y + 3, {
    width: col3W,
    align: 'center',
  });
  doc.text('DESCUENTOS', startX + col3W * 2, y + 3, {
    width: col3W,
    align: 'center',
  });
  y += headerH;

  // ========== PREPARAR INGRESOS (TODOS los campos dinámicos) ==========
  const ingresos: { concepto: string; monto: number }[] = [];

  // Ingresos Afectos (sujetos a descuentos)
  if (Number(detalle.haber_mensual) > 0)
    ingresos.push({
      concepto: 'SUELDO BÁSICO',
      monto: Number(detalle.haber_mensual),
    });
  if (Number(detalle.sueldo_base) > 0 && !Number(detalle.haber_mensual))
    ingresos.push({
      concepto: 'SUELDO BASE',
      monto: Number(detalle.sueldo_base),
    });
  if (Number(detalle.sueldo_proporcional) > 0)
    ingresos.push({
      concepto: 'SUELDO PROPORCIONAL',
      monto: Number(detalle.sueldo_proporcional),
    });
  if (Number(detalle.sueldo_nocturno) > 0)
    ingresos.push({
      concepto: 'SUELDO NOCTURNO',
      monto: Number(detalle.sueldo_nocturno),
    });
  if (Number(detalle.asignacion_familiar) > 0)
    ingresos.push({
      concepto: 'ASIG. FAMILIAR',
      monto: Number(detalle.asignacion_familiar),
    });
  if (Number(detalle.horas_extras) > 0)
    ingresos.push({
      concepto: 'HORAS EXTRAS',
      monto: Number(detalle.horas_extras),
    });
  if (Number(detalle.horas_extras_25) > 0)
    ingresos.push({
      concepto: 'HRS. EXTRAS 25%',
      monto: Number(detalle.horas_extras_25),
    });
  if (Number(detalle.horas_extras_35) > 0)
    ingresos.push({
      concepto: 'HRS. EXTRAS 35%',
      monto: Number(detalle.horas_extras_35),
    });
  if (Number(detalle.feriado_trabajado) > 0)
    ingresos.push({
      concepto: 'FERIADO TRABAJADO',
      monto: Number(detalle.feriado_trabajado),
    });
  if (Number(detalle.bonificacion_nocturna) > 0)
    ingresos.push({
      concepto: 'BONIF. NOCTURNA',
      monto: Number(detalle.bonificacion_nocturna),
    });
  if (Number(detalle.bonificaciones) > 0)
    ingresos.push({
      concepto: 'BONIFICACIONES',
      monto: Number(detalle.bonificaciones),
    });
  if (Number(detalle.descanso_medico_monto) > 0)
    ingresos.push({
      concepto: 'DESCANSO MÉDICO',
      monto: Number(detalle.descanso_medico_monto),
    });
  if (Number(detalle.subsidio_incapacidad) > 0)
    ingresos.push({
      concepto: 'SUBSIDIO INCAPACIDAD',
      monto: Number(detalle.subsidio_incapacidad),
    });
  if (Number(detalle.subsidio_maternidad) > 0)
    ingresos.push({
      concepto: 'SUBSIDIO MATERNIDAD',
      monto: Number(detalle.subsidio_maternidad),
    });
  if (Number(detalle.licencia_goce_monto) > 0)
    ingresos.push({
      concepto: 'LIC. CON GOCE',
      monto: Number(detalle.licencia_goce_monto),
    });
  if (Number(detalle.pasaje_especial) > 0)
    ingresos.push({
      concepto: 'PASAJE ESPECIAL',
      monto: Number(detalle.pasaje_especial),
    });

  // Ingresos No Afectos
  if (Number(detalle.remuneracion_vacacional) > 0)
    ingresos.push({
      concepto: 'SUELDO VACACIONAL',
      monto: Number(detalle.remuneracion_vacacional),
    });
  if (Number(detalle.compensacion_vacacional) > 0)
    ingresos.push({
      concepto: 'BONIF. POR VACACIONES',
      monto: Number(detalle.compensacion_vacacional),
    });
  if (Number(detalle.vacaciones_ingreso) > 0)
    ingresos.push({
      concepto: 'VACACIONES',
      monto: Number(detalle.vacaciones_ingreso),
    });
  if (Number(detalle.venta_vacaciones) > 0)
    ingresos.push({
      concepto: 'VENTA VACACIONES',
      monto: Number(detalle.venta_vacaciones),
    });
  if (Number(detalle.gratificacion_monto) > 0)
    ingresos.push({
      concepto: 'GRATIFICACIÓN',
      monto: Number(detalle.gratificacion_monto),
    });
  if (
    Number(detalle.gratificacion_ingreso) > 0 &&
    !Number(detalle.gratificacion_monto)
  )
    ingresos.push({
      concepto: 'GRATIFICACIÓN',
      monto: Number(detalle.gratificacion_ingreso),
    });
  if (Number(detalle.bonif_extraordinaria) > 0)
    ingresos.push({
      concepto: 'BONIF. EXTRAORD. GRAT.',
      monto: Number(detalle.bonif_extraordinaria),
    });
  if (Number(detalle.cts_monto) > 0)
    ingresos.push({ concepto: 'CTS', monto: Number(detalle.cts_monto) });
  if (Number(detalle.cts_ingreso) > 0 && !Number(detalle.cts_monto))
    ingresos.push({ concepto: 'CTS', monto: Number(detalle.cts_ingreso) });
  if (Number(detalle.movilidad) > 0)
    ingresos.push({
      concepto: 'MOVILIDAD',
      monto: Number(detalle.movilidad),
    });
  if (Number(detalle.refrigerio) > 0)
    ingresos.push({
      concepto: 'REFRIGERIO',
      monto: Number(detalle.refrigerio),
    });
  if (Number(detalle.asignacion_cliente) > 0)
    ingresos.push({
      concepto: 'ASIG. CLIENTE',
      monto: Number(detalle.asignacion_cliente),
    });
  if (Number(detalle.bono_productividad_monto) > 0)
    ingresos.push({
      concepto: 'BONO PRODUCTIVIDAD',
      monto: Number(detalle.bono_productividad_monto),
    });
  if (Number(detalle.bono_desempeno_monto) > 0)
    ingresos.push({
      concepto: 'BONO DESEMPEÑO',
      monto: Number(detalle.bono_desempeno_monto),
    });
  if (Number(detalle.bono_armado_monto) > 0)
    ingresos.push({
      concepto: 'BONO ARMADO',
      monto: Number(detalle.bono_armado_monto),
    });
  if (
    Number(detalle.bono_armado_ingreso) > 0 &&
    !Number(detalle.bono_armado_monto)
  )
    ingresos.push({
      concepto: 'BONO ARMADO',
      monto: Number(detalle.bono_armado_ingreso),
    });
  if (Number(detalle.bono_referido) > 0)
    ingresos.push({
      concepto: 'BONO REFERIDO',
      monto: Number(detalle.bono_referido),
    });
  if (Number(detalle.pegada_reenganche) > 0)
    ingresos.push({
      concepto: 'PEGADA/REENGANCHE',
      monto: Number(detalle.pegada_reenganche),
    });
  if (Number(detalle.reintegro_dias_trab) > 0)
    ingresos.push({
      concepto: 'REINTEGRO DÍAS',
      monto: Number(detalle.reintegro_dias_trab),
    });
  if (Number(detalle.reintegro_inafecto) > 0)
    ingresos.push({
      concepto: 'REINTEGRO INAFECTO',
      monto: Number(detalle.reintegro_inafecto),
    });
  if (Number(detalle.ingreso_sobregiro) > 0)
    ingresos.push({
      concepto: 'INGRESO SOBREGIRO',
      monto: Number(detalle.ingreso_sobregiro),
    });
  if (Number(detalle.vac_truncas) > 0)
    ingresos.push({
      concepto: 'VACACIONES TRUNCAS',
      monto: Number(detalle.vac_truncas),
    });
  if (Number(detalle.grat_trunca) > 0)
    ingresos.push({
      concepto: 'GRATIF. TRUNCA',
      monto: Number(detalle.grat_trunca),
    });
  if (Number(detalle.cts_trunca) > 0)
    ingresos.push({
      concepto: 'CTS TRUNCA',
      monto: Number(detalle.cts_trunca),
    });
  if (Number(detalle.otros_ingresos) > 0)
    ingresos.push({
      concepto: 'OTROS INGRESOS',
      monto: Number(detalle.otros_ingresos),
    });

  // ========== PREPARAR AFP/ONP (columna del medio) ==========
  const afpOnp: { concepto: string; monto: number }[] = [];

  if (Number(detalle.afp_aporte) > 0)
    afpOnp.push({
      concepto: 'AFP APORTE (10%)',
      monto: Number(detalle.afp_aporte),
    });
  if (Number(detalle.afp_comision) > 0)
    afpOnp.push({
      concepto: 'AFP COMISIÓN',
      monto: Number(detalle.afp_comision),
    });
  if (Number(detalle.afp_seguro) > 0)
    afpOnp.push({
      concepto: 'AFP SEGURO',
      monto: Number(detalle.afp_seguro),
    });
  if (Number(detalle.afp_prima) > 0)
    afpOnp.push({ concepto: 'AFP PRIMA', monto: Number(detalle.afp_prima) });
  if (Number(detalle.onp) > 0)
    afpOnp.push({ concepto: 'ONP (13%)', monto: Number(detalle.onp) });
  if (Number(detalle.renta_5ta) > 0)
    afpOnp.push({
      concepto: 'RENTA 5TA CAT.',
      monto: Number(detalle.renta_5ta),
    });
  if (Number(detalle.quinta_categoria) > 0 && !Number(detalle.renta_5ta))
    afpOnp.push({
      concepto: 'RENTA 5TA CAT.',
      monto: Number(detalle.quinta_categoria),
    });

  // ========== PREPARAR DESCUENTOS (columna derecha) ==========
  const descuentos: { concepto: string; monto: number }[] = [];

  if (Number(detalle.descuento_faltas) > 0)
    descuentos.push({
      concepto: 'FALTAS',
      monto: Number(detalle.descuento_faltas),
    });
  if (Number(detalle.descuento_feriado) > 0)
    descuentos.push({
      concepto: 'DESC. FERIADO',
      monto: Number(detalle.descuento_feriado),
    });
  if (Number(detalle.adelanto_quincena) > 0)
    descuentos.push({
      concepto: 'ADELANTO QUINC.',
      monto: Number(detalle.adelanto_quincena),
    });
  if (Number(detalle.adelantos) > 0)
    descuentos.push({
      concepto: 'ADELANTOS',
      monto: Number(detalle.adelantos),
    });
  if (Number(detalle.adelanto_vacacional) > 0)
    descuentos.push({
      concepto: 'ADELANTO VACAC.',
      monto: Number(detalle.adelanto_vacacional),
    });
  if (Number(detalle.otros_adelantos) > 0)
    descuentos.push({
      concepto: 'OTROS ADELANTOS',
      monto: Number(detalle.otros_adelantos),
    });
  if (Number(detalle.adelanto_cts) > 0)
    descuentos.push({
      concepto: 'CANCELAC. CTS',
      monto: Number(detalle.adelanto_cts),
    });
  if (Number(detalle.adelanto_gratificacion) > 0)
    descuentos.push({
      concepto: 'ADELANTO GRATIF.',
      monto: Number(detalle.adelanto_gratificacion),
    });
  if (Number(detalle.prestamo) > 0)
    descuentos.push({
      concepto: 'PRÉSTAMO',
      monto: Number(detalle.prestamo),
    });
  if (Number(detalle.prestamos) > 0 && !Number(detalle.prestamo))
    descuentos.push({
      concepto: 'PRÉSTAMOS',
      monto: Number(detalle.prestamos),
    });
  if (Number(detalle.retencion_judicial) > 0)
    descuentos.push({
      concepto: 'RET. JUDICIAL',
      monto: Number(detalle.retencion_judicial),
    });
  if (Number(detalle.descuento_sobregiro) > 0)
    descuentos.push({
      concepto: 'DESC. SOBREGIRO',
      monto: Number(detalle.descuento_sobregiro),
    });
  if (Number(detalle.descuento_reintegro) > 0)
    descuentos.push({
      concepto: 'DESC. REINTEGRO',
      monto: Number(detalle.descuento_reintegro),
    });
  if (Number(detalle.otros_descuentos) > 0)
    descuentos.push({
      concepto: 'OTROS DESC.',
      monto: Number(detalle.otros_descuentos),
    });

  // Calcular filas disponibles para 3 columnas
  const espacioRestante = altoTotal - (y - startY) - 90;
  const filasDisponibles = Math.floor(espacioRestante / conceptRowH);
  const maxFilas = Math.min(
    Math.max(10, ingresos.length, afpOnp.length, descuentos.length),
    filasDisponibles,
  );

  // Dibujar filas de conceptos (3 columnas)
  for (let i = 0; i < maxFilas; i++) {
    doc.strokeColor(COLOR_GRIS);
    doc.rect(startX, y, col3W, conceptRowH).stroke();
    doc.rect(startX + col3W, y, col3W, conceptRowH).stroke();
    doc.rect(startX + col3W * 2, y, col3W, conceptRowH).stroke();

    // Columna INGRESOS
    if (ingresos[i]) {
      doc.font(normalFont).fontSize(7).fillColor(COLOR_GRIS_OSCURO);
      doc.text(ingresos[i].concepto, startX + 3, y + 2, {
        width: conceptColW - 6,
      });
      doc.font(titleFont).fontSize(7.5).fillColor(COLOR_NEGRO);
      doc.text(
        formatMonto(ingresos[i].monto),
        startX + conceptColW - 5,
        y + 2,
        { width: montoColW, align: 'right' },
      );
    }

    // Columna AFP/ONP
    if (afpOnp[i]) {
      doc.font(normalFont).fontSize(7).fillColor(COLOR_GRIS_OSCURO);
      doc.text(afpOnp[i].concepto, startX + col3W + 3, y + 2, {
        width: conceptColW - 6,
      });
      doc.font(titleFont).fontSize(7.5).fillColor(COLOR_NEGRO);
      doc.text(
        formatMonto(afpOnp[i].monto),
        startX + col3W + conceptColW - 5,
        y + 2,
        { width: montoColW, align: 'right' },
      );
    }

    // Columna DESCUENTOS
    if (descuentos[i]) {
      doc.font(normalFont).fontSize(7).fillColor(COLOR_GRIS_OSCURO);
      doc.text(descuentos[i].concepto, startX + col3W * 2 + 3, y + 2, {
        width: conceptColW - 6,
      });
      doc.font(titleFont).fontSize(7.5).fillColor(COLOR_NEGRO);
      doc.text(
        formatMonto(descuentos[i].monto),
        startX + col3W * 2 + conceptColW - 5,
        y + 2,
        { width: montoColW, align: 'right' },
      );
    }

    y += conceptRowH;
  }

  // =============================================
  // SUBTOTALES por columna
  // =============================================
  const totalIngresos = Number(detalle.total_ingresos) || 0;
  const totalAfpOnp = afpOnp.reduce((sum, item) => sum + item.monto, 0);
  const totalDescuentosOtros = descuentos.reduce(
    (sum, item) => sum + item.monto,
    0,
  );

  doc.strokeColor(COLOR_NEGRO);
  doc
    .rect(startX, y, col3W, conceptRowH + 2)
    .fill('#e8e8e8')
    .stroke();
  doc
    .rect(startX + col3W, y, col3W, conceptRowH + 2)
    .fill('#e8e8e8')
    .stroke();
  doc
    .rect(startX + col3W * 2, y, col3W, conceptRowH + 2)
    .fill('#e8e8e8')
    .stroke();

  doc.font(titleFont).fontSize(7).fillColor(COLOR_NEGRO);
  doc.text('TOTAL INGRESOS', startX + 3, y + 3);
  doc.text(formatMonto(totalIngresos), startX + conceptColW - 5, y + 3, {
    width: montoColW,
    align: 'right',
  });

  doc.text('TOTAL AFP/ONP', startX + col3W + 3, y + 3);
  doc.text(formatMonto(totalAfpOnp), startX + col3W + conceptColW - 5, y + 3, {
    width: montoColW,
    align: 'right',
  });

  doc.text('TOTAL DESCUENTOS', startX + col3W * 2 + 3, y + 3);
  doc.text(
    formatMonto(totalDescuentosOtros),
    startX + col3W * 2 + conceptColW - 5,
    y + 3,
    { width: montoColW, align: 'right' },
  );

  y += conceptRowH + 4;

  // =============================================
  // TOTALES GENERALES
  // =============================================
  const totalDescuentosGeneral = Number(detalle.total_descuentos) || 0;

  doc.strokeColor(COLOR_NEGRO);
  doc.rect(startX, y, anchoTotal / 2, rowH).stroke();
  doc.rect(startX + anchoTotal / 2, y, anchoTotal / 2, rowH).stroke();

  doc.font(titleFont).fontSize(8).fillColor(COLOR_NEGRO);
  doc.text('TOTAL INGRESOS', startX + 5, y + 4);
  doc.fontSize(9);
  doc.text(
    `S/. ${formatMonto(totalIngresos)}`,
    startX + anchoTotal / 2 - 70,
    y + 3,
    { width: 65, align: 'right' },
  );

  doc.fontSize(8);
  doc.text('TOTAL APORTES Y DESCUENTOS', startX + anchoTotal / 2 + 5, y + 4);
  doc.fontSize(9);
  doc.text(
    `S/. ${formatMonto(totalDescuentosGeneral)}`,
    startX + anchoTotal - 70,
    y + 3,
    { width: 65, align: 'right' },
  );

  y += rowH;

  // =============================================
  // NETO A PAGAR (fondo negro)
  // =============================================
  doc.rect(startX, y, anchoTotal, rowH + 4).fill(COLOR_NEGRO);
  doc.fillColor(COLOR_BLANCO);
  doc.font(titleFont).fontSize(12);
  doc.text('NETO A PAGAR', startX + 15, y + 5);
  doc.fontSize(14);
  doc.text(
    `S/. ${formatMonto(Number(detalle.neto_pagar || 0))}`,
    startX + anchoTotal - 130,
    y + 4,
    { width: 120, align: 'right' },
  );
  y += rowH + 8;

  // =============================================
  // APORTES DEL EMPLEADOR
  // =============================================
  doc.fillColor(COLOR_NEGRO);
  doc.text('APORTES DEL EMPLEADOR', startX, y + 3, {
    width: anchoTotal,
    align: 'center',
  });
  y += 13;

  const aporteColW = anchoTotal / 4;
  const aporteRowH = 14;
  doc.strokeColor(COLOR_GRIS);
  doc.rect(startX, y, anchoTotal, aporteRowH).stroke();

  // Helper para dibujar item de aporte
  const drawAporteItem = (
    index: number,
    label: string,
    monto: number,
    isLast = false,
  ) => {
    const x = startX + aporteColW * index;
    doc.font(normalFont).fontSize(7).fillColor(COLOR_GRIS_OSCURO);
    doc.text(label + ':', x + 5, y + 4);
    doc.font(titleFont).fontSize(8).fillColor(COLOR_NEGRO);
    doc.text(formatMonto(monto), x + aporteColW - 50, y + 3, {
      width: 45,
      align: 'right',
    });
    if (!isLast) {
      doc
        .moveTo(x + aporteColW, y)
        .lineTo(x + aporteColW, y + aporteRowH)
        .stroke();
    }
  };

  // ESSALUD
  drawAporteItem(0, 'ESSALUD', Number(detalle.essalud_empleador || 0));
  // SCTR SALUD
  drawAporteItem(1, 'SCTR SALUD', Number(detalle.sctr_salud_empleador || 0));
  // SCTR PENSIÓN
  drawAporteItem(
    2,
    'SCTR PENSIÓN',
    Number(detalle.sctr_pension_empleador || 0),
  );
  // VIDA LEY
  drawAporteItem(3, 'VIDA LEY', Number(detalle.vida_ley_empleador || 0), true);

  y += aporteRowH + 12;

  // =============================================
  // FIRMAS
  // =============================================
  const firmaW = anchoTotal / 2 - 40;
  doc.strokeColor(COLOR_NEGRO);
  doc
    .moveTo(startX + 20, y)
    .lineTo(startX + 20 + firmaW, y)
    .stroke();
  doc
    .moveTo(startX + anchoTotal / 2 + 20, y)
    .lineTo(startX + anchoTotal / 2 + 20 + firmaW, y)
    .stroke();

  doc.font(normalFont).fontSize(7).fillColor(COLOR_NEGRO);
  doc.text('Empleador', startX + 20, y + 3, {
    width: firmaW,
    align: 'center',
  });
  doc.text('Trabajador', startX + anchoTotal / 2 + 20, y + 3, {
    width: firmaW,
    align: 'center',
  });

  // =============================================
  // PIE (dirección de la empresa)
  // =============================================
  if (empresa.direccion) {
    y += 12;
    doc.font(normalFont).fontSize(6).fillColor(COLOR_GRIS);
    doc.text(empresa.direccion.toUpperCase(), startX, y, {
      width: anchoTotal,
      align: 'center',
    });
  }
}
