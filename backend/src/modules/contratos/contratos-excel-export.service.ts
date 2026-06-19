import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Servicio dedicado a la exportacion de contratos a Excel.
 * Extraido de ContratosExcelService para mantener archivos < 400 LOC.
 */
@Injectable()
export class ContratosExcelExportService {
  constructor(private prisma: PrismaService) {}

  private readonly COLORS = {
    PRIMARY: 'FF1F4E79', // Azul oscuro
    HEADER_BG: 'FF2E75B6', // Azul medio
    HEADER_TEXT: 'FFFFFFFF', // Blanco
    VIGENTE: 'FF27AE60', // Verde
    VENCIDO: 'FFE74C3C', // Rojo
    RENOVADO: 'FF95A5A6', // Gris
    CESADO: 'FFF39C12', // Naranja
    BORDER: 'FFD9D9D9', // Gris claro
    STRIPE_ODD: 'FFF8F9FA', // Gris muy claro
    STRIPE_EVEN: 'FFFFFFFF', // Blanco
  };

  private readonly ESTADO_LABELS: Record<string, string> = {
    VIGENTE: 'Vigente',
    VENCIDO: 'Vencido',
    RENOVADO: 'Renovado',
    TERMINADO: 'Cesado',
  };

  private calcularDiasRestantes(fechaFin: Date | null): number | null {
    if (!fechaFin) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFin);
    fin.setHours(0, 0, 0, 0);
    const diffTime = fin.getTime() - hoy.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private formatearDiasRestantes(dias: number | null, estado: string): string {
    if (estado === 'CESADO') return '-';
    if (dias === null) return '-';
    return `${dias} días`;
  }

  private getEstadoColor(estado: string): string {
    const colorMap: Record<string, string> = {
      VIGENTE: this.COLORS.VIGENTE,
      VENCIDO: this.COLORS.VENCIDO,
      RENOVADO: this.COLORS.RENOVADO,
      TERMINADO: this.COLORS.CESADO,
    };
    return colorMap[estado] || this.COLORS.RENOVADO;
  }

  private applyBorder(cell: ExcelJS.Cell): void {
    cell.border = {
      top: { style: 'thin', color: { argb: this.COLORS.BORDER } },
      left: { style: 'thin', color: { argb: this.COLORS.BORDER } },
      bottom: { style: 'thin', color: { argb: this.COLORS.BORDER } },
      right: { style: 'thin', color: { argb: this.COLORS.BORDER } },
    };
  }

