import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { Prisma, PlantillaDocumento } from '@prisma/client';
import { GenerarDocumentoDto } from './dto';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import {
  ahoraPeru,
  formatearFechaPeru,
  obtenerNombreMes,
} from '../../common/utils/datetime.util';

const PizZip = require('pizzip');

const Docxtemplater = require('docxtemplater');
import * as ExcelJS from 'exceljs';
import { DateTime } from 'luxon';

// Variables conocidas del sistema
const VARIABLES_CONOCIDAS = new Set([
  'nombres',
  'apellido_paterno',
  'apellido_materno',
  'apellidos',
  'nombre_completo',
  'tipo_documento',
  'numero_documento',
  'fecha_nacimiento',
  'sexo',
  'direccion',
  'referencia',
  'distrito',
  'provincia',
  'departamento',
  'telefono',
  'celular',
  'email',
  'estado_civil',
  'nacionalidad',
  'estatura',
  'peso',
  'categoria_licencia',
  'fecha_ingreso',
  'area',
  'cargo',
  'sede',
  'cliente',
  'sueldo_base',
  'tipo_pago',
  'turno',
  'regimen_pensionario',
  'cuspp',
  'banco_haberes',
  'nro_cuenta_haberes',
  'cci_haberes',
  'banco_cts',
  'nro_cuenta_cts',
  'cci_cts',
  'empresa_ruc',
  'empresa_razon_social',
  'empresa_nombre_comercial',
  'empresa_direccion',
  'empresa_representante',
  'fecha_actual',
  'fecha_actual_texto',
  'anio_actual',
  'mes_actual',
  'dia_actual',
]);

// Include compartido para las relaciones del empleado usadas en la generacion
// de documentos (datos personales, laborales, bancarios y de empresa).
const EMPLEADO_GENERACION_INCLUDE = {
  area: true,
  cargo: true,
  sede: { include: { cliente: true } },
  distrito: {
    include: { provincia: { include: { departamento: true } } },
  },
  regimen_pensionario: true,
  banco_haberes: true,
  banco_cts: true,
  empresa: true,
} satisfies Prisma.EmpleadoInclude;

/**
 * Empleado con las relaciones base necesarias para reemplazar variables.
 */
type EmpleadoParaVariables = Prisma.EmpleadoGetPayload<{
  include: typeof EMPLEADO_GENERACION_INCLUDE;
}>;

/**
 * Empleado con las relaciones base mas el contrato vigente (usado al generar
 * un documento individual con datos contractuales).
 */
type EmpleadoConContrato = EmpleadoParaVariables & {
  contratos?: Prisma.ContratoGetPayload<object>[];
};

/**
 * Mapa de variables resuelto a partir de un empleado, listo para inyectar en
 * la plantilla. Las claves planas son strings; las anidadas son objetos string.
 */
type MapaVariables = Record<string, string | Record<string, string>>;

