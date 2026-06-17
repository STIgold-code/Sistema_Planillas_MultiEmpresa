import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { PlantillasContratoDocsService } from './plantillas-contrato-docs.service';
import { extractVariablesFromWordFile as extractVariablesFromWordFileHelper } from './plantillas-contrato-word-utils';
import {
  CreatePlantillaContratoDto,
  UpdatePlantillaContratoDto,
  FilterPlantillaContratoDto,
} from './dto';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { UPLOADS_DIR } from '../uploads/uploads.config';
import { convert } from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(convert);
import {
  formatearFechaPeru,
  formatearFechaLargaPeru,
  fechaHoyPeru,
  ahoraPeru,
} from '../../common/utils/datetime.util';

// Variables disponibles para las plantillas
export const VARIABLES_DISPONIBLES = {
  empleado: [
    {
      key: '{{empleado.nombre_completo}}',
      descripcion: 'Nombre completo (Apellidos y Nombres)',
    },
    { key: '{{empleado.nombres}}', descripcion: 'Solo nombres' },
    { key: '{{empleado.apellido_paterno}}', descripcion: 'Apellido paterno' },
    { key: '{{empleado.apellido_materno}}', descripcion: 'Apellido materno' },
    {
      key: '{{empleado.tipo_documento}}',
      descripcion: 'Tipo de documento (DNI, CE)',
    },
    {
      key: '{{empleado.numero_documento}}',
      descripcion: 'Número de documento',
    },
    { key: '{{empleado.direccion}}', descripcion: 'Dirección del domicilio' },
    { key: '{{empleado.distrito}}', descripcion: 'Distrito' },
    { key: '{{empleado.provincia}}', descripcion: 'Provincia' },
    { key: '{{empleado.departamento}}', descripcion: 'Departamento' },
    { key: '{{empleado.cargo}}', descripcion: 'Cargo del empleado' },
    { key: '{{empleado.area}}', descripcion: 'Área del empleado' },
    { key: '{{empleado.sede}}', descripcion: 'Sede asignada' },
    { key: '{{empleado.sueldo}}', descripcion: 'Sueldo base' },
    {
      key: '{{empleado.fecha_nacimiento}}',
      descripcion: 'Fecha de nacimiento',
    },
    { key: '{{empleado.sexo}}', descripcion: 'Sexo (M/F)' },
  ],
  genero: [
    { key: '{{g.el}}', descripcion: 'El/La según sexo del empleado' },
    { key: '{{g.del}}', descripcion: 'del/de la según sexo' },
    { key: '{{g.al}}', descripcion: 'al/a la según sexo' },
    { key: '{{g.un}}', descripcion: 'un/una según sexo' },
    { key: '{{g.el_trabajador}}', descripcion: 'El trabajador/La trabajadora' },
    { key: '{{g.trabajador}}', descripcion: 'trabajador/trabajadora' },
    { key: '{{g.empleado}}', descripcion: 'empleado/empleada' },
    { key: '{{g.contratado}}', descripcion: 'contratado/contratada' },
    { key: '{{g.colaborador}}', descripcion: 'colaborador/colaboradora' },
    { key: '{{g.interesado}}', descripcion: 'interesado/interesada' },
    { key: '{{g.el_interesado}}', descripcion: 'el interesado/la interesada' },
    { key: '{{g.mismo}}', descripcion: 'mismo/misma' },
    { key: '{{g.dicho}}', descripcion: 'dicho/dicha' },
    { key: '{{g.referido}}', descripcion: 'referido/referida' },
    { key: '{{g.suscrito}}', descripcion: 'suscrito/suscrita' },
    { key: '{{g.obligado}}', descripcion: 'obligado/obligada' },
    { key: '{{g.denominado}}', descripcion: 'denominado/denominada' },
    {
      key: 'El(La) trabajador(a)',
      descripcion: 'Sintaxis alternativa: escribir directamente en el Word',
    },
  ],
  contrato: [
    {
      key: '{{contrato.fecha_inicio}}',
      descripcion: 'Fecha de inicio del contrato',
    },
    { key: '{{contrato.fecha_fin}}', descripcion: 'Fecha de fin del contrato' },
    {
      key: '{{contrato.fecha_firma}}',
      descripcion: 'Fecha de firma del contrato',
    },
    { key: '{{contrato.remuneracion}}', descripcion: 'Remuneración mensual' },
    {
      key: '{{contrato.empresa_cliente}}',
      descripcion: 'Empresa cliente (intermediación)',
    },
    { key: '{{contrato.lugar_trabajo}}', descripcion: 'Lugar de trabajo' },
    { key: '{{contrato.tipo_contrato}}', descripcion: 'Tipo de contrato' },
    { key: '{{contrato.modalidad}}', descripcion: 'Modalidad de trabajo' },
  ],
  empresa: [
    {
      key: '{{empresa.razon_social}}',
      descripcion: 'Razón social de la empresa',
    },
    { key: '{{empresa.ruc}}', descripcion: 'RUC de la empresa' },
    { key: '{{empresa.direccion}}', descripcion: 'Dirección de la empresa' },
    {
      key: '{{empresa.representante}}',
      descripcion: 'Nombre del representante legal',
    },
    {
      key: '{{empresa.dni_representante}}',
      descripcion: 'DNI del representante legal',
    },
    {
      key: '{{empresa.cargo_representante}}',
      descripcion: 'Cargo del representante',
    },
    {
      key: '{{empresa.partida_electronica}}',
      descripcion: 'Partida electrónica',
    },
  ],
  sistema: [
    { key: '{{fecha_actual}}', descripcion: 'Fecha actual (dd/mm/yyyy)' },
    {
      key: '{{fecha_actual_texto}}',
      descripcion: 'Fecha actual en texto (01 de enero de 2025)',
    },
  ],
};

