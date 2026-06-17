import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BUSINESS_ERROR_MESSAGES,
  calcularEdad,
  validarEdadMinima,
  validarSueldoMinimo,
  EstadoDocumentosFilter,
  DIAS_POR_VENCER_DOCUMENTO,
} from '../../common/constants/business-rules';
import { UploadsService } from '../uploads/uploads.service';
import { FileCleanupService } from './services/file-cleanup.service';
import { EmpleadoDocumentosService } from './services/empleado-documentos.service';
import { EmpleadoExportService } from './services/empleado-export.service';
import { EmpleadoPhotocheckService } from './services/empleado-photocheck.service';
import { EmpleadoMovimientosService } from './services/empleado-movimientos.service';
import { EmpleadoCrudService } from './services/empleado-crud.service';
import { CreateEmpleadoDto, UpdateEmpleadoDto, FilterEmpleadoDto } from './dto';
import { Prisma, EstadoDocumentacion, TipoMovimiento } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import {
  ahoraPeru,
  sumarDiasPeru,
  formatearFechaPeru,
  parsearFechaISOenPeru,
  fechaHoyPeruDate,
} from '../../common/utils/datetime.util';

@Injectable()
export class EmpleadosService {
  private readonly logger = new Logger(EmpleadosService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private fileCleanupService: FileCleanupService,
    private empleadoDocumentosService: EmpleadoDocumentosService,
    private empleadoExportService: EmpleadoExportService,
    private empleadoPhotocheckService: EmpleadoPhotocheckService,
    private empleadoMovimientosService: EmpleadoMovimientosService,
    private empleadoCrudService: EmpleadoCrudService,
  ) {}

  async findAll(empresaId: number, filters: FilterEmpleadoDto) {
    return this.empleadoCrudService.findAll(empresaId, filters);
  }

  async findOne(id: number, empresaId: number) {
    return this.empleadoCrudService.findOne(id, empresaId);
  }

  async create(empresaId: number, dto: CreateEmpleadoDto, usuarioId: number) {
    return this.empleadoCrudService.create(empresaId, dto, usuarioId);
  }

  async update(id: number, empresaId: number, dto: UpdateEmpleadoDto) {
    return this.empleadoCrudService.update(id, empresaId, dto);
  }

  async remove(id: number, empresaId: number) {
    return this.empleadoCrudService.remove(id, empresaId);
  }

  async addFamiliar(empleadoId: number, empresaId: number, data: any) {
    await this.findOne(empleadoId, empresaId);

    return this.prisma.empleadoFamiliar.create({
      data: {
        ...data,
        empleado_id: empleadoId,
        fecha_nacimiento: data.fecha_nacimiento
          ? parsearFechaISOenPeru(data.fecha_nacimiento)
          : null,
      },
    });
  }

  async removeFamiliar(
    familiarId: number,
    empleadoId: number,
    empresaId: number,
  ) {
    await this.findOne(empleadoId, empresaId);

    // Validar que el familiar pertenece al empleado
    const familiar = await this.prisma.empleadoFamiliar.findFirst({
      where: { id: familiarId, empleado_id: empleadoId },
    });

    if (!familiar) {
      throw new NotFoundException(
        'Familiar no encontrado o no pertenece a este empleado',
      );
    }

    await this.prisma.empleadoFamiliar.delete({
      where: { id: familiarId },
    });

    return { message: 'Familiar eliminado' };
  }

  // Métodos para documentos — delegación a EmpleadoDocumentosService

  /**
   * Crear documento de empleado con archivo (Híbrido)
   */
  async createDocumentoConArchivo(
    empleadoId: number,
    empresaId: number,
    file: Express.Multer.File,
    data: any,
    usuarioId?: number,
  ) {
    return this.empleadoDocumentosService.createDocumentoConArchivo(
      empleadoId,
      empresaId,
      file,
      data,
      usuarioId,
    );
  }

  /**
   * Soft delete de documento - marca como eliminado sin borrar archivo físico ni registro
   * Mantiene trazabilidad completa: quién eliminó, cuándo y por qué
   */
  async deleteDocumentoConArchivo(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
    user?: any,
    motivo?: string,
  ) {
    return this.empleadoDocumentosService.deleteDocumentoConArchivo(
      documentoId,
      empleadoId,
      empresaId,
      user,
      motivo,
    );
  }

  /**
   * Obtiene los documentos subidos vigentes de un empleado (solo versión actual, no eliminados)
   */
  async getDocumentos(empleadoId: number, empresaId: number) {
    return this.empleadoDocumentosService.getDocumentos(empleadoId, empresaId);
  }

  async addDocumento(empleadoId: number, empresaId: number, data: any) {
    return this.empleadoDocumentosService.addDocumento(
      empleadoId,
      empresaId,
      data,
    );
  }

  async removeDocumento(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
    user?: any,
    motivo?: string,
  ) {
    return this.empleadoDocumentosService.removeDocumento(
      documentoId,
      empleadoId,
      empresaId,
      user,
      motivo,
    );
  }

