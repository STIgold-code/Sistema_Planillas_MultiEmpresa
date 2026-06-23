import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { convert } from 'libreoffice-convert';
import { promisify } from 'util';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { extractVariablesFromWordFile } from './plantillas-contrato-word-utils';
import { CreatePlantillaContratoDto } from './dto';

/**
 * Empleado con las relaciones cargadas para la generación de documentos
 * (cargo, área, sede y la cadena geográfica distrito → provincia → departamento).
 */
export type EmpleadoParaDocumento = Prisma.EmpleadoGetPayload<{
  include: {
    cargo: true;
    area: true;
    sede: true;
    distrito: {
      include: {
        provincia: {
          include: { departamento: true };
        };
      };
    };
  };
}>;

/**
 * Empresa tal como se obtiene de Prisma para la generación de documentos.
 * Puede ser null si no se encuentra.
 */
export type EmpresaParaDocumento = Prisma.EmpresaGetPayload<object> | null;

/**
 * Datos de contrato usados para rellenar la plantilla. Todos los campos son
 * opcionales porque pueden provenir del cuerpo de la petición o resolverse
 * desde el contrato activo del empleado.
 */
export interface ContratoDataPlantilla {
  fecha_inicio?: Date | string | null;
  fecha_fin?: Date | string | null;
  fecha_firma?: Date | string | null;
  remuneracion?: number | null;
  empresa_cliente?: string | null;
  lugar_trabajo?: string | null;
  tipo_contrato?: string | null;
  modalidad?: string | null;
}
import {
  formatearFechaPeru,
  formatearFechaLargaPeru,
  fechaHoyPeru,
  ahoraPeru,
} from '../../common/utils/datetime.util';

const convertAsync = promisify(convert);

/**
 * Servicio dedicado a la generacion de documentos de contrato (Word/PDF) y
 * la creacion/actualizacion de plantillas a partir de archivos Word subidos.
 *
 * Extraido de PlantillasContratoService para mantener el archivo principal
 * por debajo de 1.000 LOC. Tiene su propio finder de plantilla (sin circular
 * dep) y reutiliza extractVariablesFromWordFile via plantillas-contrato-word-utils.
 */
