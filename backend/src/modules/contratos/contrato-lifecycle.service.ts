import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  BUSINESS_ERROR_MESSAGES,
  validarSueldoMinimo,
} from '../../common/constants/business-rules';
import { CreateContratoDto } from './dto';
import { Prisma } from '@prisma/client';

/**
 * Contrato con las relaciones necesarias para las operaciones de ciclo de vida.
 * Coincide con lo que retorna ContratosService.findOne (empleado, vínculo,
 * usuario, cliente). Solo se declaran los campos que estos métodos consumen.
 */
export type ContratoConRelaciones = Prisma.ContratoGetPayload<{
  include: {
    empleado: {
      select: {
        id: true;
        numero_documento: true;
        tipo_documento: true;
        nombres: true;
        apellido_paterno: true;
        apellido_materno: true;
        fecha_ingreso: true;
        area: { select: { id: true; nombre: true } };
        cargo: { select: { id: true; nombre: true } };
      };
    };
    vinculo_laboral: {
      select: {
        id: true;
        fecha_inicio: true;
        fecha_fin: true;
        estado: true;
        motivo_cierre: true;
      };
    };
    usuario: {
      select: { id: true; nombre_completo: true; email: true };
    };
    cliente: {
      select: {
        id: true;
        ruc: true;
        razon_social: true;
        nombre_comercial: true;
      };
    };
  };
}>;
import {
  ahoraPeru,
  formatearFechaPeru,
  sumarDiasPeru,
  parsearFechaISOenPeru,
  toDateOnly,
} from '../../common/utils/datetime.util';