@Injectable()
export class BancoDocumentosGeneracionService {
  private readonly logger = new Logger(BancoDocumentosGeneracionService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  // ==================== VARIABLES DISPONIBLES ====================

  private readonly variablesDisponibles = {
    empleado: [
      { key: 'nombres', descripcion: 'Nombres del empleado' },
      { key: 'apellido_paterno', descripcion: 'Apellido paterno' },
      { key: 'apellido_materno', descripcion: 'Apellido materno' },
      { key: 'apellidos', descripcion: 'Apellidos completos' },
      { key: 'nombre_completo', descripcion: 'Nombre completo' },
      {
        key: 'tipo_documento',
        descripcion: 'Tipo de documento (DNI, CE, etc.)',
      },
      { key: 'numero_documento', descripcion: 'Número de documento' },
      { key: 'fecha_nacimiento', descripcion: 'Fecha de nacimiento' },
      { key: 'sexo', descripcion: 'Sexo (M/F)' },
      { key: 'direccion', descripcion: 'Dirección domiciliaria' },
      { key: 'referencia', descripcion: 'Referencia de dirección' },
      { key: 'distrito', descripcion: 'Distrito de residencia' },
      { key: 'provincia', descripcion: 'Provincia de residencia' },
      { key: 'departamento', descripcion: 'Departamento de residencia' },
      { key: 'telefono', descripcion: 'Teléfono fijo' },
      { key: 'celular', descripcion: 'Número de celular' },
      { key: 'email', descripcion: 'Correo electrónico' },
      { key: 'estado_civil', descripcion: 'Estado civil' },
      { key: 'nacionalidad', descripcion: 'Nacionalidad' },
      { key: 'estatura', descripcion: 'Estatura en metros' },
      { key: 'peso', descripcion: 'Peso en kg' },
      { key: 'edad', descripcion: 'Edad actual en años' },
      {
        key: 'categoria_licencia',
        descripcion: 'Categoría de licencia de conducir',
      },
    ],
    laboral: [
      { key: 'fecha_ingreso', descripcion: 'Fecha de ingreso' },
      { key: 'area', descripcion: 'Área de trabajo' },
      { key: 'cargo', descripcion: 'Cargo del empleado' },
      { key: 'sede', descripcion: 'Sede de trabajo' },
      { key: 'cliente', descripcion: 'Cliente donde labora' },
      { key: 'sueldo_base', descripcion: 'Sueldo base' },
      { key: 'tipo_pago', descripcion: 'Tipo de pago (Planilla/Recibo)' },
      { key: 'turno', descripcion: 'Turno de trabajo (DIA/NOCHE)' },
      { key: 'regimen_pensionario', descripcion: 'Régimen pensionario' },
      { key: 'cuspp', descripcion: 'Código CUSPP' },
    ],
    bancario: [
      { key: 'banco_haberes', descripcion: 'Banco para haberes' },
      { key: 'nro_cuenta_haberes', descripcion: 'Número de cuenta haberes' },
      { key: 'cci_haberes', descripcion: 'CCI haberes' },
      { key: 'banco_cts', descripcion: 'Banco para CTS' },
      { key: 'nro_cuenta_cts', descripcion: 'Número de cuenta CTS' },
      { key: 'cci_cts', descripcion: 'CCI CTS' },
    ],
    empresa: [
      { key: 'empresa_ruc', descripcion: 'RUC de la empresa' },
      { key: 'empresa_razon_social', descripcion: 'Razón social' },
      { key: 'empresa_nombre_comercial', descripcion: 'Nombre comercial' },
      { key: 'empresa_direccion', descripcion: 'Dirección de la empresa' },
      { key: 'empresa_representante', descripcion: 'Representante legal' },
    ],
    sistema: [
      { key: 'fecha_actual', descripcion: 'Fecha actual (DD/MM/YYYY)' },
      { key: 'fecha_actual_texto', descripcion: 'Fecha actual en texto' },
      { key: 'anio_actual', descripcion: 'Año actual' },
      { key: 'mes_actual', descripcion: 'Mes actual' },
      { key: 'dia_actual', descripcion: 'Día actual' },
    ],
  };

  getVariablesDisponibles() {
    return this.variablesDisponibles;
  }

  // ==================== EXTRACCION DE VARIABLES ====================

  async extractVariables(
    file: Express.Multer.File,
    cleanup: boolean = true,
  ): Promise<{ variables: string[] }> {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo');
    }

    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path) {
      // Si se usa DiskStorage, leer el archivo
      buffer = readFileSync(file.path);
    } else {
      throw new BadRequestException('No se pudo leer el archivo subido');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    let result: { variables: string[] };

    try {
      if (ext === 'docx') {
        result = { variables: this.extractVariablesFromWord(buffer) };
      } else if (ext === 'xlsx') {
        const variables = await this.extractVariablesFromExcel(buffer);
        result = { variables };
      } else {
        throw new BadRequestException(
          'Formato de archivo no soportado. Use .docx o .xlsx',
        );
      }
    } finally {
      // Limpiar archivo temporal si existe ruta (fue guardado en disco)
      // Solo si se solicita limpieza (cleaning=true)
      if (cleanup && file.path && existsSync(file.path)) {
        try {
          unlinkSync(file.path);
        } catch (e) {
          this.logger.warn(
            `No se pudo eliminar el archivo temporal: ${file.path}`,
          );
        }
      }
    }

    return result;
  }

