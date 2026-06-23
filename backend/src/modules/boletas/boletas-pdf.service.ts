import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Prisma, EstadoBoleta } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dibujarBoletaA4 } from './boleta-pdf';
import { ahoraPeru } from '../../common/utils/datetime.util';

/**
 * Servicio dedicado a la generacion de PDF de boletas (individual + masivo).
 * Extraido de BoletasService para mantener archivos < 500 LOC.
 *
 * Tiene findBoleta local (sin dep circular).
 */
@Injectable()
export class BoletasPdfService {
  constructor(private prisma: PrismaService) {}

  // Finder local: busca boleta con sus relaciones, lanza NotFoundException si no existe.
  private async findBoleta(id: number, empresaId: number) {
    const boleta = await this.prisma.boleta.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        planilla_detalle: true,
        empleado: {
          include: {
            area: true,
            cargo: true,
            sede: { include: { cliente: true } },
            regimen_pensionario: true,
            banco_haberes: true,
          },
        },
      },
    });
    if (!boleta) {
      throw new NotFoundException('Boleta no encontrada');
    }
    return boleta;
  }

  async generarPdf(id: number, empresaId: number): Promise<Buffer> {
    const boleta = await this.findBoleta(id, empresaId);
    const detalle = boleta.planilla_detalle;
    const empleado = boleta.empleado;

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        razon_social: true,
        ruc: true,
        direccion: true,
        logo_url: true,
        firma_representante_url: true,
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // A4 horizontal: 841.89 x 595.28 points (297 x 210 mm)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const margin = 10;
      const separacion = 8;
      const boletaWidth = (pageWidth - margin * 2 - separacion) / 2; // ~406 cada boleta
      const boletaHeight = pageHeight - margin * 2; // ~575

      // Boleta izquierda (EMPLEADOR)
      dibujarBoletaA4(
        doc,
        margin,
        margin,
        boleta,
        detalle,
        empleado,
        empresa,
        boletaWidth,
        boletaHeight,
        'EMPLEADOR',
      );

      // Línea divisoria vertical (punteada para cortar)
      const lineaX = pageWidth / 2;
      doc.save();
      doc.strokeColor('#666666');
      doc.dash(5, { space: 3 });
      doc
        .moveTo(lineaX, 5)
        .lineTo(lineaX, pageHeight - 5)
        .stroke();
      doc.restore();

      // Boleta derecha (EMPLEADO)
      dibujarBoletaA4(
        doc,
        lineaX + separacion / 2,
        margin,
        boleta,
        detalle,
        empleado,
        empresa,
        boletaWidth,
        boletaHeight,
        'EMPLEADO',
      );

      doc.end();
    });
  }

  /**
   * Dibuja una boleta individual en formato A4 horizontal - FORMATO ERMIR v2
   * Diseño aprobado: Paleta monocromática + 3 columnas (INGRESOS | AFP/ONP | DESCUENTOS)
   * @see boleta-pdf.ts
   */
  async descargarPdf(
    id: number,
    empresaId: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const boleta = await this.findBoleta(id, empresaId);

    // Actualizar tracking
    const updateData: Prisma.BoletaUpdateInput = {
      fecha_ultimo_acceso: ahoraPeru().toJSDate(),
      veces_descargada: { increment: 1 },
    };

    if (!boleta.fecha_primera_descarga) {
      updateData.fecha_primera_descarga = ahoraPeru().toJSDate();
      updateData.estado = EstadoBoleta.DESCARGADA;
    }

    await this.prisma.boleta.update({
      where: { id },
      data: updateData,
    });

    const buffer = await this.generarPdf(id, empresaId);
    const empleado = boleta.empleado;

    // Formato: {ID}-BOLETA_{Apellidos} {DD-MM-YY}.pdf
    const empleadoId = boleta.empleado_id;
    const apellidos =
      `${empleado.apellido_paterno} ${empleado.apellido_materno || ''}`.trim();
    const fechaFormateada = `01-${boleta.mes.toString().padStart(2, '0')}-${boleta.anio.toString().slice(-2)}`;
    const filename = `${empleadoId}-BOLETA_${apellidos} ${fechaFormateada}.pdf`;

    return { buffer, filename };
  }

  /**
   * Genera PDF con múltiples boletas (2 copias por página en A4 horizontal)
   * Útil para impresión masiva - mismo formato que boleta individual
   */
  async generarPdfMasivo(
    planillaId: number,
    empresaId: number,
  ): Promise<{ buffer: Buffer; filename: string; cantidad: number }> {
    const boletas = await this.prisma.boleta.findMany({
      where: {
        empresa_id: empresaId,
        planilla_detalle: {
          planilla_id: planillaId,
        },
      },
      include: {
        empleado: {
          include: {
            area: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
            regimen_pensionario: { select: { nombre: true, tipo: true } },
            banco_haberes: { select: { nombre: true } },
          },
        },
        planilla_detalle: {
          include: {
            planilla: {
              select: { anio: true, mes: true },
            },
          },
        },
      },
      orderBy: [
        { empleado: { apellido_paterno: 'asc' } },
        { empleado: { apellido_materno: 'asc' } },
      ],
    });

    if (boletas.length === 0) {
      throw new NotFoundException(
        'No se encontraron boletas para esta planilla',
      );
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        razon_social: true,
        ruc: true,
        direccion: true,
        logo_url: true,
        firma_representante_url: true,
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // A4 horizontal: 841.89 x 595.28 points
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const planilla = boletas[0].planilla_detalle.planilla;
        const meses = [
          'Ene',
          'Feb',
          'Mar',
          'Abr',
          'May',
          'Jun',
          'Jul',
          'Ago',
          'Sep',
          'Oct',
          'Nov',
          'Dic',
        ];
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `Boletas_${meses[planilla.mes - 1]}${planilla.anio}.pdf`,
          cantidad: boletas.length,
        });
      });
      doc.on('error', reject);

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const margin = 10;
      const separacion = 8;
      const boletaWidth = (pageWidth - margin * 2 - separacion) / 2;
      const boletaHeight = pageHeight - margin * 2;

      for (let i = 0; i < boletas.length; i++) {
        const boleta = boletas[i];
        const detalle = boleta.planilla_detalle;
        const empleado = boleta.empleado;

        if (i > 0) {
          doc.addPage();
        }

        // Boleta izquierda (EMPLEADOR)
        dibujarBoletaA4(
          doc,
          margin,
          margin,
          boleta,
          detalle,
          empleado,
          empresa,
          boletaWidth,
          boletaHeight,
          'EMPLEADOR',
        );

        // Línea divisoria vertical (punteada para cortar)
        const lineaX = pageWidth / 2;
        doc.save();
        doc.strokeColor('#666666');
        doc.dash(5, { space: 3 });
        doc
          .moveTo(lineaX, 5)
          .lineTo(lineaX, pageHeight - 5)
          .stroke();
        doc.restore();

        // Boleta derecha (EMPLEADO)
        dibujarBoletaA4(
          doc,
          lineaX + separacion / 2,
          margin,
          boleta,
          detalle,
          empleado,
          empresa,
          boletaWidth,
          boletaHeight,
          'EMPLEADO',
        );
      }

      doc.end();
    });
  }
}
