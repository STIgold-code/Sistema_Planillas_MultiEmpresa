import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { RequerimientosService } from './requerimientos.service';
import { formatearFechaPeru } from '../../common/utils/datetime.util';
import { LOGO_ERMIR_PATH } from '../../common/utils/assets.util';

const COLORS = {
  PRIMARY: 'FF1F4E79',
  HEADER_BG: 'FF2E75B6',
  WHITE: 'FFFFFFFF',
  STRIPE: 'FFF2F6FB',
  BORDER: 'FFD9D9D9',
};

const LOGO_PATH = LOGO_ERMIR_PATH;

@Injectable()
export class RequerimientosExportService {
  constructor(
    private readonly requerimientos: RequerimientosService,
    private readonly prisma: PrismaService,
  ) {}

  private async empresaNombre(empresaId: number): Promise<string> {
    const e = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { razon_social: true, nombre_comercial: true },
    });
    return e?.nombre_comercial || e?.razon_social || 'ERMIR';
  }

  /**
   * Excel formato ejecutivo: encabezado con logo + empresa, hojas Detalle y
   * Consolidado con estilos corporativos.
   */
  async excel(id: number, empresaId: number): Promise<ExcelJS.Workbook> {
    const req = await this.requerimientos.findOne(id, empresaId);
    const consolidado = await this.requerimientos.consolidado(id, empresaId);
    const empresa = await this.empresaNombre(empresaId);

    const wb = new ExcelJS.Workbook();
    wb.creator = empresa;

    let logoId: number | null = null;
    if (fs.existsSync(LOGO_PATH)) {
      logoId = wb.addImage({ filename: LOGO_PATH, extension: 'png' });
    }

    const ponerEncabezado = (ws: ExcelJS.Worksheet, subtitulo: string) => {
      if (logoId !== null) {
        ws.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 48, height: 48 },
        });
      }
      ws.mergeCells('B1:F1');
      const t = ws.getCell('B1');
      t.value = empresa;
      t.font = { bold: true, size: 14, color: { argb: COLORS.PRIMARY } };
      t.alignment = { vertical: 'middle' };
      ws.mergeCells('B2:F2');
      const s = ws.getCell('B2');
      s.value = `${subtitulo}  ·  ${req.nombre}  ·  ${formatearFechaPeru(req.fecha)}`;
      s.font = { size: 10, color: { argb: 'FF555555' } };
      ws.getRow(1).height = 26;
      ws.getRow(2).height = 16;
    };

    // ── Hoja Detalle ──
    const detalle = wb.addWorksheet('Detalle');
    detalle.columns = [
      { key: 'n', width: 6 },
      { key: 'empleado', width: 36 },
      { key: 'dni', width: 14 },
      { key: 'prenda', width: 28 },
      { key: 'talla', width: 12 },
      { key: 'cantidad', width: 10 },
    ];
    ponerEncabezado(detalle, 'Requerimiento de Prendas — Detalle por empleado');
    detalle.getRow(4).values = [
      'N°',
      'Empleado',
      'DNI',
      'Prenda',
      'Talla',
      'Cantidad',
    ];
    this.estilarHeader(detalle.getRow(4));

    let i = 1;
    req.detalles.forEach((d, idx) => {
      // Los ítems sueltos (sin empleado) no van en la hoja de detalle por empleado.
      if (!d.empleado) return;
      const row = detalle.addRow({
        n: i++,
        empleado: `${d.empleado.apellido_paterno} ${d.empleado.apellido_materno}, ${d.empleado.nombres}`,
        dni: d.empleado.numero_documento,
        prenda: d.tipo_uniforme.nombre,
        talla: d.talla,
        cantidad: d.cantidad,
      });
      if (idx % 2 === 1) this.estilarStripe(row);
    });

    // ── Hoja Consolidado ──
    const cons = wb.addWorksheet('Consolidado');
    cons.columns = [
      { key: 'prenda', width: 32 },
      { key: 'talla', width: 14 },
      { key: 'cantidad', width: 16 },
    ];
    ponerEncabezado(cons, 'Requerimiento de Prendas — Consolidado para compra');
    cons.getRow(4).values = ['Prenda', 'Talla', 'Cantidad Total'];
    this.estilarHeader(cons.getRow(4));

    consolidado.forEach((c, idx) => {
      const row = cons.addRow({
        prenda: c.tipo_nombre,
        talla: c.talla,
        cantidad: c.cantidad,
      });
      if (idx % 2 === 1) this.estilarStripe(row);
    });
    const total = consolidado.reduce((acc, c) => acc + c.cantidad, 0);
    const totalRow = cons.addRow({
      prenda: 'TOTAL UNIDADES',
      talla: '',
      cantidad: total,
    });
    totalRow.font = { bold: true };

    return wb;
  }

  private estilarHeader(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.WHITE } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.HEADER_BG },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  }

  private estilarStripe(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.STRIPE },
      };
    });
  }

  /**
   * PDF formato ejecutivo: encabezado con logo + empresa + consolidado.
   */
  async pdf(id: number, empresaId: number): Promise<Buffer> {
    const req = await this.requerimientos.findOne(id, empresaId);
    const consolidado = await this.requerimientos.consolidado(id, empresaId);
    const empresa = await this.empresaNombre(empresaId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const startX = 40;
      const pageWidth = 515;

      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, startX, 36, { width: 46, height: 46 });
        } catch {
          // ignorar si el logo falla
        }
      }
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#1F4E79');
      doc.text(empresa, startX + 58, 40);
      doc.font('Helvetica').fontSize(11).fillColor('#333');
      doc.text('Requerimiento de Prendas', startX + 58, 60);
      doc.fontSize(9).fillColor('#777');
      doc.text(
        `${req.nombre}  ·  ${formatearFechaPeru(req.fecha)}`,
        startX + 58,
        76,
      );

      // Destinatario del cargo: el proveedor al que se le envía el pedido.
      const proveedorNombre = req.proveedor?.nombre ?? '—';
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1F4E79');
      doc.text(`Proveedor: ${proveedorNombre}`, startX + 58, 90);

      doc
        .moveTo(startX, 110)
        .lineTo(startX + pageWidth, 110)
        .stroke('#2E75B6');

      // Sello del cargo: solo se estampa cuando el requerimiento está APROBADO.
      // En borrador no se muestra ningún banner.
      if (req.estado !== 'BORRADOR') {
        const quien = req.aprobado_por?.nombre_completo ?? '—';
        const cuando = req.fecha_aprobacion
          ? formatearFechaPeru(req.fecha_aprobacion)
          : '';
        doc.rect(startX, 116, pageWidth, 18).fill('#EAF7EE');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E7E34');
        doc.text(`APROBADO por ${quien}  ·  ${cuando}`, startX + 6, 120);
      }

      doc
        .fontSize(12)
        .fillColor('#1F4E79')
        .font('Helvetica')
        .text('Consolidado por prenda y talla', startX, 146);

      let y = 168;
      const colPrenda = startX;
      const colTalla = startX + 300;
      const colCant = startX + 410;

      doc.rect(startX, y, pageWidth, 20).fill('#2E75B6');
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('Prenda', colPrenda + 6, y + 5);
      doc.text('Talla', colTalla + 6, y + 5);
      doc.text('Cantidad', colCant + 6, y + 5);
      y += 20;

      doc.font('Helvetica').fillColor('#000');
      let total = 0;
      let ultimoTipoId: number | null = null;
      consolidado.forEach((c, idx) => {
        if (y > 770) {
          doc.addPage();
          y = 40;
        }
        if (idx % 2 === 1) {
          doc.rect(startX, y, pageWidth, 16).fill('#F2F6FB');
        }
        doc.font('Helvetica').fontSize(9).fillColor('#000');
        doc.text(c.tipo_nombre, colPrenda + 6, y + 3, { width: 290 });
        doc.text(c.talla, colTalla + 6, y + 3);
        doc.text(String(c.cantidad), colCant + 6, y + 3);
        y += 16;
        total += c.cantidad;

        // Características: salen UNA sola vez por prenda (en su primera fila).
        // Las prendas vienen agrupadas (orden por tipo_nombre), así que basta
        // con detectar el cambio de tipo_uniforme_id respecto al anterior.
        const esPrimeraFilaDelTipo = c.tipo_uniforme_id !== ultimoTipoId;
        if (esPrimeraFilaDelTipo && c.caracteristicas.length > 0) {
          const textoCaracs = c.caracteristicas
            .map((ca) =>
              ca.descripcion ? `${ca.nombre} (${ca.descripcion})` : ca.nombre,
            )
            .join(' · ');
          const opciones = { width: pageWidth - 12 };
          const altoTexto = doc
            .font('Helvetica-Oblique')
            .fontSize(8)
            .heightOfString(`Características: ${textoCaracs}`, opciones);
          const altoFila = Math.max(14, altoTexto + 4);

          if (y + altoFila > 770) {
            doc.addPage();
            y = 40;
          }
          doc.rect(startX, y, pageWidth, altoFila).fill('#FFF8E1');
          doc
            .font('Helvetica-Oblique')
            .fontSize(8)
            .fillColor('#6B5B00')
            .text(
              `Características: ${textoCaracs}`,
              colPrenda + 6,
              y + 2,
              opciones,
            );
          y += altoFila;
        }
        ultimoTipoId = c.tipo_uniforme_id;
      });

      doc
        .moveTo(startX, y)
        .lineTo(startX + pageWidth, y)
        .stroke('#999');
      y += 5;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1F4E79');
      doc.text('TOTAL UNIDADES', colPrenda + 6, y + 2);
      doc.text(String(total), colCant + 6, y + 2);

      doc.end();
    });
  }
}