@Injectable()
export class PlantillasContratoDocsService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  // Finder local (evita dep circular con el service principal).
  private async findPlantilla(id: number, empresaId: number) {
    const plantilla = await this.prisma.plantillaContrato.findFirst({
      where: { id, empresa_id: empresaId },
    });
    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return plantilla;
  }

  async createFromWord(
    empresaId: number,
    dto: CreatePlantillaContratoDto,
    originalFilename: string, // Cambiado de fileUrl a nombre original
    filePath: string,
  ) {
    // Verificar nombre único
    const exists = await this.prisma.plantillaContrato.findFirst({
      where: {
        nombre: dto.nombre,
        empresa_id: empresaId,
      },
    });

    if (exists) {
      throw new ConflictException('Ya existe una plantilla con este nombre');
    }

    // Leer archivo a buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Extraer variables del Word
    const variables = extractVariablesFromWordFile(fileBuffer);

    // Generar key y subir
    const filename = this.uploadsService.generateFilename(
      'plantilla',
      originalFilename,
    );
    const key = `plantillas/${filename}`;

    // Subir a Wasabi o Local
    const storedPath = await this.uploadsService.uploadFile(
      fileBuffer,
      key,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Eliminar archivo temporal local
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Si es predeterminada, quitar predeterminada de otras del mismo tipo
    if (dto.es_predeterminada) {
      await this.prisma.plantillaContrato.updateMany({
        where: {
          empresa_id: empresaId,
          tipo_contrato: dto.tipo_contrato,
          es_predeterminada: true,
        },
        data: { es_predeterminada: false },
      });
    }

    return this.prisma.plantillaContrato.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        tipo_contrato: dto.tipo_contrato,
        contenido: '', // Vacío porque usamos archivo Word
        variables: variables,
        archivo_base_url: storedPath, // Guardamos el PATH, no la URL completa
        activo: dto.activo ?? true,
        es_predeterminada: dto.es_predeterminada ?? false,
        empresa_id: empresaId,
      },
    });
  }

  // Convertir DOCX a PDF usando LibreOffice
  private async convertToPdf(docxBuffer: Buffer): Promise<Buffer> {
    try {
      const pdfBuffer = await convertAsync(docxBuffer, 'pdf', undefined);
      return pdfBuffer;
    } catch (error: unknown) {
      console.error('Error en conversión PDF con LibreOffice:', error);
      throw new BadRequestException(
        'Error al generar el PDF. Verifique que LibreOffice esté instalado en el servidor.',
      );
    }
  }

  // Generar documento de contrato desde plantilla Word
  async generateContractDocument(
    plantillaId: number,
    empresaId: number,
    empleadoId: number,
    contratoData?: ContratoDataPlantilla,
    formato: 'docx' | 'pdf' = 'pdf',
  ): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    // Obtener plantilla
    const plantilla = await this.findPlantilla(plantillaId, empresaId);

    if (!plantilla.archivo_base_url) {
      throw new BadRequestException(
        'La plantilla no tiene un archivo Word asociado',
      );
    }

    // Obtener empleado con relaciones
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
      include: {
        cargo: true,
        area: true,
        sede: true,
        distrito: {
          include: {
            provincia: {
              include: { departamento: true },
            },
          },
        },
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Obtener empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    // Obtener contenido del archivo (Híbrido)
    let content: Buffer;
    try {
      content = await this.uploadsService.getFileBuffer(
        plantilla.archivo_base_url,
      );
    } catch {
      throw new NotFoundException('No se pudo leer el archivo de la plantilla');
    }

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    // Si no se pasaron datos de contrato, buscar el contrato activo del empleado
    let contratoFinal: ContratoDataPlantilla | undefined = contratoData;
    if (!contratoFinal) {
      const contratoActivo = await this.prisma.contrato.findFirst({
        where: {
          empleado_id: empleadoId,
          estado: { in: ['ACTIVO', 'RENOVADO', 'PENDIENTE'] },
        },
        include: { cliente: true },
        orderBy: [
          { estado: 'asc' }, // ACTIVO primero
          { fecha_inicio: 'desc' },
        ],
      });

      if (contratoActivo) {
        // Buscar el contrato original para obtener la fecha de firma inicial
        // (usado en adendas que referencian "el contrato celebrado con fecha...")
        const contratoOriginal = await this.prisma.contrato.findFirst({
          where: {
            empleado_id: empleadoId,
            vinculo_laboral_id: contratoActivo.vinculo_laboral_id,
            numero_renovacion: 1,
          },
        });

        contratoFinal = {
          fecha_inicio: contratoActivo.fecha_inicio,
          fecha_fin: contratoActivo.fecha_fin,
          fecha_firma:
            contratoOriginal?.fecha_inicio ||
            contratoActivo.fecha_firma ||
            contratoActivo.fecha_inicio,
          remuneracion: contratoActivo.remuneracion
            ? Number(contratoActivo.remuneracion)
            : undefined,
          empresa_cliente:
            contratoActivo.empresa_cliente ||
            contratoActivo.cliente?.razon_social ||
            '',
          lugar_trabajo: contratoActivo.lugar_trabajo || '',
          tipo_contrato: contratoActivo.tipo_contrato || '',
          modalidad: contratoActivo.modalidad || '',
        };
      }
    }

    // Preparar datos para reemplazo
    const data = this.prepareDocumentData(empleado, empresa, contratoFinal);

    // Reemplazar variables
    doc.render(data);

    // Aplicar transformación de género al documento (sintaxis El(La) trabajador(a))
    const renderedZip = doc.getZip();
    this.applyGenderToDocument(renderedZip, empleado.sexo || 'M');

    // Generar buffer del documento
    const buffer = renderedZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Generar nombre del archivo - usando fecha Peru
    const nombreEmpleado =
      `${empleado.apellido_paterno}_${empleado.apellido_materno}_${empleado.nombres}`
        .replace(/\s+/g, '_')
        .toUpperCase();
    const fecha = fechaHoyPeru(); // Formato YYYY-MM-DD en zona horaria Peru

    let finalBuffer = buffer;
    let finalFilename = `Contrato_${nombreEmpleado}_${fecha}.docx`;
    let mimetype =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // CONVERSIÓN A PDF CON LIBREOFFICE (100% fidelidad)
    if (formato === 'pdf') {
      try {
        finalBuffer = await this.convertToPdf(buffer);
        finalFilename = `Contrato_${nombreEmpleado}_${fecha}.pdf`;
        mimetype = 'application/pdf';
      } catch {
        // Si falla la conversión a PDF, devolver DOCX como fallback
        console.warn('⚠️ Conversión a PDF falló, devolviendo DOCX');
      }
    }

    return { buffer: finalBuffer, filename: finalFilename, mimetype };
  }

  // Preparar datos para docxtemplater (formato plano con puntos)
  private prepareDocumentData(
    empleado: EmpleadoParaDocumento,
    empresa: EmpresaParaDocumento,
    contrato: ContratoDataPlantilla | undefined,
  ) {
    // Usar zona horaria Peru para todas las fechas
    const hoyPeru = ahoraPeru();

    // Determinar si es femenino
    const esFemenino = empleado.sexo === 'F';

    return {
      // Variables de empleado
      'empleado.nombre_completo': `${empleado.apellido_paterno} ${empleado.apellido_materno} ${empleado.nombres}`,
      'empleado.nombres': empleado.nombres || '',
      'empleado.apellido_paterno': empleado.apellido_paterno || '',
      'empleado.apellido_materno': empleado.apellido_materno || '',
      'empleado.tipo_documento': empleado.tipo_documento || 'DNI',
      'empleado.numero_documento': empleado.numero_documento || '',
      'empleado.direccion': empleado.direccion || '',
      'empleado.distrito': empleado.distrito?.nombre || '',
      'empleado.provincia': empleado.distrito?.provincia?.nombre || '',
      'empleado.departamento':
        empleado.distrito?.provincia?.departamento?.nombre || '',
      'empleado.cargo': empleado.cargo?.nombre || '',
      'empleado.area': empleado.area?.nombre || '',
      'empleado.sede': empleado.sede?.nombre || '',
      'empleado.sueldo': this.formatCurrency(empleado.sueldo_base),
      'empleado.fecha_nacimiento': empleado.fecha_nacimiento
        ? formatearFechaPeru(empleado.fecha_nacimiento)
        : '',
      'empleado.sexo': empleado.sexo || '',

      // Variables de género (basadas en sexo del empleado)
      'g.el': esFemenino ? 'La' : 'El',
      'g.del': esFemenino ? 'de la' : 'del',
      'g.al': esFemenino ? 'a la' : 'al',
      'g.un': esFemenino ? 'una' : 'un',
      'g.el_trabajador': esFemenino ? 'La trabajadora' : 'El trabajador',
      'g.trabajador': esFemenino ? 'trabajadora' : 'trabajador',
      'g.empleado': esFemenino ? 'empleada' : 'empleado',
      'g.contratado': esFemenino ? 'contratada' : 'contratado',
      'g.colaborador': esFemenino ? 'colaboradora' : 'colaborador',
      'g.interesado': esFemenino ? 'interesada' : 'interesado',
      'g.el_interesado': esFemenino ? 'la interesada' : 'el interesado',
      'g.mismo': esFemenino ? 'misma' : 'mismo',
      'g.dicho': esFemenino ? 'dicha' : 'dicho',
      'g.referido': esFemenino ? 'referida' : 'referido',
      'g.suscrito': esFemenino ? 'suscrita' : 'suscrito',
      'g.obligado': esFemenino ? 'obligada' : 'obligado',
      'g.denominado': esFemenino ? 'denominada' : 'denominado',

      // Variables de empresa
      'empresa.razon_social': empresa?.razon_social || '',
      'empresa.ruc': empresa?.ruc || '',
      'empresa.direccion': empresa?.direccion || '',
      'empresa.representante': empresa?.representante_legal || '',
      'empresa.dni_representante': empresa?.dni_representante || '',
      'empresa.cargo_representante': empresa?.cargo_representante || '',
      'empresa.partida_electronica': empresa?.partida_electronica || '',

      // Variables de contrato - usando zona horaria Peru
      'contrato.fecha_inicio': contrato?.fecha_inicio
        ? formatearFechaPeru(contrato.fecha_inicio)
        : '',
      'contrato.fecha_fin': contrato?.fecha_fin
        ? formatearFechaPeru(contrato.fecha_fin)
        : '',
      'contrato.fecha_firma': contrato?.fecha_firma
        ? formatearFechaPeru(contrato.fecha_firma)
        : contrato?.fecha_inicio
          ? formatearFechaPeru(contrato.fecha_inicio)
          : '',
      'contrato.remuneracion': this.formatCurrency(
        contrato?.remuneracion || empleado.sueldo_base,
      ),
      'contrato.empresa_cliente': contrato?.empresa_cliente || '',
      'contrato.lugar_trabajo': contrato?.lugar_trabajo || '',
      'contrato.tipo_contrato': contrato?.tipo_contrato || '',
      'contrato.modalidad': contrato?.modalidad || '',

      // Variables de sistema - usando zona horaria Peru
      fecha_actual: hoyPeru.toFormat('dd/MM/yyyy'),
      fecha_actual_texto: formatearFechaLargaPeru(hoyPeru.toJSDate()),
    };
  }

  // Formatear moneda
  private formatCurrency(
    value: number | Prisma.Decimal | null | undefined,
  ): string {
    if (!value) return '0.00';
    const numero = typeof value === 'number' ? value : Number(value);
    return numero.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Transforma patrones de género en el texto según el sexo del empleado.
   * Sintaxis soportada: Palabra(Alternativa)
   * Ejemplos:
   *   - "El(La)" → "El" (M) o "La" (F)
   *   - "trabajador(a)" → "trabajador" (M) o "trabajadora" (F)
   *   - "contratado(a)" → "contratado" (M) o "contratada" (F)
   *   - "del(de la)" → "del" (M) o "de la" (F)
   */
  private applyGenderTransformation(text: string, sexo: string): string {
    const esFemenino = sexo === 'F';

    // Regex para capturar Palabra(Alternativa)
    // Soporta: El(La), trabajador(a), del(de la), etc.
    return text.replace(
      /([A-Za-záéíóúÁÉÍÓÚñÑüÜ]+)\(([^)]+)\)/g,
      (_match: string, base: string, alt: string) => {
        if (esFemenino) {
          // Si la alternativa es solo una letra (sufijo), concatenar a la base
          if (alt.length === 1) {
            return base + alt; // trabajador + a = trabajadora
          }
          // Si es palabra completa, usar solo la alternativa
          return alt; // El(La) → La
        } else {
          // Masculino: usar solo la base
          return base;
        }
      },
    );
  }

  /**
   * Aplica transformación de género al documento Word (ZIP) después del render.
   * Procesa todos los archivos XML del documento.
   */
  private applyGenderToDocument(zip: PizZip, sexo: string): void {
    // Archivos XML que pueden contener texto
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml',
      'word/header3.xml',
      'word/footer1.xml',
      'word/footer2.xml',
      'word/footer3.xml',
    ];

    for (const filename of xmlFiles) {
      const file = zip.file(filename);
      if (file) {
        let content = file.asText();
        // Aplicar transformación de género solo al contenido de texto (dentro de <w:t>)
        content = content.replace(
          /(<w:t[^>]*>)([^<]*)(<\/w:t>)/g,
          (_match: string, openTag: string, text: string, closeTag: string) => {
            const transformed = this.applyGenderTransformation(text, sexo);
            return openTag + transformed + closeTag;
          },
        );
        zip.file(filename, content);
      }
    }
  }

  // Actualizar archivo Word de una plantilla existente
  async updateWordFile(
    id: number,
    empresaId: number,
    originalFilename: string,
    filePath: string,
  ) {
    const plantilla = await this.findPlantilla(id, empresaId);

    // Leer archivo a buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Extraer nuevas variables
    const variables = extractVariablesFromWordFile(fileBuffer);

    // Generar key y subir
    const filename = this.uploadsService.generateFilename(
      'plantilla',
      originalFilename,
    );
    const key = `plantillas/${filename}`;

    const storedPath = await this.uploadsService.uploadFile(
      fileBuffer,
      key,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Eliminar archivo temporal
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Intentar eliminar el archivo anterior si existe
    if (plantilla.archivo_base_url) {
      try {
        await this.uploadsService.deleteFileHybrid(plantilla.archivo_base_url);
      } catch (error: unknown) {
        // Ignorar error si no se pudo borrar el viejo
        console.error('No se pudo eliminar archivo anterior:', error);
      }
    }

    return this.prisma.plantillaContrato.update({
      where: { id },
      data: {
        archivo_base_url: storedPath,
        variables: variables,
      },
    });
  }
}
