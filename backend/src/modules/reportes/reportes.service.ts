import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FormatoReporte, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import {
  CATALOGO_REPORTES,
  getReporteById,
  ReporteConfig,
  CATEGORIAS,
} from './reportes.constants';
import {
  GenerarReporteDto,
  HistorialQueryDto,
  FiltrosReporteDto,
} from './dto/reportes.dto';
import { ReportesPdfService } from './reportes-pdf.service';
import { ReportesDataService } from './reportes-data.service';
import { ahoraPeru } from '../../common/utils/datetime.util';

/**
 * NOTA DE ARQUITECTURA:
 * Algunos reportes (emp-general, pla-mensual, tar-resumen, con-vigentes) tienen
 * queries similares a métodos de exportación en otros servicios:
 * - empleados.service.exportarExcel()
 * - planillas.service.exportar()
 * - tareo-excel.service.exportarExcel()
 * - contratos-excel.service.exportarContratos()
 *
 * La delegación directa no es viable porque:
 * 1. Los servicios externos retornan ExcelJS.Workbook, no { data, columns }
 * 2. Las firmas esperan IDs (planilla_id, periodo_id), no filtros (mes/año)
 *
 * Unificar requiere crear interfaz ReporteDataProvider común. Deuda técnica conocida.
 */

interface AuthUser {
  id: number;
  empresa_id: number;
  email: string;
}

interface ColumnConfig {
  key: string;
  header: string;
  width: number;
}

// Límite máximo de registros por reporte para evitar sobrecarga
const MAX_REGISTROS_REPORTE = 10000;

