import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ReporteConfig } from './reportes.constants';
import { ahoraPeru } from '../../common/utils/datetime.util';

interface ColumnConfig {
  key: string;
  header: string;
  width: number;
}

interface PdfOptions {
  empresa: {
    razon_social: string;
    ruc: string;
    direccion?: string;
  };
  filtrosTexto?: string;
}

/**
 * Servicio para generación de reportes en formato PDF
 * Basado en el patrón de boletas.service.ts
 */
@Injectable()
export class ReportesPdfService {
  private readonly logger = new Logger(ReportesPdfService.name);

  // Paleta de colores corporativa (monocromática)
  private readonly COLOR_NEGRO = '#000000';
  private readonly COLOR_GRIS_OSCURO = '#333333';
  private readonly COLOR_GRIS = '#666666';
  private readonly COLOR_GRIS_CLARO = '#e0e0e0';
  private readonly COLOR_GRIS_MUY_CLARO = '#f5f5f5';
  private readonly COLOR_BLANCO = '#FFFFFF';
  private readonly COLOR_AZUL_CORPORATIVO = '#1E40AF';

  /**
   * Genera un PDF de reporte tabular
   */
  async generarPdf(
    reporte: ReporteConfig,
    data: Record<string, unknown>[],
    columns: ColumnConfig[],
    options: PdfOptions,
  ): Promise<Buffer> {
    // A4 vertical: 595.28 x 841.89 points
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape', // Landscape para tablas con muchas columnas
      margins: { top: 40, bottom: 40, left: 30, right: 30 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.dibujarReporte(doc, reporte, data, columns, options);
        doc.end();
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error generando PDF: ${mensaje}`);
        reject(error instanceof Error ? error : new Error(mensaje));
      }
    });
  }

  private dibujarReporte(
    doc: PDFKit.PDFDocument,
    reporte: ReporteConfig,
    data: Record<string, unknown>[],
    columns: ColumnConfig[],
    options: PdfOptions,
  ): void {
    const pageWidth = 841.89; // A4 landscape
    const pageHeight = 595.28;
    const marginLeft = 30;
    const marginRight = 30;
    const marginTop = 40;
    const marginBottom = 40;
    const contentWidth = pageWidth - marginLeft - marginRight;

    let y = marginTop;

    // ==================== ENCABEZADO ====================
    y = this.dibujarEncabezado(
      doc,
      reporte,
      options,
      marginLeft,
      y,
      contentWidth,
    );

    // ==================== TABLA ====================
    this.dibujarTabla(
      doc,
      data,
      columns,
      marginLeft,
      y,
      contentWidth,
      pageHeight - marginBottom,
    );

    // ==================== PIE DE PÁGINA ====================
    this.dibujarPiePagina(
      doc,
      data.length,
      pageWidth,
      pageHeight,
      marginBottom,
    );
  }

  private dibujarEncabezado(
    doc: PDFKit.PDFDocument,
    reporte: ReporteConfig,
    options: PdfOptions,
    startX: number,
    startY: number,
    width: number,
  ): number {
    let y = startY;

    // Nombre de la empresa
    doc.font('Helvetica-Bold').fontSize(14).fillColor(this.COLOR_NEGRO);
    doc.text(options.empresa.razon_social.toUpperCase(), startX, y, {
      width,
      align: 'center',
    });
    y += 18;

    // RUC
    doc.font('Helvetica').fontSize(9).fillColor(this.COLOR_GRIS_OSCURO);
    doc.text(`RUC: ${options.empresa.ruc}`, startX, y, {
      width,
      align: 'center',
    });
    y += 14;

    // Título del reporte
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(this.COLOR_AZUL_CORPORATIVO);
    doc.text(reporte.nombre.toUpperCase(), startX, y, {
      width,
      align: 'center',
    });
    y += 16;

    // Descripción
    doc.font('Helvetica').fontSize(9).fillColor(this.COLOR_GRIS);
    doc.text(reporte.descripcion, startX, y, {
      width,
      align: 'center',
    });
    y += 12;

    // Filtros aplicados (si existen)
    if (options.filtrosTexto) {
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(this.COLOR_GRIS);
      doc.text(`Filtros: ${options.filtrosTexto}`, startX, y, {
        width,
        align: 'center',
      });
      y += 12;
    }

    // Fecha de generación (zona horaria Perú)
    const ahoraPeruDt = ahoraPeru();
    doc.font('Helvetica').fontSize(8).fillColor(this.COLOR_GRIS);
    doc.text(
      `Generado el ${ahoraPeruDt.toFormat("cccc, d 'de' MMMM 'de' yyyy", { locale: 'es' })} a las ${ahoraPeruDt.toFormat('HH:mm')}`,
      startX,
      y,
      { width, align: 'center' },
    );
    y += 20;

    return y;
  }

  private dibujarTabla(
    doc: PDFKit.PDFDocument,
    data: Record<string, unknown>[],
    columns: ColumnConfig[],
    startX: number,
    startY: number,
    maxWidth: number,
    maxY: number,
  ): number {
    const rowHeight = 16;
    const headerHeight = 20;
    const padding = 4;

    // Calcular anchos de columna proporcionales
    const totalConfigWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const columnWidths = columns.map(
      (col) => (col.width / totalConfigWidth) * maxWidth,
    );

    let y = startY;

    // Función para dibujar encabezados
    const dibujarEncabezados = () => {
      let x = startX;

      // Fondo del encabezado
      doc
        .rect(startX, y, maxWidth, headerHeight)
        .fill(this.COLOR_AZUL_CORPORATIVO);

      columns.forEach((col, index) => {
        const colWidth = columnWidths[index];
        doc.font('Helvetica-Bold').fontSize(8).fillColor(this.COLOR_BLANCO);
        doc.text(col.header, x + padding, y + 5, {
          width: colWidth - padding * 2,
          align: 'center',
          lineBreak: false,
        });
        x += colWidth;
      });

      y += headerHeight;
    };

    // Dibujar encabezados iniciales
    dibujarEncabezados();

    // Dibujar filas de datos
    data.forEach((row, rowIndex) => {
      // Verificar si necesitamos nueva página
      if (y + rowHeight > maxY) {
        doc.addPage();
        y = 40; // Margen superior
        dibujarEncabezados();
      }

      const isEvenRow = rowIndex % 2 === 0;
      let x = startX;

      // Fondo de fila alternado
      doc
        .rect(startX, y, maxWidth, rowHeight)
        .fill(isEvenRow ? this.COLOR_BLANCO : this.COLOR_GRIS_MUY_CLARO);

      // Borde inferior de fila
      doc.strokeColor(this.COLOR_GRIS_CLARO).lineWidth(0.5);
      doc
        .moveTo(startX, y + rowHeight)
        .lineTo(startX + maxWidth, y + rowHeight)
        .stroke();

      // Dibujar celdas
      columns.forEach((col, colIndex) => {
        const colWidth = columnWidths[colIndex];
        const value = row[col.key];
        let displayValue = '';

        if (value !== null && value !== undefined) {
          if (typeof value === 'number') {
            // Formato de número con 2 decimales para montos
            if (
              col.key.includes('monto') ||
              col.key.includes('pagar') ||
              col.key.includes('haberes') ||
              col.key.includes('descuento') ||
              col.key.includes('sueldo') ||
              col.key.includes('essalud') ||
              col.key.includes('sctr') ||
              col.key.includes('vida_ley') ||
              col.key.includes('total')
            ) {
              displayValue = value.toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            } else {
              displayValue = value.toString();
            }
          } else if (value instanceof Date) {
            displayValue = value.toISOString();
          } else if (
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            typeof value === 'bigint'
          ) {
            displayValue = String(value);
          } else {
            displayValue = JSON.stringify(value);
          }
        }

        // Truncar texto largo
        if (displayValue.length > 40) {
          displayValue = displayValue.substring(0, 38) + '..';
        }

        doc.font('Helvetica').fontSize(7).fillColor(this.COLOR_GRIS_OSCURO);
        doc.text(displayValue, x + padding, y + 4, {
          width: colWidth - padding * 2,
          align: typeof value === 'number' ? 'right' : 'left',
          lineBreak: false,
        });

        x += colWidth;
      });

      y += rowHeight;
    });

    return y;
  }

  private dibujarPiePagina(
    doc: PDFKit.PDFDocument,
    totalRegistros: number,
    pageWidth: number,
    pageHeight: number,
    marginBottom: number,
  ): void {
    const totalPages = doc.bufferedPageRange().count;

    // Agregar número de página a cada página
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Total de registros (solo en última página)
      if (i === totalPages - 1) {
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(this.COLOR_GRIS_OSCURO);
        doc.text(
          `Total de registros: ${totalRegistros.toLocaleString('es-PE')}`,
          30,
          pageHeight - marginBottom + 10,
          {
            width: pageWidth - 60,
            align: 'left',
          },
        );
      }

      // Número de página
      doc.font('Helvetica').fontSize(8).fillColor(this.COLOR_GRIS);
      doc.text(
        `Página ${i + 1} de ${totalPages}`,
        30,
        pageHeight - marginBottom + 10,
        {
          width: pageWidth - 60,
          align: 'right',
        },
      );

      // Línea separadora
      doc.strokeColor(this.COLOR_GRIS_CLARO).lineWidth(1);
      doc
        .moveTo(30, pageHeight - marginBottom + 5)
        .lineTo(pageWidth - 30, pageHeight - marginBottom + 5)
        .stroke();
    }
  }

  /**
   * Formatea los filtros aplicados en texto legible
   */
  formatearFiltrosTexto(filtros: Record<string, unknown>): string {
    const partes: string[] = [];

    // Convierte un valor desconocido a texto sin producir "[object Object]".
    const aTexto = (valor: unknown): string => {
      if (valor === null || valor === undefined) return '';
      if (
        typeof valor === 'string' ||
        typeof valor === 'number' ||
        typeof valor === 'boolean' ||
        typeof valor === 'bigint'
      ) {
        return String(valor);
      }
      if (valor instanceof Date) return valor.toISOString();
      return JSON.stringify(valor);
    };

    if (filtros.mes && filtros.anio) {
      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      const mesIndex = Number(filtros.mes) - 1;
      partes.push(`Período: ${meses[mesIndex]} ${aTexto(filtros.anio)}`);
    }

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      const desde = filtros.fecha_desde
        ? new Date(filtros.fecha_desde as string).toLocaleDateString('es-PE')
        : '';
      const hasta = filtros.fecha_hasta
        ? new Date(filtros.fecha_hasta as string).toLocaleDateString('es-PE')
        : '';
      if (desde && hasta) {
        partes.push(`Del ${desde} al ${hasta}`);
      } else if (desde) {
        partes.push(`Desde ${desde}`);
      } else if (hasta) {
        partes.push(`Hasta ${hasta}`);
      }
    }

    if (filtros.area_id) {
      partes.push(`Área: ID ${aTexto(filtros.area_id)}`);
    }

    if (filtros.sede_id) {
      partes.push(`Sede: ID ${aTexto(filtros.sede_id)}`);
    }

    if (filtros.estado) {
      partes.push(`Estado: ${aTexto(filtros.estado)}`);
    }

    return partes.join(' | ');
  }
}