  async exportarContratos(empresaId: number): Promise<ExcelJS.Workbook> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { razon_social: true, ruc: true },
    });

    const contratos = await this.prisma.contrato.findMany({
      where: {
        empleado: { empresa_id: empresaId },
      },
      orderBy: [{ estado: 'asc' }, { empleado: { apellido_paterno: 'asc' } }],
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            apellido_paterno: true,
            apellido_materno: true,
            nombres: true,
            area: { select: { nombre: true } },
            sede: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
            // Traer movimiento de BAJA para fecha de cese
            movimientos: {
              where: { tipo_movimiento: 'BAJA' },
              select: {
                fecha_movimiento: true,
              },
              orderBy: { fecha_movimiento: 'desc' },
              take: 1,
            },
            // Traer solicitud de cese aprobada para tipo de cese
            solicitudes_cese: {
              where: { estado: 'APROBADA' },
              select: {
                tipo_cese: { select: { nombre: true } },
              },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
        cliente: {
          select: { razon_social: true },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema RRHH - Ermir';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Contratos', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    // ===== TÍTULO =====
    sheet.mergeCells('A1:O1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `REPORTE DE CONTRATOS - ${empresa?.razon_social || 'EMPRESA'}`;
    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: this.COLORS.PRIMARY },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // ===== SUBTÍTULO =====
    sheet.mergeCells('A2:O2');
    const subtitleCell = sheet.getCell('A2');
    const fechaReporte = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    subtitleCell.value = `Generado el ${fechaReporte} | Total: ${contratos.length} contratos`;
    subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF666666' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // ===== COLUMNAS =====
    const columns = [
      { header: 'ID EMP.', key: 'id_empleado', width: 8 },
      { header: 'DOCUMENTO', key: 'documento', width: 12 },
      { header: 'APELLIDOS Y NOMBRES', key: 'nombre', width: 35 },
      { header: 'ÁREA', key: 'area', width: 20 },
      { header: 'SEDE', key: 'sede', width: 18 },
      { header: 'CARGO', key: 'cargo', width: 22 },
      { header: 'CLIENTE', key: 'cliente', width: 20 },
      { header: 'TIPO CONTRATO', key: 'tipo', width: 22 },
      { header: 'FECHA INICIO', key: 'inicio', width: 14 },
      { header: 'FECHA FIN', key: 'fin', width: 14 },
      { header: 'DÍAS REST.', key: 'dias_restantes', width: 12 },
      { header: 'ESTADO', key: 'estado', width: 12 },
      { header: 'FECHA CESE', key: 'fecha_cese', width: 14 },
      { header: 'TIPO CESE', key: 'tipo_cese', width: 30 },
      { header: 'SUELDO', key: 'sueldo', width: 12 },
    ];

    // Configurar columnas
    sheet.columns = columns.map((col) => ({
      key: col.key,
      width: col.width,
    }));

    // ===== HEADER ROW =====
    const headerRowNum = 3;
    const headerRow = sheet.getRow(headerRowNum);
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = {
        bold: true,
        size: 10,
        color: { argb: this.COLORS.HEADER_TEXT },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.COLORS.HEADER_BG },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      this.applyBorder(cell);
    });
    headerRow.height = 25;

    // ===== DATA ROWS =====
    contratos.forEach((c, index) => {
      const rowNum = headerRowNum + 1 + index;
      const diasRestantes = this.calcularDiasRestantes(c.fecha_fin);
      const isOdd = index % 2 === 0;
      const bgColor = isOdd ? this.COLORS.STRIPE_ODD : this.COLORS.STRIPE_EVEN;

      // Obtener datos de cese
      const movimientoBaja = c.empleado.movimientos?.[0];
      const fechaCese = movimientoBaja?.fecha_movimiento || c.fecha_cese;
      const tipoCese =
        c.empleado.solicitudes_cese?.[0]?.tipo_cese?.nombre || '';

      const rowData = [
        c.empleado.id,
        c.empleado.numero_documento,
        `${c.empleado.apellido_paterno} ${c.empleado.apellido_materno}, ${c.empleado.nombres}`,
        c.empleado.area?.nombre || '-',
        c.empleado.sede?.nombre || '-',
        c.empleado.cargo?.nombre || '-',
        c.cliente?.razon_social || '-',
        c.tipo_contrato,
        c.fecha_inicio,
        c.fecha_fin,
        this.formatearDiasRestantes(diasRestantes, c.estado),
        this.ESTADO_LABELS[c.estado] || c.estado,
        fechaCese || (c.estado === 'CESADO' ? '-' : ''),
        tipoCese,
        c.remuneracion ? Number(c.remuneracion) : null,
      ];

      const row = sheet.getRow(rowNum);
      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.alignment = { vertical: 'middle' };
        this.applyBorder(cell);

        // Alineación específica por columna
        if (colIndex === 0) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Estilo especial para columna ESTADO
      const estadoCell = row.getCell(12);
      estadoCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.getEstadoColor(c.estado) },
      };
      estadoCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Estilo para días restantes (color según valor)
      const diasCell = row.getCell(11);
      if (diasRestantes !== null && c.estado !== 'CESADO') {
        if (diasRestantes <= 0) {
          diasCell.font = { bold: true, color: { argb: this.COLORS.VENCIDO } };
        } else if (diasRestantes <= 30) {
          diasCell.font = { bold: true, color: { argb: 'FFF39C12' } };
        } else {
          diasCell.font = { color: { argb: this.COLORS.VIGENTE } };
        }
      }
      diasCell.alignment = { horizontal: 'center', vertical: 'middle' };

      row.height = 18;
    });

    // ===== FORMATO DE COLUMNAS =====
    sheet.getColumn('inicio').numFmt = 'DD/MM/YYYY';
    sheet.getColumn('fin').numFmt = 'DD/MM/YYYY';
    sheet.getColumn('fecha_cese').numFmt = 'DD/MM/YYYY';
    sheet.getColumn('sueldo').numFmt = '"S/" #,##0.00';

    // ===== AUTO FILTER =====
    const lastRow = headerRowNum + contratos.length;
    sheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: lastRow, column: columns.length },
    };

    // ===== RESUMEN AL FINAL =====
    const summaryStartRow = lastRow + 2;

    const vigentes = contratos.filter((c) => c.estado === 'ACTIVO').length;
    const vencidos = contratos.filter((c) => c.estado === 'PENDIENTE').length;
    const renovados = contratos.filter((c) => c.estado === 'RENOVADO').length;
    const cesados = contratos.filter((c) => c.estado === 'CESADO').length;

    sheet.mergeCells(`A${summaryStartRow}:C${summaryStartRow}`);
    const summaryTitle = sheet.getCell(`A${summaryStartRow}`);
    summaryTitle.value = 'RESUMEN POR ESTADO';
    summaryTitle.font = {
      bold: true,
      size: 11,
      color: { argb: this.COLORS.PRIMARY },
    };

    const summaryData = [
      { label: 'Vigentes', count: vigentes, color: this.COLORS.VIGENTE },
      { label: 'Vencidos', count: vencidos, color: this.COLORS.VENCIDO },
      { label: 'Renovados', count: renovados, color: this.COLORS.RENOVADO },
      { label: 'Cesados', count: cesados, color: this.COLORS.CESADO },
      { label: 'TOTAL', count: contratos.length, color: this.COLORS.PRIMARY },
    ];

    summaryData.forEach((item, idx) => {
      const rowNum = summaryStartRow + 1 + idx;
      const labelCell = sheet.getCell(`A${rowNum}`);
      const countCell = sheet.getCell(`B${rowNum}`);

      labelCell.value = item.label;
      labelCell.font = { bold: item.label === 'TOTAL', size: 10 };

      countCell.value = item.count;
      countCell.font = { bold: true, color: { argb: item.color } };
      countCell.alignment = { horizontal: 'center' };
    });

    return workbook;
  }
}