  /**
   * Crea una nueva versión de un documento existente
   * El documento anterior queda como versión no vigente (trazabilidad completa)
   */
  async crearNuevaVersionDocumento(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
    file: Express.Multer.File,
    motivo: string,
    usuarioId: number,
  ) {
    return this.empleadoDocumentosService.crearNuevaVersionDocumento(
      documentoId,
      empleadoId,
      empresaId,
      file,
      motivo,
      usuarioId,
    );
  }

  /**
   * Obtiene el historial completo de versiones de un documento
   */
  async getHistorialDocumento(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
  ) {
    return this.empleadoDocumentosService.getHistorialDocumento(
      documentoId,
      empleadoId,
      empresaId,
    );
  }

  // ==================== GESTIÓN DE ESTADO DE DOCUMENTACIÓN ====================

  /**
   * Obtiene la lista de documentos obligatorios faltantes para un empleado
   */
  async getDocumentosFaltantes(
    empleadoId: number,
    empresaId: number,
  ): Promise<string[]> {
    return this.empleadoDocumentosService.getDocumentosFaltantes(
      empleadoId,
      empresaId,
    );
  }

  /**
   * Valida que un empleado pueda pasar a estado ACTIVO
   * Lanza excepción si no tiene todos los documentos obligatorios
   */
  async validarPuedeEstarActivo(
    empleadoId: number,
    empresaId: number,
  ): Promise<void> {
    return this.empleadoDocumentosService.validarPuedeEstarActivo(
      empleadoId,
      empresaId,
    );
  }

  /**
   * Valida que area y cargo pertenezcan a la misma empresa
   * Previene asignación de entidades de otras empresas (IDOR)
   */
  async actualizarEstadoDocumentacion(
    empleadoId: number,
    empresaId: number,
  ): Promise<EstadoDocumentacion> {
    return this.empleadoDocumentosService.actualizarEstadoDocumentacion(
      empleadoId,
      empresaId,
    );
  }

  /**
   * Recalcula el estado de documentación de todos los empleados de una empresa
   * Útil para ejecutar después de cambiar la configuración de documentos obligatorios
   * Optimizado para evitar N+1 queries
   */
  async recalcularEstadoDocumentacionTodos(
    empresaId: number,
  ): Promise<{ actualizados: number }> {
    return this.empleadoDocumentosService.recalcularEstadoDocumentacionTodos(
      empresaId,
    );
  }

  /**
   * Obtiene documentos próximos a vencer o ya vencidos
   */
  async getDocumentosVencimientoProximo(
    empresaId: number,
    diasAnticipacion: number = 30,
  ) {
    return this.empleadoDocumentosService.getDocumentosVencimientoProximo(
      empresaId,
      diasAnticipacion,
    );
  }

  /**
   * Dashboard de cumplimiento de documentación
   */
  async getDashboardDocumentacion(empresaId: number) {
    return this.empleadoDocumentosService.getDashboardDocumentacion(empresaId);
  }

  // Registrar movimiento
  async registrarMovimiento(
    empleadoId: number,
    empresaId: number,
    usuarioId: number,
    data: {
      tipo_movimiento:
        | 'ALTA'
        | 'BAJA'
        | 'RENUNCIA'
        | 'VACACIONES'
        | 'SUSPENSION'
        | 'REINCORPORACION';
      fecha_movimiento: string;
      motivo?: string;
      observaciones?: string;
    },
  ) {
    return this.empleadoMovimientosService.registrar(
      empleadoId,
      empresaId,
      usuarioId,
      data,
    );
  }
  // Exportar empleados a Excel — delegación a EmpleadoExportService
  async exportarExcel(
    empresaId: number,
    filters: FilterEmpleadoDto,
  ): Promise<ExcelJS.Workbook> {
    return this.empleadoExportService.exportarExcel(empresaId, filters);
  }

  // ==================== PHOTOCHECK LOGS ====================

  async registrarPhotocheckLog(
    empleadoId: number,
    empresaId: number,
    usuarioId: number,
    motivo: string,
    observaciones?: string,
    ipAddress?: string,
  ) {
    return this.empleadoPhotocheckService.registrarLog(
      empleadoId,
      empresaId,
      usuarioId,
      motivo,
      observaciones,
      ipAddress,
    );
  }

  async getPhotocheckLogs(empleadoId: number, empresaId: number) {
    return this.empleadoPhotocheckService.getLogs(empleadoId, empresaId);
  }

  // ==================== EXPEDIENTE DIGITAL UNIFICADO ====================

  /**
   * Obtiene el expediente digital unificado de un empleado
   * Combina: Documentos subidos + Documentos generados + Boletas
   */
  async getExpedienteDigital(
    empleadoId: number,
    empresaId: number,
    filters?: {
      categoria?: string;
      origen?: string;
      anio?: number;
      buscar?: string;
    },
  ) {
    return this.empleadoExportService.getExpedienteDigital(
      empleadoId,
      empresaId,
      filters,
    );
  }

  /**
   * Obtiene las URLs de todos los documentos para descarga masiva
   */
  async getDocumentosParaDescarga(empleadoId: number, empresaId: number) {
    return this.empleadoExportService.getDocumentosParaDescarga(
      empleadoId,
      empresaId,
    );
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
}