@Injectable()
export class PlantillasContratoService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private plantillasContratoDocsService: PlantillasContratoDocsService,
  ) {}

  async findAll(empresaId: number, filters: FilterPlantillaContratoDto) {
    const { buscar, tipo_contrato, activo, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PlantillaContratoWhereInput = {
      empresa_id: empresaId,
    };

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    if (tipo_contrato) {
      where.tipo_contrato = tipo_contrato;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    const [data, total] = await Promise.all([
      this.prisma.plantillaContrato.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          tipo_contrato: true,
          activo: true,
          es_predeterminada: true,
          archivo_base_url: true,
          variables: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: { contratos: true },
          },
        },
      }),
      this.prisma.plantillaContrato.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, empresaId: number) {
    const plantilla = await this.prisma.plantillaContrato.findFirst({
      where: { id, empresa_id: empresaId },
    });

    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    return plantilla;
  }

  async create(empresaId: number, dto: CreatePlantillaContratoDto) {
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

    // SEGURIDAD (mass assignment + IDOR): validar propiedad del archivo base
    // referenciado por el cliente contra la empresa.
    const archivoBaseUrl = dto.archivo_base_url
      ? await this.uploadsService.resolverKeyPropia(
          dto.archivo_base_url,
          empresaId,
        )
      : dto.archivo_base_url;

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
        contenido: dto.contenido,
        variables: dto.variables || [],
        archivo_base_url: archivoBaseUrl,
        activo: dto.activo ?? true,
        es_predeterminada: dto.es_predeterminada ?? false,
        empresa_id: empresaId,
      },
    });
  }

  async update(id: number, empresaId: number, dto: UpdatePlantillaContratoDto) {
    const plantilla = await this.findOne(id, empresaId);

    // Verificar nombre único si cambió
    if (dto.nombre && dto.nombre !== plantilla.nombre) {
      const exists = await this.prisma.plantillaContrato.findFirst({
        where: {
          nombre: dto.nombre,
          empresa_id: empresaId,
          id: { not: id },
        },
      });

      if (exists) {
        throw new ConflictException('Ya existe una plantilla con este nombre');
      }
    }

    // Si es predeterminada, quitar predeterminada de otras del mismo tipo
    if (dto.es_predeterminada) {
      const tipoContrato = dto.tipo_contrato || plantilla.tipo_contrato;
      await this.prisma.plantillaContrato.updateMany({
        where: {
          empresa_id: empresaId,
          tipo_contrato: tipoContrato,
          es_predeterminada: true,
          id: { not: id },
        },
        data: { es_predeterminada: false },
      });
    }

    return this.prisma.plantillaContrato.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, empresaId: number) {
    const plantilla = await this.findOne(id, empresaId);

    // Verificar si tiene contratos asociados
    const contratosCount = await this.prisma.contrato.count({
      where: { plantilla_id: id },
    });

    if (contratosCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la plantilla porque tiene ${contratosCount} contrato(s) asociado(s)`,
      );
    }

    // Eliminar archivo de Wasabi/Local si existe
    if (plantilla.archivo_base_url) {
      try {
        await this.uploadsService.deleteFileHybrid(plantilla.archivo_base_url);
      } catch (error) {
        console.error('Error eliminando archivo de plantilla:', error);
        // Continuamos con la eliminación del registro aunque falle el archivo
      }
    }

    await this.prisma.plantillaContrato.delete({
      where: { id },
    });

    return { message: 'Plantilla eliminada correctamente' };
  }

  async duplicar(id: number, empresaId: number, nuevoNombre?: string) {
    const plantilla = await this.findOne(id, empresaId);

    const nombre = nuevoNombre || `${plantilla.nombre} (copia)`;

    // Verificar nombre único
    const exists = await this.prisma.plantillaContrato.findFirst({
      where: {
        nombre,
        empresa_id: empresaId,
      },
    });

    if (exists) {
      throw new ConflictException('Ya existe una plantilla con este nombre');
    }

    return this.prisma.plantillaContrato.create({
      data: {
        nombre,
        descripcion: plantilla.descripcion,
        tipo_contrato: plantilla.tipo_contrato,
        contenido: plantilla.contenido,
        variables: plantilla.variables || [],
        archivo_base_url: plantilla.archivo_base_url,
        activo: true,
        es_predeterminada: false,
        empresa_id: empresaId,
      },
    });
  }

  // Obtener variables disponibles
  getVariables() {
    return VARIABLES_DISPONIBLES;
  }

  // Obtener tipos de contrato disponibles
  async getTiposContrato(empresaId: number) {
    const tipos = await this.prisma.plantillaContrato.findMany({
      where: { empresa_id: empresaId },
      select: { tipo_contrato: true },
      distinct: ['tipo_contrato'],
    });

    return tipos.map((t) => t.tipo_contrato);
  }

  // Vista previa con datos de ejemplo
  async preview(id: number, empresaId: number, empleadoId?: number) {
    const plantilla = await this.findOne(id, empresaId);

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

      if (empleado && empresa) {
        contenidoReemplazado = this.reemplazarVariables(
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

  // Reemplazar variables con datos reales
  reemplazarVariables(
    contenido: string,
    empleado: any,
    empresa: any,
    contrato: any,
  ): string {
    let resultado = contenido;

    // Variables de empleado
    const nombreCompleto = `${empleado.apellido_paterno} ${empleado.apellido_materno} ${empleado.nombres}`;
    resultado = resultado.replace(
      /\{\{empleado\.nombre_completo\}\}/g,
      nombreCompleto,
    );
    resultado = resultado.replace(
      /\{\{empleado\.nombres\}\}/g,
      empleado.nombres || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.apellido_paterno\}\}/g,
      empleado.apellido_paterno || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.apellido_materno\}\}/g,
      empleado.apellido_materno || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.tipo_documento\}\}/g,
      empleado.tipo_documento || 'DNI',
    );
    resultado = resultado.replace(
      /\{\{empleado\.numero_documento\}\}/g,
      empleado.numero_documento || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.direccion\}\}/g,
      empleado.direccion || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.distrito\}\}/g,
      empleado.distrito?.nombre || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.provincia\}\}/g,
      empleado.distrito?.provincia?.nombre || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.departamento\}\}/g,
      empleado.distrito?.provincia?.departamento?.nombre || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.cargo\}\}/g,
      empleado.cargo?.nombre || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.area\}\}/g,
      empleado.area?.nombre || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.sede\}\}/g,
      empleado.sede?.nombre || '',
    );
    resultado = resultado.replace(
      /\{\{empleado\.sueldo\}\}/g,
      empleado.sueldo_base?.toString() || '0',
    );
    resultado = resultado.replace(
      /\{\{empleado\.sexo\}\}/g,
      empleado.sexo || '',
    );

    // Variables de género
    const esFemenino = empleado.sexo === 'F';
    resultado = resultado.replace(/\{\{g\.el\}\}/g, esFemenino ? 'La' : 'El');
    resultado = resultado.replace(
      /\{\{g\.del\}\}/g,
      esFemenino ? 'de la' : 'del',
    );
    resultado = resultado.replace(/\{\{g\.al\}\}/g, esFemenino ? 'a la' : 'al');
    resultado = resultado.replace(/\{\{g\.un\}\}/g, esFemenino ? 'una' : 'un');
    resultado = resultado.replace(
      /\{\{g\.el_trabajador\}\}/g,
      esFemenino ? 'La trabajadora' : 'El trabajador',
    );
    resultado = resultado.replace(
      /\{\{g\.trabajador\}\}/g,
      esFemenino ? 'trabajadora' : 'trabajador',
    );
    resultado = resultado.replace(
      /\{\{g\.empleado\}\}/g,
      esFemenino ? 'empleada' : 'empleado',
    );
    resultado = resultado.replace(
      /\{\{g\.contratado\}\}/g,
      esFemenino ? 'contratada' : 'contratado',
    );
    resultado = resultado.replace(
      /\{\{g\.colaborador\}\}/g,
      esFemenino ? 'colaboradora' : 'colaborador',
    );
    resultado = resultado.replace(
      /\{\{g\.interesado\}\}/g,
      esFemenino ? 'interesada' : 'interesado',
    );
    resultado = resultado.replace(
      /\{\{g\.el_interesado\}\}/g,
      esFemenino ? 'la interesada' : 'el interesado',
    );
    resultado = resultado.replace(
      /\{\{g\.mismo\}\}/g,
      esFemenino ? 'misma' : 'mismo',
    );
    resultado = resultado.replace(
      /\{\{g\.dicho\}\}/g,
      esFemenino ? 'dicha' : 'dicho',
    );
    resultado = resultado.replace(
      /\{\{g\.referido\}\}/g,
      esFemenino ? 'referida' : 'referido',
    );
    resultado = resultado.replace(
      /\{\{g\.suscrito\}\}/g,
      esFemenino ? 'suscrita' : 'suscrito',
    );
    resultado = resultado.replace(
      /\{\{g\.obligado\}\}/g,
      esFemenino ? 'obligada' : 'obligado',
    );
    resultado = resultado.replace(
      /\{\{g\.denominado\}\}/g,
      esFemenino ? 'denominada' : 'denominado',
    );

    if (empleado.fecha_nacimiento) {
      resultado = resultado.replace(
        /\{\{empleado\.fecha_nacimiento\}\}/g,
        formatearFechaPeru(empleado.fecha_nacimiento),
      );
    }

    // Variables de empresa
    resultado = resultado.replace(
      /\{\{empresa\.razon_social\}\}/g,
      empresa.razon_social || '',
    );
    resultado = resultado.replace(/\{\{empresa\.ruc\}\}/g, empresa.ruc || '');
    resultado = resultado.replace(
      /\{\{empresa\.direccion\}\}/g,
      empresa.direccion || '',
    );
    resultado = resultado.replace(
      /\{\{empresa\.representante\}\}/g,
      empresa.representante_legal || '',
    );
    resultado = resultado.replace(
      /\{\{empresa\.dni_representante\}\}/g,
      empresa.dni_representante || '',
    );
    resultado = resultado.replace(
      /\{\{empresa\.cargo_representante\}\}/g,
      empresa.cargo_representante || '',
    );
    resultado = resultado.replace(
      /\{\{empresa\.partida_electronica\}\}/g,
      empresa.partida_electronica || '',
    );

    // Variables de contrato
    if (contrato) {
      resultado = resultado.replace(
        /\{\{contrato\.fecha_inicio\}\}/g,
        contrato.fecha_inicio ? formatearFechaPeru(contrato.fecha_inicio) : '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.fecha_fin\}\}/g,
        contrato.fecha_fin ? formatearFechaPeru(contrato.fecha_fin) : '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.fecha_firma\}\}/g,
        contrato.fecha_firma ? formatearFechaPeru(contrato.fecha_firma) : '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.remuneracion\}\}/g,
        contrato.remuneracion?.toString() || '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.empresa_cliente\}\}/g,
        contrato.empresa_cliente || '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.lugar_trabajo\}\}/g,
        contrato.lugar_trabajo || '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.tipo_contrato\}\}/g,
        contrato.tipo_contrato || '',
      );
      resultado = resultado.replace(
        /\{\{contrato\.modalidad\}\}/g,
        contrato.modalidad || '',
      );
    }

    // Variables de sistema - usando zona horaria Peru
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

  // Reemplazar con datos de ejemplo para preview
  private reemplazarConEjemplos(contenido: string): string {
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

  // ==========================================
  /**
   * Obtiene el buffer del archivo Word de una plantilla desde Wasabi.
   */
  async getWordBuffer(archivoBaseUrl: string): Promise<Buffer> {
    return this.uploadsService.getFileBuffer(archivoBaseUrl);
  }

  // MÉTODOS PARA VALIDACIÓN DE VARIABLES
  // ==========================================

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

  /**
   * Valida las variables extraídas de un Word contra las conocidas.
   * Retorna variables válidas, inválidas con sugerencias, y un resumen.
   */
  validateExtractedVariables(extractedVariables: string[]): {
    valid: string[];
    invalid: Array<{
      variable: string;
      suggestion: string | null;
    }>;
    hasErrors: boolean;
    summary: string;
  } {
    const knownVars = this.getAllKnownVariableKeys();
    const valid: string[] = [];
    const invalid: Array<{ variable: string; suggestion: string | null }> = [];

    for (const variable of extractedVariables) {
      if (knownVars.includes(variable)) {
        valid.push(variable);
      } else {
        const suggestion = this.findClosestVariable(variable, knownVars);
        invalid.push({ variable, suggestion });
      }
    }

    const hasErrors = invalid.length > 0;
    let summary: string;
    if (!hasErrors) {
      summary = `Todas las ${valid.length} variables son válidas.`;
    } else {
      summary = `${valid.length} variables válidas, ${invalid.length} no reconocidas.`;
    }

    return { valid, invalid, hasErrors, summary };
  }

  /**
   * Genera preview de un archivo Word con datos de ejemplo.
   * Extrae el texto del Word, reemplaza variables con ejemplos,
   * y resalta variables no reemplazadas.
   */
  previewWordFile(file: string | Buffer): {
    text: string;
    unreplacedVariables: string[];
  } {
    let content: Buffer;
    if (Buffer.isBuffer(file)) {
      content = file;
    } else {
      content = fs.readFileSync(file);
    }

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    const fullText = doc.getFullText();
    const replaced = this.reemplazarConEjemplos(fullText);

    // Detectar variables que quedaron sin reemplazar
    const unreplacedRegex = /\{\{([^}]+)\}\}/g;
    const unreplaced: string[] = [];
    let match;
    while ((match = unreplacedRegex.exec(replaced)) !== null) {
      const variable = `{{${match[1]}}}`;
      if (!unreplaced.includes(variable)) {
        unreplaced.push(variable);
      }
    }

    return { text: replaced, unreplacedVariables: unreplaced };
  }

  // MÉTODOS PARA MANEJO DE ARCHIVOS WORD
  // ==========================================

  // Extraer variables de un archivo Word — delega al helper compartido
  extractVariablesFromWordFile(file: string | Buffer): string[] {
    return extractVariablesFromWordFileHelper(file);
  }

  // Crear plantilla desde archivo Word subido

  // ==================== GENERACION DE DOCUMENTOS (delega a PlantillasContratoDocsService) ====================

  async createFromWord(
    empresaId: number,
    dto: CreatePlantillaContratoDto,
    originalFilename: string,
    filePath: string,
  ) {
    return this.plantillasContratoDocsService.createFromWord(
      empresaId,
      dto,
      originalFilename,
      filePath,
    );
  }

  async generateContractDocument(
    plantillaId: number,
    empresaId: number,
    empleadoId: number,
    contratoData?: any,
    formato: 'docx' | 'pdf' = 'pdf',
  ): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    return this.plantillasContratoDocsService.generateContractDocument(
      plantillaId,
      empresaId,
      empleadoId,
      contratoData,
      formato,
    );
  }

  async updateWordFile(
    id: number,
    empresaId: number,
    originalFilename: string,
    filePath: string,
  ) {
    return this.plantillasContratoDocsService.updateWordFile(
      id,
      empresaId,
      originalFilename,
      filePath,
    );
  }
}