  private extractVariablesFromWord(buffer: Buffer): string[] {
    try {
      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      });

      const fullText = doc.getFullText();
      const variableRegex = /\{\{([\w\.]+)\}\}/g;
      const variables = new Set<string>();
      let match;

      while ((match = variableRegex.exec(fullText)) !== null) {
        variables.add(match[1].trim());
      }

      return Array.from(variables);
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al extraer variables de Word: ${mensaje}`);
      throw new BadRequestException(
        'Error al leer el archivo Word. Verifique que no esté corrupto.',
      );
    }
  }

  private async extractVariablesFromExcel(buffer: Buffer): Promise<string[]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const variables = new Set<string>();
      // Regex para capturar texto dentro de {{ }}
      // Soporta caracteres alfanuméricos, puntos y guiones bajos
      const variableRegex = /\{\{([\w\.]+)\}\}/g;

      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            if (cell.value && typeof cell.value === 'string') {
              let match;
              // Reiniciamos lastIndex para búsqeuda global en nueva celda (aunque creamos nuevo regex en loop si declaramos dentro)
              // Mejor usar matchAll o exec en loop
              const cellValue = cell.value;
              while ((match = variableRegex.exec(cellValue)) !== null) {
                variables.add(match[1].trim());
              }
            } else if (
              cell.value &&
              typeof cell.value === 'object' &&
              'richText' in cell.value
            ) {
              // Soporte para texto enriquecido (RichText)
              const richText = cell.value;
              const text = richText.richText.map((rt) => rt.text).join('');
              let match;
              while ((match = variableRegex.exec(text)) !== null) {
                variables.add(match[1].trim());
              }
            }
          });
        });
      });

      return Array.from(variables);
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al extraer variables de Excel: ${mensaje}`);
      throw new BadRequestException(
        'Error al leer el archivo Excel. Verifique que no esté corrupto.',
      );
    }
  }

  // ==================== DOCUMENTOS GENERADOS ====================

  async generarDocumento(
    dto: GenerarDocumentoDto,
    empresaId: number,
    usuarioId: number,
  ) {
    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
      include: {
        area: true,
        cargo: true,
        sede: { include: { cliente: true } },
        distrito: {
          include: { provincia: { include: { departamento: true } } },
        },
        regimen_pensionario: true,
        banco_haberes: true,
        banco_cts: true,
        empresa: true,
        contratos: {
          where: { estado: 'ACTIVO' },
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Verificar que la plantilla existe y está activa
    const plantilla = await this.prisma.plantillaDocumento.findFirst({
      where: {
        id: dto.plantilla_documento_id,
        empresa_id: empresaId,
        activo: true,
      },
    });

    if (!plantilla) {
      throw new NotFoundException(
        'Plantilla de documento no encontrada o inactiva',
      );
    }

    // Validar estado del empleado según categoría de documento
    this.validarEstadoEmpleadoParaCategoria(
      empleado.estado,
      plantilla.categoria,
    );

    // Verificar que no exista un documento pendiente/firmado para esta combinación
    const documentoExistente = await this.prisma.documentoGenerado.findFirst({
      where: {
        empleado_id: dto.empleado_id,
        plantilla_documento_id: dto.plantilla_documento_id,
        estado: { not: 'RECHAZADO' }, // Se permite si el anterior fue rechazado
      },
    });

    if (documentoExistente) {
      throw new ConflictException(
        'Ya existe un documento de esta plantilla para este empleado. Si necesita regenerarlo, primero rechace el existente.',
      );
    }

    const variables = this.obtenerMapaVariables(empleado);
    const contenidoGenerado = null;
    let archivoUrl = null;

    // Generar documento físico (WORD o EXCEL)
    const { buffer, filename, mimeType } = await this.generarArchivoFisico(
      plantilla,
      empleado,
      variables,
    );

    // Subir el archivo generado
    const timestamp = Date.now();
    const outputKey = `documentos_generados/${filename}`;
    archivoUrl = await this.uploadsService.uploadFile(
      buffer,
      outputKey,
      mimeType,
    );

    // Crear el documento generado en la BD
    const documentoGenerado = await this.prisma.documentoGenerado.create({
      data: {
        empleado_id: dto.empleado_id,
        plantilla_documento_id: dto.plantilla_documento_id,
        contenido_generado: contenidoGenerado,
        archivo_url: archivoUrl,
        estado: 'PENDIENTE',
        generado_por: usuarioId,
        observaciones: dto.observaciones,
      },
      include: {
        plantilla_documento: true,
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
      },
    });

    // Retornar buffer y metadata para descarga directa
    return {
      buffer,
      filename,
      mimeType,
      documentoGenerado,
    };
  }

  /**
   * Genera un archivo físico (Word o Excel) a partir de una plantilla
   */
  private async generarArchivoFisico(
    plantilla: PlantillaDocumento,
    empleado: EmpleadoConContrato,
    variables: MapaVariables,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    if (!plantilla.archivo_base_url) {
      throw new BadRequestException(
        'La plantilla no tiene un archivo base configurado',
      );
    }

    // -------------------------------------------------------------
    // SOLUCIÓN ROBUSTA PARA OBTENER EL BUFFER DEL ARCHIVO
    // -------------------------------------------------------------
    let templateBuffer: Buffer;
    let plantillaKey = plantilla.archivo_base_url;

    // 1. Si es URL completa (http/https), extraer la key real
    if (plantillaKey.startsWith('http')) {
      // Patrones: /files/key/KEY, /files/local/KEY, /files/public/KEY
      // Nota: El key suele estar al final, posiblemente url-encoded
      const match = plantillaKey.match(/\/files\/(?:key|local|public)\/(.+)$/);
      if (match) {
        plantillaKey = decodeURIComponent(match[1]);
      }
    }
    // 2. Si es path relativo con /uploads/ (Local Legacy)
    else if (plantillaKey.startsWith('/uploads/')) {
      plantillaKey = plantillaKey.replace(/^\/uploads\//, '');
    }
    // 3. Limpiar slashes iniciales por si acaso
    plantillaKey = plantillaKey.replace(/^\/+/, '');

    try {
      templateBuffer = await this.uploadsService.getFileBuffer(plantillaKey);
    } catch (error) {
      this.logger.error(
        `Error recuperando archivo plantilla: ${plantillaKey}`,
        error,
      );
      throw new NotFoundException(
        'Error al recuperar el archivo de la plantilla. Verifique que el archivo exista.',
      );
    }
    // -------------------------------------------------------------

    // Preparar nombre de archivo de salida
    const extension = plantilla.tipo_archivo === 'WORD' ? 'docx' : 'xlsx';
    const timestamp = Date.now();
    const fileName = `doc_${plantilla.codigo}_${empleado.numero_documento}_${timestamp}.${extension}`;
    const outputKey = `documentos_generados/${fileName}`;

    let outputBuffer: Buffer;

    if (plantilla.tipo_archivo === 'WORD') {
      try {
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '{{', end: '}}' },
        });

        doc.render(variables);
        outputBuffer = doc.getZip().generate({ type: 'nodebuffer' });
      } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error generando Word: ${mensaje}`, error);
        throw new InternalServerErrorException(
          `Error generando documento Word: ${mensaje}`,
        );
      }
    } else if (plantilla.tipo_archivo === 'EXCEL') {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(templateBuffer);

        workbook.eachSheet((worksheet) => {
          worksheet.eachRow((row) => {
            row.eachCell((cell) => {
              if (typeof cell.value === 'string') {
                let text = cell.value;
                // Reemplazar variables en la celda
                text = text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
                  const valor = variables[key];
                  return typeof valor === 'string' ? valor : match;
                });
                cell.value = text;
              }
            });
          });
        });

        outputBuffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
      } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error generando Excel: ${mensaje}`, error);
        throw new InternalServerErrorException(
          `Error generando documento Excel: ${mensaje}`,
        );
      }
    }

    const mimeType =
      plantilla.tipo_archivo === 'WORD'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    // Retornar buffer y metadata en lugar de subir
    return {
      buffer: outputBuffer,
      filename: fileName,
      mimeType,
    };
  }

  /**
   * Obtiene el mapa completo de variables para un empleado
   */
  private obtenerMapaVariables(empleado: EmpleadoConContrato): MapaVariables {
    const fechaActualPeru = ahoraPeru();
    const dia = fechaActualPeru.day;
    const mes = fechaActualPeru.month;
    const anio = fechaActualPeru.year;

    let edad = '';
    if (empleado.fecha_nacimiento) {
      const nac = DateTime.fromJSDate(empleado.fecha_nacimiento);
      edad = Math.floor(fechaActualPeru.diff(nac, 'years').years).toString();
    }

    const flatVariables = {
      // Empleado
      nombres: empleado.nombres || '',
      apellido_paterno: empleado.apellido_paterno || '',
      apellido_materno: empleado.apellido_materno || '',
      apellidos:
        `${empleado.apellido_paterno || ''} ${empleado.apellido_materno || ''}`.trim(),
      nombre_completo:
        `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`.trim(),
      tipo_documento: empleado.tipo_documento || '',
      numero_documento: empleado.numero_documento || '',
      fecha_nacimiento: empleado.fecha_nacimiento
        ? formatearFechaPeru(empleado.fecha_nacimiento)
        : '',
      sexo: empleado.sexo || '',
      direccion: empleado.direccion || '',
      referencia: empleado.referencia || '',
      distrito: empleado.distrito?.nombre || '',
      provincia: empleado.distrito?.provincia?.nombre || '',
      departamento: empleado.distrito?.provincia?.departamento?.nombre || '',
      telefono: empleado.telefono || '',
      celular: empleado.celular || '',
      email: empleado.email || '',
      estado_civil: empleado.estado_civil || '',
      nacionalidad: empleado.nacionalidad || '',
      estatura: empleado.estatura?.toString() || '',
      peso: empleado.peso?.toString() || '',
      categoria_licencia: empleado.categoria_licencia || '',
      edad: edad,

      // Laboral
      fecha_ingreso: empleado.fecha_ingreso
        ? formatearFechaPeru(empleado.fecha_ingreso)
        : '',
      area: empleado.area?.nombre || '',
      cargo: empleado.cargo?.nombre || '',
      sede: empleado.sede?.nombre || '',
      cliente: empleado.sede?.cliente?.razon_social || '',
      sueldo_base: empleado.sueldo_base?.toString() || '',
      tipo_pago: empleado.tipo_pago || '',
      turno: empleado.turno || '',
      regimen_pensionario: empleado.regimen_pensionario?.nombre || '',
      cuspp: empleado.cuspp || '',

      // Bancario
      banco_haberes: empleado.banco_haberes?.nombre || '',
      nro_cuenta_haberes: empleado.nro_cuenta_haberes || '',
      cci_haberes: empleado.cci_haberes || '',
      banco_cts: empleado.banco_cts?.nombre || '',
      nro_cuenta_cts: empleado.nro_cuenta_cts || '',
      cci_cts: empleado.cci_cts || '',

      // Empresa
      empresa_ruc: empleado.empresa?.ruc || '',
      empresa_razon_social: empleado.empresa?.razon_social || '',
      empresa_nombre_comercial: empleado.empresa?.nombre_comercial || '',
      empresa_direccion: empleado.empresa?.direccion || '',
      empresa_representante: empleado.empresa?.representante_legal || '',

      // Sistema
      fecha_actual: fechaActualPeru.toFormat('dd/MM/yyyy'),
      fecha_actual_texto: `${dia} de ${obtenerNombreMes(mes)} del ${anio}`,
      anio_actual: anio.toString(),
      mes_actual: obtenerNombreMes(mes),
      dia_actual: dia.toString().padStart(2, '0'),
    };

    // Obtener contrato vigente si existe
    const contratoVigente = empleado.contratos?.[0];

    // Construir objetos anidados para compatibilidad con plantillas (ej: empleado.nombre_completo)
    return {
      ...flatVariables,
      empleado: {
        nombres: flatVariables.nombres,
        apellido_paterno: flatVariables.apellido_paterno,
        apellido_materno: flatVariables.apellido_materno,
        apellidos: flatVariables.apellidos,
        nombre_completo: flatVariables.nombre_completo,
        tipo_documento: flatVariables.tipo_documento,
        numero_documento: flatVariables.numero_documento,
        fecha_nacimiento: flatVariables.fecha_nacimiento,
        edad: flatVariables.edad,
        sexo: flatVariables.sexo,
        direccion: flatVariables.direccion,
        distrito: flatVariables.distrito,
        provincia: flatVariables.provincia,
        departamento: flatVariables.departamento,
        telefono: flatVariables.telefono,
        celular: flatVariables.celular,
        email: flatVariables.email,
        cargo: flatVariables.cargo, // A veces se usa empleado.cargo
      },
      contrato: {
        fecha_ingreso: contratoVigente?.fecha_inicio
          ? formatearFechaPeru(contratoVigente.fecha_inicio)
          : flatVariables.fecha_ingreso,
        fecha_inicio: contratoVigente?.fecha_inicio
          ? formatearFechaPeru(contratoVigente.fecha_inicio)
          : flatVariables.fecha_ingreso,
        fecha_fin: contratoVigente?.fecha_fin
          ? formatearFechaPeru(contratoVigente.fecha_fin)
          : '',
        fecha_firma: contratoVigente?.fecha_inicio
          ? formatearFechaPeru(contratoVigente.fecha_inicio)
          : flatVariables.fecha_actual,
        area: flatVariables.area,
        cargo: flatVariables.cargo,
        sede: flatVariables.sede,
        lugar_trabajo: contratoVigente?.lugar_trabajo || flatVariables.sede,
        empresa_cliente:
          contratoVigente?.empresa_cliente || flatVariables.cliente,
        sueldo:
          contratoVigente?.remuneracion?.toString() ||
          flatVariables.sueldo_base,
        remuneracion:
          contratoVigente?.remuneracion?.toString() ||
          flatVariables.sueldo_base,
        tipo_contrato: contratoVigente?.tipo_contrato || '',
        modalidad: contratoVigente?.modalidad || '',
      },
      empresa: {
        ruc: flatVariables.empresa_ruc,
        razon_social: flatVariables.empresa_razon_social,
        direccion: flatVariables.empresa_direccion,
        representante: flatVariables.empresa_representante,
      },
    };
  }

  /**
   * Valida que el estado del empleado sea compatible con la categoría de documento
   */
  validarEstadoEmpleadoParaCategoria(
    estadoEmpleado: string,
    categoriaDocumento: string,
  ): void {
    const estadosValidos: Record<string, string[]> = {
      INGRESO: ['ACTIVO', 'NUEVO', 'EN_PROCESO'],
      LABORAL: ['ACTIVO'],
      SALIDA: ['ACTIVO', 'CESADO', 'EN_PROCESO'],
    };

    const permitidos = estadosValidos[categoriaDocumento] || ['ACTIVO'];

    if (!permitidos.includes(estadoEmpleado)) {
      throw new BadRequestException(
        `No se pueden generar documentos de ${categoriaDocumento} para un empleado en estado ${estadoEmpleado}`,
      );
    }
  }

  private reemplazarVariables(
    contenido: string,
    empleado: EmpleadoParaVariables,
  ): string {
    // Usar zona horaria Peru para todas las fechas
    const fechaActualPeru = ahoraPeru();
    const dia = fechaActualPeru.day;
    const mes = fechaActualPeru.month; // Luxon usa 1-12, no 0-11
    const anio = fechaActualPeru.year;

    const variables: Record<string, string> = {
      // Empleado
      nombres: empleado.nombres || '',
      apellido_paterno: empleado.apellido_paterno || '',
      apellido_materno: empleado.apellido_materno || '',
      apellidos:
        `${empleado.apellido_paterno || ''} ${empleado.apellido_materno || ''}`.trim(),
      nombre_completo:
        `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`.trim(),
      tipo_documento: empleado.tipo_documento || '',
      numero_documento: empleado.numero_documento || '',
      fecha_nacimiento: empleado.fecha_nacimiento
        ? formatearFechaPeru(empleado.fecha_nacimiento)
        : '',
      sexo: empleado.sexo || '',
      direccion: empleado.direccion || '',
      referencia: empleado.referencia || '',
      distrito: empleado.distrito?.nombre || '',
      provincia: empleado.distrito?.provincia?.nombre || '',
      departamento: empleado.distrito?.provincia?.departamento?.nombre || '',
      telefono: empleado.telefono || '',
      celular: empleado.celular || '',
      email: empleado.email || '',
      estado_civil: empleado.estado_civil || '',
      nacionalidad: empleado.nacionalidad || '',
      estatura: empleado.estatura?.toString() || '',
      peso: empleado.peso?.toString() || '',
      categoria_licencia: empleado.categoria_licencia || '',

      // Laboral
      fecha_ingreso: empleado.fecha_ingreso
        ? formatearFechaPeru(empleado.fecha_ingreso)
        : '',
      area: empleado.area?.nombre || '',
      cargo: empleado.cargo?.nombre || '',
      sede: empleado.sede?.nombre || '',
      cliente: empleado.sede?.cliente?.razon_social || '',
      sueldo_base: empleado.sueldo_base?.toString() || '',
      tipo_pago: empleado.tipo_pago || '',
      turno: empleado.turno || '',
      regimen_pensionario: empleado.regimen_pensionario?.nombre || '',
      cuspp: empleado.cuspp || '',

      // Bancario
      banco_haberes: empleado.banco_haberes?.nombre || '',
      nro_cuenta_haberes: empleado.nro_cuenta_haberes || '',
      cci_haberes: empleado.cci_haberes || '',
      banco_cts: empleado.banco_cts?.nombre || '',
      nro_cuenta_cts: empleado.nro_cuenta_cts || '',
      cci_cts: empleado.cci_cts || '',

      // Empresa
      empresa_ruc: empleado.empresa?.ruc || '',
      empresa_razon_social: empleado.empresa?.razon_social || '',
      empresa_nombre_comercial: empleado.empresa?.nombre_comercial || '',
      empresa_direccion: empleado.empresa?.direccion || '',
      empresa_representante: empleado.empresa?.representante_legal || '',

      // Sistema - usando zona horaria Peru
      fecha_actual: fechaActualPeru.toFormat('dd/MM/yyyy'),
      fecha_actual_texto: `${dia} de ${obtenerNombreMes(mes)} del ${anio}`,
      anio_actual: anio.toString(),
      mes_actual: obtenerNombreMes(mes),
      dia_actual: dia.toString().padStart(2, '0'),
    };

    // Reemplazo optimizado en una sola pasada
    const resultado = contenido.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (variables.hasOwnProperty(key)) {
        return variables[key];
      }
      return match; // Mantener la variable si no se encuentra
    });

    // Detectar variables no reemplazadas
    const variablesNoReemplazadas = resultado.match(/\{\{(\w+)\}\}/g);
    if (variablesNoReemplazadas && variablesNoReemplazadas.length > 0) {
      const variablesDesconocidas = variablesNoReemplazadas.filter(
        (v) => !VARIABLES_CONOCIDAS.has(v.replace(/\{\{|\}\}/g, '')),
      );
      if (variablesDesconocidas.length > 0) {
        throw new BadRequestException(
          `La plantilla contiene variables no reconocidas: ${variablesDesconocidas.join(', ')}. Verifique los nombres de las variables.`,
        );
      }
    }

    return resultado;
  }

  // Exposed for use by BancoDocumentosService (generarDocumentosMasivo)
  reemplazarVariablesPublico(
    contenido: string,
    empleado: EmpleadoParaVariables,
  ): string {
    return this.reemplazarVariables(contenido, empleado);
  }
}
