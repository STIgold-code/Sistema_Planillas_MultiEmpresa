import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePlantillaContratoDto } from './dto';
import {
  ContratoDataPlantilla,
  EmpleadoParaDocumento,
  EmpresaParaDocumento,
} from './plantillas-contrato-docs.service';
import * as fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { convert } from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(convert);
import {
  formatearFechaPeru,
  formatearFechaLargaPeru,
  fechaHoyPeru,
  ahoraPeru,
} from '../../common/utils/datetime.util';

// Variables disponibles para las plantillas (importadas para uso interno)
import { VARIABLES_DISPONIBLES } from './plantillas-contrato.service';

@Injectable()
export class PlantillasContratoGeneracionService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  /**
   * Obtiene todas las variables conocidas como lista plana de strings.
   */
  private getAllKnownVariableKeys(): string[] {
    const keys: string[] = [];
    for (const category of Object.values(VARIABLES_DISPONIBLES)) {
      for (const v of category) {
        if (v.key.startsWith('{{')) {
          keys.push(v.key);
        }
      }
    }
    return keys;
  }

  /**
   * Calcula la distancia de Levenshtein entre dos strings.
   */
  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[a.length][b.length];
  }

  /**
   * Busca la variable conocida más similar a una variable desconocida.
   * Retorna la sugerencia si la distancia es <= maxDistance.
   */
  private findClosestVariable(
    unknown: string,
    knownVars: string[],
    maxDistance = 5,
  ): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    for (const known of knownVars) {
      const dist = this.levenshtein(unknown.toLowerCase(), known.toLowerCase());
      if (dist < bestDist) {
        bestDist = dist;
        best = known;
      }
    }
    return bestDist <= maxDistance ? best : null;
  }

  // Reemplazar con datos de ejemplo para preview
  reemplazarConEjemplos(contenido: string): string {
    let resultado = contenido;

    // Ejemplos de empleado
    resultado = resultado.replace(
      /\{\{empleado\.nombre_completo\}\}/g,
      'GARCIA LOPEZ JUAN CARLOS',
    );
    resultado = resultado.replace(/\{\{empleado\.nombres\}\}/g, 'JUAN CARLOS');
    resultado = resultado.replace(
      /\{\{empleado\.apellido_paterno\}\}/g,
      'GARCIA',
    );
    resultado = resultado.replace(
      /\{\{empleado\.apellido_materno\}\}/g,
      'LOPEZ',
    );
    resultado = resultado.replace(/\{\{empleado\.tipo_documento\}\}/g, 'DNI');
    resultado = resultado.replace(
      /\{\{empleado\.numero_documento\}\}/g,
      '12345678',
    );
    resultado = resultado.replace(
      /\{\{empleado\.direccion\}\}/g,
      'AV. EJEMPLO 123, URB. DEMO',
    );
    resultado = resultado.replace(/\{\{empleado\.distrito\}\}/g, 'SAN ISIDRO');
    resultado = resultado.replace(/\{\{empleado\.provincia\}\}/g, 'LIMA');
    resultado = resultado.replace(/\{\{empleado\.departamento\}\}/g, 'LIMA');
    resultado = resultado.replace(
      /\{\{empleado\.cargo\}\}/g,
      'AGENTE DE VIGILANCIA PRIVADA',
    );
    resultado = resultado.replace(/\{\{empleado\.area\}\}/g, 'SEGURIDAD');
    resultado = resultado.replace(/\{\{empleado\.sede\}\}/g, 'SEDE CENTRAL');
    resultado = resultado.replace(/\{\{empleado\.sueldo\}\}/g, '1,130.00');
    resultado = resultado.replace(
      /\{\{empleado\.fecha_nacimiento\}\}/g,
      '15/05/1990',
    );
    resultado = resultado.replace(/\{\{empleado\.sexo\}\}/g, 'M');

    // Ejemplos de género (masculino por defecto en preview)
    resultado = resultado.replace(/\{\{g\.el\}\}/g, 'El');
    resultado = resultado.replace(/\{\{g\.del\}\}/g, 'del');
    resultado = resultado.replace(/\{\{g\.al\}\}/g, 'al');
    resultado = resultado.replace(/\{\{g\.un\}\}/g, 'un');
    resultado = resultado.replace(/\{\{g\.el_trabajador\}\}/g, 'El trabajador');
    resultado = resultado.replace(/\{\{g\.trabajador\}\}/g, 'trabajador');
    resultado = resultado.replace(/\{\{g\.empleado\}\}/g, 'empleado');
    resultado = resultado.replace(/\{\{g\.contratado\}\}/g, 'contratado');
    resultado = resultado.replace(/\{\{g\.colaborador\}\}/g, 'colaborador');
    resultado = resultado.replace(/\{\{g\.interesado\}\}/g, 'interesado');
    resultado = resultado.replace(/\{\{g\.el_interesado\}\}/g, 'el interesado');
    resultado = resultado.replace(/\{\{g\.mismo\}\}/g, 'mismo');
    resultado = resultado.replace(/\{\{g\.dicho\}\}/g, 'dicho');
    resultado = resultado.replace(/\{\{g\.referido\}\}/g, 'referido');
    resultado = resultado.replace(/\{\{g\.suscrito\}\}/g, 'suscrito');
    resultado = resultado.replace(/\{\{g\.obligado\}\}/g, 'obligado');
    resultado = resultado.replace(/\{\{g\.denominado\}\}/g, 'denominado');

    // Ejemplos de empresa
    resultado = resultado.replace(
      /\{\{empresa\.razon_social\}\}/g,
      'CONSULTORA Y EJECUTORA ERMIR S.A.C.',
    );
    resultado = resultado.replace(/\{\{empresa\.ruc\}\}/g, '20605001875');
    resultado = resultado.replace(
      /\{\{empresa\.direccion\}\}/g,
      'AV. BRASIL NRO. 840 DPTO. 1504',
    );
    resultado = resultado.replace(
      /\{\{empresa\.representante\}\}/g,
      'ARAUJO SANCHEZ OSCAR',
    );
    resultado = resultado.replace(
      /\{\{empresa\.dni_representante\}\}/g,
      '27075597',
    );
    resultado = resultado.replace(
      /\{\{empresa\.cargo_representante\}\}/g,
      'GERENTE GENERAL',
    );
    resultado = resultado.replace(
      /\{\{empresa\.partida_electronica\}\}/g,
      '14325059',
    );

    // Ejemplos de contrato
    resultado = resultado.replace(
      /\{\{contrato\.fecha_inicio\}\}/g,
      '01/02/2025',
    );
    resultado = resultado.replace(/\{\{contrato\.fecha_fin\}\}/g, '31/07/2025');
    resultado = resultado.replace(
      /\{\{contrato\.fecha_firma\}\}/g,
      '28/01/2025',
    );
    resultado = resultado.replace(
      /\{\{contrato\.remuneracion\}\}/g,
      '1,130.00',
    );
    resultado = resultado.replace(
      /\{\{contrato\.empresa_cliente\}\}/g,
      'MUNICIPALIDAD DE SAN ISIDRO',
    );
    resultado = resultado.replace(
      /\{\{contrato\.lugar_trabajo\}\}/g,
      'AV. RIVERA NAVARRETE 501, SAN ISIDRO',
    );
    resultado = resultado.replace(
      /\{\{contrato\.tipo_contrato\}\}/g,
      'PLAZO FIJO',
    );
    resultado = resultado.replace(/\{\{contrato\.modalidad\}\}/g, 'PRESENCIAL');

    // Ejemplos de sistema - usando zona horaria Peru
    const hoyPeru = ahoraPeru();
    resultado = resultado.replace(
      /\{\{fecha_actual\}\}/g,
      hoyPeru.toFormat('dd/MM/yyyy'),
    );
    resultado = resultado.replace(
      /\{\{fecha_actual_texto\}\}/g,
      formatearFechaLargaPeru(hoyPeru.toJSDate()),
    );

    return resultado;
  }

  // Vista previa con datos de ejemplo
  async preview(
    id: number,
    empresaId: number,
    empleadoId?: number,
    reemplazarVariablesFn?: (
      contenido: string,
      empleado: EmpleadoParaDocumento,
      empresa: NonNullable<EmpresaParaDocumento>,
      contrato: ContratoDataPlantilla | null,
    ) => string,
  ) {
    const plantilla = await this.prisma.plantillaContrato.findFirst({
      where: { id, empresa_id: empresaId },
    });

    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    let contenidoReemplazado = plantilla.contenido;

    if (empleadoId) {
      // Obtener datos del empleado para preview real
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

      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
      });

      if (empleado && empresa && reemplazarVariablesFn) {
        contenidoReemplazado = reemplazarVariablesFn(
          plantilla.contenido,
          empleado,
          empresa,
          null,
        );
      }
    } else {
      // Preview con datos de ejemplo
      contenidoReemplazado = this.reemplazarConEjemplos(plantilla.contenido);
    }

    return {
      plantilla,
      contenido_preview: contenidoReemplazado,
    };
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

  // Formatear moneda
  formatCurrency(value: number | Prisma.Decimal | null | undefined): string {
    if (!value) return '0.00';
    const numero = typeof value === 'number' ? value : Number(value);
    return numero.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Preparar datos para docxtemplater (formato plano con puntos)
  prepareDocumentData(
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

  // Generar documento de contrato desde plantilla Word
  async generateContractDocument(
    plantillaId: number,
    empresaId: number,
    empleadoId: number,
    contratoData?: ContratoDataPlantilla,
    formato: 'docx' | 'pdf' = 'pdf',
  ): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    // Obtener plantilla
    const plantilla = await this.prisma.plantillaContrato.findFirst({
      where: { id: plantillaId, empresa_id: empresaId },
    });

    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }

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

  // Crear plantilla desde archivo Word subido
  async createFromWord(
    empresaId: number,
    dto: CreatePlantillaContratoDto,
    originalFilename: string, // Cambiado de fileUrl a nombre original
    filePath: string,
    extractVariablesFn: (file: string | Buffer) => string[],
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
    const variables = extractVariablesFn(fileBuffer);

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
}