// Reportes que ya están implementados
const REPORTES_IMPLEMENTADOS = [
  'emp-general',
  'emp-cumple',
  'emp-altas-bajas',
  'con-vencer',
  'con-vigentes',
  'vac-saldos',
  'tar-resumen',
  'tar-descansos-medicos',
  'tar-alertas',
  'pla-mensual',
  'pla-aportes',
  'pla-banco',
];

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: ReportesPdfService,
    private reportesDataService: ReportesDataService,
  ) {}

  /**
   * Obtiene el catálogo de reportes con filtros dinámicos poblados
   */
  async getCatalogo(empresaId: number) {
    const [areas, sedes] = await Promise.all([
      this.prisma.area.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.sede.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    const areaOpciones = [
      { value: '', label: 'Todas las áreas' },
      ...areas.map((a) => ({ value: a.id.toString(), label: a.nombre })),
    ];

    const sedeOpciones = [
      { value: '', label: 'Todas las sedes' },
      ...sedes.map((s) => ({ value: s.id.toString(), label: s.nombre })),
    ];

    const catalogo = CATALOGO_REPORTES.map((reporte) => ({
      ...reporte,
      filtros: reporte.filtros.map((filtro) => {
        if (filtro.id === 'area_id') {
          return { ...filtro, opciones: areaOpciones };
        }
        if (filtro.id === 'sede_id') {
          return { ...filtro, opciones: sedeOpciones };
        }
        return filtro;
      }),
    }));

    // Transformar categorías a formato con id y nombre
    const categoriasFormateadas = CATEGORIAS.map((cat) => ({
      id: cat,
      nombre: cat,
    }));

    return {
      reportes: catalogo,
      categorias: categoriasFormateadas,
      total: catalogo.length,
    };
  }

  /**
   * Obtiene la configuración de un reporte específico
   */
  async getReporteConfig(empresaId: number, codigoReporte: string) {
    const reporte = getReporteById(codigoReporte);
    if (!reporte) {
      throw new NotFoundException(`Reporte '${codigoReporte}' no encontrado`);
    }

    const [areas, sedes] = await Promise.all([
      this.prisma.area.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.sede.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    const filtrosConOpciones = reporte.filtros.map((filtro) => {
      if (filtro.id === 'area_id') {
        return {
          ...filtro,
          opciones: [
            { value: '', label: 'Todas las áreas' },
            ...areas.map((a) => ({ value: a.id.toString(), label: a.nombre })),
          ],
        };
      }
      if (filtro.id === 'sede_id') {
        return {
          ...filtro,
          opciones: [
            { value: '', label: 'Todas las sedes' },
            ...sedes.map((s) => ({ value: s.id.toString(), label: s.nombre })),
          ],
        };
      }
      return filtro;
    });

    return {
      ...reporte,
      filtros: filtrosConOpciones,
    };
  }

  /**
   * Cuenta registros que retornaría el reporte con los filtros dados
   */
  async contarRegistros(
    empresaId: number,
    codigoReporte: string,
    filtros: Record<string, string | number | null>,
  ): Promise<{ total: number }> {
    const reporte = getReporteById(codigoReporte);
    if (!reporte) {
      throw new NotFoundException(`Reporte '${codigoReporte}' no encontrado`);
    }

    const parsedFiltros = this.reportesDataService.parseFiltros(filtros);
    const count = await this.reportesDataService.getReporteCount(
      empresaId,
      codigoReporte,
      parsedFiltros,
    );
    return { total: count };
  }

  /**
   * Genera un reporte en formato Excel
   */
  async generarReporte(
    user: AuthUser,
    dto: GenerarReporteDto,
  ): Promise<{
    workbook: ExcelJS.Workbook;
    filename: string;
    totalRegistros: number;
  }> {
    const startTime = Date.now();

    const reporte = getReporteById(dto.codigo_reporte);
    if (!reporte) {
      throw new NotFoundException(
        `Reporte '${dto.codigo_reporte}' no encontrado`,
      );
    }

    // Validar que el reporte esté implementado
    if (!REPORTES_IMPLEMENTADOS.includes(dto.codigo_reporte)) {
      throw new BadRequestException(
        `El reporte '${reporte.nombre}' aún no está implementado. ` +
          `Reportes disponibles: ${REPORTES_IMPLEMENTADOS.join(', ')}`,
      );
    }

    if (
      !reporte.formatos.includes(dto.formato.toLowerCase() as 'excel' | 'pdf')
    ) {
      throw new BadRequestException(
        `El reporte '${reporte.nombre}' no soporta el formato ${dto.formato}`,
      );
    }

    const filtros = this.reportesDataService.parseFiltros(dto.filtros || {});

    // Validar filtros requeridos según la configuración del reporte
    this.reportesDataService.validarFiltrosRequeridos(reporte, filtros);

    // Validar límite de registros antes de generar
    const totalEstimado = await this.reportesDataService.getReporteCount(
      user.empresa_id,
      dto.codigo_reporte,
      filtros,
    );
    if (totalEstimado > MAX_REGISTROS_REPORTE) {
      throw new BadRequestException(
        `El reporte generaría ${totalEstimado.toLocaleString('es-PE')} registros, ` +
          `lo cual excede el límite de ${MAX_REGISTROS_REPORTE.toLocaleString('es-PE')}. ` +
          `Por favor, aplique filtros más restrictivos.`,
      );
    }

    // Obtener nombre de la empresa para el encabezado
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      select: { razon_social: true, nombre_comercial: true },
    });
    const empresaNombre =
      empresa?.nombre_comercial || empresa?.razon_social || 'EMPRESA';

    const { data, columns } = await this.reportesDataService.getReporteData(
      user.empresa_id,
      dto.codigo_reporte,
      filtros,
    );
    const workbook = this.generarExcel(reporte, data, columns, empresaNombre);

    const tiempoGeneracion = Date.now() - startTime;
    await this.registrarHistorial(
      user,
      reporte,
      dto.formato,
      filtros,
      data.length,
      tiempoGeneracion,
    );

    const fechaStr = ahoraPeru().toISODate().replace(/-/g, '');
    const filename = `${reporte.nombre.replace(/\s+/g, '_')}_${fechaStr}.xlsx`;

    return { workbook, filename, totalRegistros: data.length };
  }

  /**
   * Genera un reporte en formato PDF
   */
  async generarReportePdf(
    user: AuthUser,
    dto: GenerarReporteDto,
  ): Promise<{ buffer: Buffer; filename: string; totalRegistros: number }> {
    const startTime = Date.now();

    const reporte = getReporteById(dto.codigo_reporte);
    if (!reporte) {
      throw new NotFoundException(
        `Reporte '${dto.codigo_reporte}' no encontrado`,
      );
    }

    // Validar que el reporte esté implementado
    if (!REPORTES_IMPLEMENTADOS.includes(dto.codigo_reporte)) {
      throw new BadRequestException(
        `El reporte '${reporte.nombre}' aún no está implementado. ` +
          `Reportes disponibles: ${REPORTES_IMPLEMENTADOS.join(', ')}`,
      );
    }

    if (!reporte.formatos.includes('pdf')) {
      throw new BadRequestException(
        `El reporte '${reporte.nombre}' no soporta el formato PDF`,
      );
    }

    const filtros = this.reportesDataService.parseFiltros(dto.filtros || {});

    // Validar filtros requeridos según la configuración del reporte
    this.reportesDataService.validarFiltrosRequeridos(reporte, filtros);

    // Validar límite de registros antes de generar
    const totalEstimado = await this.reportesDataService.getReporteCount(
      user.empresa_id,
      dto.codigo_reporte,
      filtros,
    );
    if (totalEstimado > MAX_REGISTROS_REPORTE) {
      throw new BadRequestException(
        `El reporte generaría ${totalEstimado.toLocaleString('es-PE')} registros, ` +
          `lo cual excede el límite de ${MAX_REGISTROS_REPORTE.toLocaleString('es-PE')}. ` +
          `Por favor, aplique filtros más restrictivos.`,
      );
    }

    // Obtener datos de la empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      select: { razon_social: true, ruc: true, direccion: true },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const { data, columns } = await this.reportesDataService.getReporteData(
      user.empresa_id,
      dto.codigo_reporte,
      filtros,
    );

    // Generar PDF usando el servicio especializado
    const buffer = await this.pdfService.generarPdf(reporte, data, columns, {
      empresa: {
        razon_social: empresa.razon_social,
        ruc: empresa.ruc,
        direccion: empresa.direccion || undefined,
      },
      filtrosTexto: this.pdfService.formatearFiltrosTexto(dto.filtros || {}),
    });

    const tiempoGeneracion = Date.now() - startTime;
    await this.registrarHistorial(
      user,
      reporte,
      'PDF' as FormatoReporte,
      filtros,
      data.length,
      tiempoGeneracion,
    );

    const fechaStr = ahoraPeru().toISODate().replace(/-/g, '');
    const filename = `${reporte.nombre.replace(/\s+/g, '_')}_${fechaStr}.pdf`;

    return { buffer, filename, totalRegistros: data.length };
  }

  /**
   * Obtiene el historial de reportes generados
   */
  async getHistorial(empresaId: number, query: HistorialQueryDto) {
    const { page = 1, limit = 20, categoria, codigo_reporte } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReporteGeneradoWhereInput = { empresa_id: empresaId };
    if (categoria) where.categoria = categoria;
    if (codigo_reporte) where.codigo_reporte = codigo_reporte;

    const [data, total] = await Promise.all([
      this.prisma.reporteGenerado.findMany({
        where,
        include: {
          usuario: { select: { id: true, nombre_completo: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reporteGenerado.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== GENERADOR EXCEL PROFESIONAL ====================

  private generarExcel(
    reporte: ReporteConfig,
    data: Record<string, unknown>[],
    columns: ColumnConfig[],
    empresaNombre?: string,
  ): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERMIR Sistema RRHH';
    workbook.lastModifiedBy = 'ERMIR Sistema RRHH';
    workbook.created = ahoraPeru().toJSDate();
    workbook.modified = ahoraPeru().toJSDate();
    workbook.properties.date1904 = false;

    const sheet = workbook.addWorksheet(reporte.nombre.substring(0, 31), {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    const totalColumns = columns.length;
    let currentRow = 1;

    // ============ ENCABEZADO EMPRESA ============
    sheet.mergeCells(currentRow, 1, currentRow, totalColumns);
    const empresaCell = sheet.getCell(currentRow, 1);
    empresaCell.value = empresaNombre || 'ERMIR S.A.C.';
    empresaCell.font = {
      name: 'Arial',
      size: 16,
      bold: true,
      color: { argb: '1E3A5F' },
    };
    empresaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 28;
    currentRow++;

    // ============ TÍTULO DEL REPORTE ============
    sheet.mergeCells(currentRow, 1, currentRow, totalColumns);
    const tituloCell = sheet.getCell(currentRow, 1);
    tituloCell.value = reporte.nombre.toUpperCase();
    tituloCell.font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: '374151' },
    };
    tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 24;
    currentRow++;

    // ============ DESCRIPCIÓN ============
    sheet.mergeCells(currentRow, 1, currentRow, totalColumns);
    const descCell = sheet.getCell(currentRow, 1);
    descCell.value = reporte.descripcion;
    descCell.font = {
      name: 'Arial',
      size: 10,
      italic: true,
      color: { argb: '6B7280' },
    };
    descCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 18;
    currentRow++;

    // ============ FECHA DE GENERACIÓN ============
    sheet.mergeCells(currentRow, 1, currentRow, totalColumns);
    const fechaCell = sheet.getCell(currentRow, 1);
    const ahoraPeruDt = ahoraPeru();
    fechaCell.value = `Generado el ${ahoraPeruDt.toFormat("cccc, d 'de' MMMM 'de' yyyy", { locale: 'es' })} a las ${ahoraPeruDt.toFormat('HH:mm')}`;
    fechaCell.font = { name: 'Arial', size: 9, color: { argb: '9CA3AF' } };
    fechaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 16;
    currentRow++;

    // ============ LÍNEA SEPARADORA ============
    currentRow++;
    sheet.getRow(currentRow).height = 8;
    currentRow++;

    // ============ ENCABEZADOS DE TABLA ============
    const headerRowNum = currentRow;
    columns.forEach((col, index) => {
      const cell = sheet.getCell(headerRowNum, index + 1);
      cell.value = col.header;
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E40AF' }, // Azul corporativo
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: '1E3A8A' } },
        left: { style: 'thin', color: { argb: '1E3A8A' } },
        bottom: { style: 'thin', color: { argb: '1E3A8A' } },
        right: { style: 'thin', color: { argb: '1E3A8A' } },
      };
    });
    sheet.getRow(headerRowNum).height = 28;

    // Configurar anchos de columna
    columns.forEach((col, index) => {
      sheet.getColumn(index + 1).width = col.width;
    });

    currentRow++;

    // ============ DATOS ============
    const dataStartRow = currentRow;
    data.forEach((row, dataIndex) => {
      const rowNum = dataStartRow + dataIndex;
      const isEvenRow = dataIndex % 2 === 0;

      columns.forEach((col, colIndex) => {
        const cell = sheet.getCell(rowNum, colIndex + 1);
        const value = row[col.key];
        cell.value = value as string | number | boolean | Date | null;

        // Fuente
        cell.font = { name: 'Arial', size: 9, color: { argb: '374151' } };

        // Alineación según tipo de dato
        if (typeof value === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Color de fondo alternado
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'FFFFFF' : 'F3F4F6' },
        };

        // Bordes
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } },
        };
      });

      sheet.getRow(rowNum).height = 20;
    });

    // ============ FORMATO DE COLUMNAS MONETARIAS ============
    const moneyColumns = [
      'sueldo_base',
      'total_haberes',
      'total_descuentos',
      'neto_pagar',
      'monto',
    ];
    columns.forEach((col, index) => {
      if (moneyColumns.includes(col.key)) {
        sheet.getColumn(index + 1).numFmt = '"S/" #,##0.00';
      }
    });

    // ============ PIE DE PÁGINA ============
    const footerRow = dataStartRow + data.length + 1;
    sheet.mergeCells(footerRow, 1, footerRow, totalColumns);
    const footerCell = sheet.getCell(footerRow, 1);
    footerCell.value = `Total de registros: ${data.length.toLocaleString('es-PE')}`;
    footerCell.font = {
      name: 'Arial',
      size: 9,
      bold: true,
      color: { argb: '374151' },
    };
    footerCell.alignment = { horizontal: 'right', vertical: 'middle' };
    footerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' },
    };
    sheet.getRow(footerRow).height = 22;

    // ============ CONGELAR ENCABEZADOS ============
    sheet.views = [
      {
        state: 'frozen',
        ySplit: headerRowNum,
        activeCell: 'A' + (headerRowNum + 1),
      },
    ];

    // ============ FILTROS AUTOMÁTICOS ============
    if (data.length > 0) {
      sheet.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to: { row: headerRowNum, column: totalColumns },
      };
    }

    return workbook;
  }

  // ==================== UTILIDADES ====================

  private async registrarHistorial(
    user: AuthUser,
    reporte: ReporteConfig,
    formato: FormatoReporte,
    filtros: FiltrosReporteDto,
    totalRegistros: number,
    tiempoGeneracionMs: number,
  ): Promise<void> {
    try {
      await this.prisma.reporteGenerado.create({
        data: {
          empresa_id: user.empresa_id,
          usuario_id: user.id,
          codigo_reporte: reporte.id,
          nombre_reporte: reporte.nombre,
          categoria: reporte.categoria,
          formato,
          filtros: filtros as Prisma.InputJsonValue,
          total_registros: totalRegistros,
          tiempo_generacion_ms: tiempoGeneracionMs,
        },
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error registrando historial: ${mensaje}`);
    }
  }
}