@Injectable()
export class ContratoLifecycleService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  // Renovar contrato (marca el actual como RENOVADO y crea uno nuevo con historial)
  async renovar(
    id: number,
    empresaId: number,
    dto: CreateContratoDto,
    usuarioId: number,
    contratoActual: ContratoConRelaciones,
  ) {
    if (
      contratoActual.estado !== 'ACTIVO' &&
      contratoActual.estado !== 'PENDIENTE'
    ) {
      throw new BadRequestException(
        'Solo se pueden renovar contratos vigentes o vencidos',
      );
    }

    // Validación de continuidad de fechas
    if (contratoActual.fecha_fin) {
      const fechaFinActual = parsearFechaISOenPeru(
        toDateOnly(contratoActual.fecha_fin),
      );
      const fechaInicioNuevo = parsearFechaISOenPeru(dto.fecha_inicio);

      // El día siguiente al fin del contrato actual
      const fechaEsperada = sumarDiasPeru(fechaFinActual, 1);

      if (fechaInicioNuevo < fechaEsperada) {
        throw new BadRequestException(
          `La fecha de inicio del nuevo contrato debe ser ${formatearFechaPeru(fechaEsperada)} o posterior`,
        );
      }
    }

    // Validación: Remuneración mínima legal
    if (dto.remuneracion && !validarSueldoMinimo(dto.remuneracion)) {
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.SUELDO_MENOR_MINIMO}. Remuneración ingresada: S/. ${dto.remuneracion}`,
      );
    }

    // SEGURIDAD (mass assignment + IDOR): validar propiedad del archivo.
    const archivoUrl = dto.archivo_url
      ? await this.uploadsService.resolverKeyPropia(dto.archivo_url, empresaId)
      : dto.archivo_url;

    // Usar transacción para asegurar consistencia
    const nuevoContrato = await this.prisma.$transaction(async (tx) => {
      // Obtener el numero_renovacion actual para incrementarlo
      const numeroRenovacionActual = contratoActual.numero_renovacion || 1;

      // Marcar contrato actual como RENOVADO
      await tx.contrato.update({
        where: { id },
        data: { estado: 'RENOVADO' },
      });

      // Reactivar empleado si estaba PENDIENTE y limpiar fecha_cese si existe
      const empleado = await tx.empleado.findUnique({
        where: { id: contratoActual.empleado_id },
        select: { estado: true, fecha_cese: true, cargo_id: true },
      });

      // Preparar datos de actualización del empleado
      const empleadoUpdateData: Prisma.EmpleadoUncheckedUpdateInput = {};

      if (empleado?.estado === 'PENDIENTE') {
        empleadoUpdateData.estado = 'ACTIVO';
      }
      if (empleado?.fecha_cese) {
        empleadoUpdateData.fecha_cese = null;
      }

      // Actualizar cargo si se proporciona uno diferente
      if (dto.cargo_id && dto.cargo_id !== empleado?.cargo_id) {
        const cargo = await tx.cargo.findFirst({
          where: { id: dto.cargo_id, empresa_id: empresaId },
        });
        if (!cargo) {
          throw new BadRequestException('El cargo seleccionado no existe');
        }
        empleadoUpdateData.cargo_id = dto.cargo_id;
      }

      // Aplicar actualizaciones si hay alguna
      if (Object.keys(empleadoUpdateData).length > 0) {
        await tx.empleado.update({
          where: { id: contratoActual.empleado_id },
          data: empleadoUpdateData,
        });
      }

      // Crear nuevo contrato con numero_renovacion incrementado
      // Hereda el vinculo_laboral_id del contrato anterior
      const nuevo = await tx.contrato.create({
        data: {
          empleado_id: contratoActual.empleado_id,
          vinculo_laboral_id: contratoActual.vinculo_laboral_id, // Heredar vínculo
          tipo_contrato: dto.tipo_contrato,
          modalidad: dto.modalidad,
          fecha_inicio: parsearFechaISOenPeru(dto.fecha_inicio),
          fecha_fin: dto.fecha_fin
            ? parsearFechaISOenPeru(dto.fecha_fin)
            : null,
          estado: 'ACTIVO',
          renovar: dto.renovar ?? false,
          numero_renovacion: numeroRenovacionActual + 1, // Incrementar contador
          remuneracion: dto.remuneracion,
          observaciones: dto.observaciones || `Renovación del contrato #${id}`,
          archivo_url: archivoUrl,
          empresa_cliente: dto.empresa_cliente,
          cliente_id: dto.cliente_id,
          lugar_trabajo: dto.lugar_trabajo,
          regimen_laboral: dto.regimen_laboral ?? null,
          usuario_id: usuarioId,
        },
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
          cliente: {
            select: {
              id: true,
              ruc: true,
              razon_social: true,
              nombre_comercial: true,
            },
          },
        },
      });

      return nuevo;
    });

    return nuevoContrato;
  }

  // Reingreso: crear contrato y reactivar empleado en CESADO
  async reingreso(
    empresaId: number,
    dto: CreateContratoDto,
    usuarioId: number,
  ) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (empleado.estado !== 'CESADO') {
      throw new BadRequestException(
        'El reingreso solo aplica para empleados en estado CESADO',
      );
    }

    // Validación: Remuneración mínima legal
    if (dto.remuneracion && !validarSueldoMinimo(dto.remuneracion)) {
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.SUELDO_MENOR_MINIMO}. Remuneración ingresada: S/. ${dto.remuneracion}`,
      );
    }

    // SEGURIDAD (mass assignment + IDOR): validar propiedad del archivo.
    const archivoUrl = dto.archivo_url
      ? await this.uploadsService.resolverKeyPropia(dto.archivo_url, empresaId)
      : dto.archivo_url;

    const resultado = await this.prisma.$transaction(async (tx) => {
      // Marcar contratos anteriores como TERMINADO si hay alguno VENCIDO
      await tx.contrato.updateMany({
        where: {
          empleado_id: dto.empleado_id,
          estado: { in: ['PENDIENTE'] },
        },
        data: { estado: 'CESADO' },
      });

      const fechaInicio = parsearFechaISOenPeru(dto.fecha_inicio);

      // Crear NUEVO vínculo laboral (reingreso = nueva relación laboral)
      const nuevoVinculo = await tx.vinculoLaboral.create({
        data: {
          empleado_id: dto.empleado_id,
          empresa_id: empresaId,
          fecha_inicio: fechaInicio,
          estado: 'ACTIVO',
        },
      });

      // Crear nuevo contrato VIGENTE
      const nuevoContrato = await tx.contrato.create({
        data: {
          empleado_id: dto.empleado_id,
          vinculo_laboral_id: nuevoVinculo.id,
          tipo_contrato: dto.tipo_contrato,
          modalidad: dto.modalidad,
          fecha_inicio: fechaInicio,
          fecha_fin: dto.fecha_fin
            ? parsearFechaISOenPeru(dto.fecha_fin)
            : null,
          estado: 'ACTIVO',
          renovar: dto.renovar ?? false,
          remuneracion: dto.remuneracion,
          observaciones: dto.observaciones || 'Reingreso de empleado',
          archivo_url: archivoUrl,
          empresa_cliente: dto.empresa_cliente,
          cliente_id: dto.cliente_id,
          lugar_trabajo: dto.lugar_trabajo,
          regimen_laboral: dto.regimen_laboral ?? null,
          usuario_id: usuarioId,
        },
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
          cliente: {
            select: {
              id: true,
              ruc: true,
              razon_social: true,
              nombre_comercial: true,
            },
          },
        },
      });

      // Reactivar empleado: CESADO → ACTIVO, limpiar fecha_cese, actualizar fecha_ingreso
      await tx.empleado.update({
        where: { id: dto.empleado_id },
        data: {
          estado: 'ACTIVO',
          fecha_cese: null,
          fecha_ingreso: fechaInicio,
        },
      });

      return nuevoContrato;
    });

    return resultado;
  }

  // Terminar contrato anticipadamente
  async terminar(id: number, contrato: ContratoConRelaciones, motivo?: string) {
    if (contrato.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se pueden terminar contratos vigentes',
      );
    }

    // Usar transacción para terminar contrato y actualizar estado del empleado
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Terminar el contrato
      const contratoTerminado = await tx.contrato.update({
        where: { id },
        data: {
          estado: 'CESADO',
          fecha_cese: ahoraPeru().toJSDate(),
          motivo_cese: motivo || null,
        },
      });

      // Verificar si el empleado tiene otros contratos VIGENTE
      const otrosContratosVigentes = await tx.contrato.count({
        where: {
          empleado_id: contrato.empleado_id,
          estado: 'ACTIVO',
          id: { not: id },
        },
      });

      // Si no tiene otros contratos vigentes, actualizar estado del empleado a CESADO
      // y cerrar el vínculo laboral
      if (otrosContratosVigentes === 0) {
        const fechaCese = ahoraPeru().toJSDate();

        await tx.empleado.update({
          where: { id: contrato.empleado_id },
          data: {
            estado: 'CESADO',
            fecha_cese: fechaCese,
          },
        });

        // Cerrar el vínculo laboral asociado al contrato
        if (contrato.vinculo_laboral_id) {
          await tx.vinculoLaboral.update({
            where: { id: contrato.vinculo_laboral_id },
            data: {
              estado: 'CERRADO',
              fecha_fin: fechaCese,
              motivo_cierre: motivo || 'Terminacion de contrato',
            },
          });
        }
      }

      return contratoTerminado;
    });

    return resultado;
  }

  // ==================== MANEJO DE ARCHIVOS ====================

  /**
   * Sube un archivo de contrato firmado y lo vincula al contrato
   */
  async subirContratoFirmado(
    id: number,
    file: Express.Multer.File,
    contrato: ContratoConRelaciones,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado un archivo');
    }

    // Procesar upload con UploadsService (maneja Wasabi o local)
    const uploadResult = await this.uploadsService.processUpload(
      file,
      'contratos',
    );

    // Si ya había un archivo anterior, eliminarlo
    if (contrato.archivo_url) {
      try {
        // Extraer la key del archivo anterior
        const oldKey = this.extractKeyFromUrl(contrato.archivo_url);
        if (oldKey) {
          await this.uploadsService.deleteFileAsync(oldKey);
        }
      } catch (error: unknown) {
        // Log pero no fallar si no se puede eliminar el archivo anterior
        const mensaje = error instanceof Error ? error.message : String(error);
        console.warn(`No se pudo eliminar archivo anterior: ${mensaje}`);
      }
    }

    // Actualizar el contrato con la URL del archivo
    return this.prisma.contrato.update({
      where: { id },
      data: {
        archivo_url: uploadResult.file.url,
      },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        cliente: {
          select: {
            id: true,
            ruc: true,
            razon_social: true,
            nombre_comercial: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene el buffer del archivo de contrato para descarga
   */
  async descargarContrato(contrato: ContratoConRelaciones) {
    if (!contrato.archivo_url) {
      throw new NotFoundException('El contrato no tiene un archivo asociado');
    }

    // Extraer la key del archivo
    const key = this.extractKeyFromUrl(contrato.archivo_url);
    if (!key) {
      throw new NotFoundException(
        'No se pudo obtener la ubicación del archivo',
      );
    }

    try {
      const buffer = await this.uploadsService.getFileBuffer(key);

      // Determinar el nombre del archivo para la descarga
      // Formato: {ID}-CONTRATO_{Apellidos}_{DD-MM-YY}.pdf (sin espacios)
      const empleadoId = contrato.empleado_id;
      const apellidos =
        `${contrato.empleado.apellido_paterno}_${contrato.empleado.apellido_materno || ''}`
          .trim()
          .replace(/_$/, '');
      const fechaInicio = contrato.fecha_inicio
        ? new Date(contrato.fecha_inicio)
        : new Date();
      const fechaFormateada = `${fechaInicio.getDate().toString().padStart(2, '0')}-${(fechaInicio.getMonth() + 1).toString().padStart(2, '0')}-${fechaInicio.getFullYear().toString().slice(-2)}`;
      const extension = key.split('.').pop() || 'pdf';
      const filename = `${empleadoId}-CONTRATO_${apellidos}_${fechaFormateada}.${extension}`;

      return {
        buffer,
        filename,
        mimetype: this.getMimeType(extension),
      };
    } catch {
      throw new NotFoundException('No se pudo obtener el archivo del contrato');
    }
  }

  /**
   * Elimina el archivo de contrato
   */
  async eliminarArchivoContrato(id: number, contrato: ContratoConRelaciones) {
    if (!contrato.archivo_url) {
      throw new BadRequestException('El contrato no tiene un archivo asociado');
    }

    // Extraer la key del archivo
    const key = this.extractKeyFromUrl(contrato.archivo_url);
    if (key) {
      await this.uploadsService.deleteFileAsync(key);
    }

    // Actualizar el contrato para quitar la referencia al archivo
    const contratoActualizado = await this.prisma.contrato.update({
      where: { id },
      data: {
        archivo_url: null,
      },
      include: {
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

    return {
      message: 'Archivo eliminado correctamente',
      contrato: contratoActualizado,
    };
  }

  /**
   * Extrae la key del archivo desde la URL
   */
  private extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    // Si es una URL del proxy de archivos
    // Formato: /api/files/key/{key} o /api/files/local/{key}
    const keyMatch = url.match(/\/files\/(?:key|local)\/(.+)$/);
    if (keyMatch) {
      return decodeURIComponent(keyMatch[1]);
    }

    // Si es una URL legacy de uploads
    // Formato: /uploads/{categoria}/{filename}
    const uploadsMatch = url.match(/\/uploads\/(.+)$/);
    if (uploadsMatch) {
      return uploadsMatch[1];
    }

    // Si ya es una key directa (ej: contratos/123/archivo.pdf)
    if (!url.startsWith('http') && !url.startsWith('/')) {
      return url;
    }

    return null;
  }

  /**
   * Obtiene el MIME type basado en la extensión
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
