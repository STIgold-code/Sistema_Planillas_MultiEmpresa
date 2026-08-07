import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Prisma, EstadoBoleta } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dibujarBoletaA4, ImagenesEmpresaBoleta } from './boleta-pdf';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { obtenerMensajeError } from '../../common/utils/error.util';
import { UploadsService } from '../uploads/uploads.service';
import { extraerKeyDeValor } from '../uploads/archivo-key.util';
import { OrdenBoletasMasivo } from './dto';

/** Referencias de imagen guardadas en la empresa (key o URL del proxy). */
interface ReferenciasImagenEmpresa {
  logo_url: string | null;
  firma_representante_url: string | null;
}

/**
 * Traduce el criterio de orden pedido por el usuario al `orderBy` de Prisma.
 * Exportada para poder probarla y para que el criterio viva en un solo lugar.
 */
export function resolverOrdenBoletas(
  orden: OrdenBoletasMasivo,
): Prisma.BoletaOrderByWithRelationInput[] {
  if (orden === OrdenBoletasMasivo.CODIGO) {
    return [{ empleado_id: 'asc' }];
  }
  return [
    { empleado: { apellido_paterno: 'asc' } },
    { empleado: { apellido_materno: 'asc' } },
  ];
}

/**
 * Servicio dedicado a la generacion de PDF de boletas (individual + masivo).
 * Extraido de BoletasService para mantener archivos < 500 LOC.
 *
 * Tiene findBoleta local (sin dep circular).
 */
@Injectable()
export class BoletasPdfService {
  private readonly logger = new Logger(BoletasPdfService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  /**
   * Descarga una imagen de la empresa (logo o firma) desde el almacenamiento
   * a partir de la referencia guardada, que puede ser una key cruda o una URL
   * del proxy de archivos.
   *
   * Devuelve `null` ante cualquier problema (sin referencia, referencia no
   * mapeable a key, archivo inexistente): la boleta se emite sin la imagen.
   */
  private async cargarImagen(
    referencia: string | null,
  ): Promise<Buffer | null> {
    if (!referencia) {
      return null;
    }

    const key = extraerKeyDeValor(referencia);
    if (!key) {
      this.logger.warn(
        `[BOLETA_PDF] Referencia de imagen no mapeable a key: ${referencia}`,
      );
      return null;
    }

    try {
      return await this.uploadsService.getFileBuffer(key);
    } catch (error: unknown) {
      this.logger.warn(
        `[BOLETA_PDF] No se pudo cargar la imagen ${key}: ${obtenerMensajeError(error)}`,
      );
      return null;
    }
  }

  /**
   * Resuelve logo y firma de la empresa a Buffer. Se invoca UNA sola vez por
   * request (tambien en el masivo) y el resultado se reutiliza en todas las
   * boletas y en ambas copias de cada pagina.
   */
  private async cargarImagenesEmpresa(
    empresa: ReferenciasImagenEmpresa,
  ): Promise<ImagenesEmpresaBoleta> {
    const [logo, firma] = await Promise.all([
      this.cargarImagen(empresa.logo_url),
      this.cargarImagen(empresa.firma_representante_url),
    ]);
    return { logo, firma };
  }

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

    const imagenes = await this.cargarImagenesEmpresa(empresa);

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
        imagenes,
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
        imagenes,
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
   *
   * @param orden Criterio de ordenamiento de las boletas dentro del PDF.
   */
  async generarPdfMasivo(
    planillaId: number,
    empresaId: number,
    orden: OrdenBoletasMasivo = OrdenBoletasMasivo.APELLIDO,
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
      orderBy: resolverOrdenBoletas(orden),
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

    // Una sola descarga de logo y firma para TODO el lote.
    const imagenes = await this.cargarImagenesEmpresa(empresa);

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
          imagenes,
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
          imagenes,
        );
      }

      doc.end();
    });
  }
}
