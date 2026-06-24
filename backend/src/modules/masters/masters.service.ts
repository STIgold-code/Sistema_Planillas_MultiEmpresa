import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAreaDto,
  UpdateAreaDto,
  CreateCargoDto,
  UpdateCargoDto,
  CreateBancoDto,
  UpdateBancoDto,
  CreateTipoDocumentoEmpleadoDto,
  UpdateTipoDocumentoEmpleadoDto,
  CreateTipoEvaluacionDto,
  UpdateTipoEvaluacionDto,
  CreateProcedenciaDto,
  UpdateProcedenciaDto,
  CreateTipoCeseDto,
  UpdateTipoCeseDto,
} from './dto';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  // ==================== ÁREAS ====================
  async findAllAreas(empresaId: number) {
    const where = { empresa_id: empresaId };
    return this.prisma.area.findMany({
      where,
      include: { empresa: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneArea(id: number, empresaId?: number) {
    const where: Prisma.AreaWhereInput = { id };
    if (empresaId) where.empresa_id = empresaId;

    const area = await this.prisma.area.findFirst({
      where,
      include: { empresa: true },
    });
    if (!area) throw new NotFoundException('Área no encontrada');
    return area;
  }

  async createArea(dto: CreateAreaDto, empresaId: number) {
    const existing = await this.prisma.area.findFirst({
      where: { nombre: dto.nombre, empresa_id: empresaId },
    });
    if (existing)
      throw new ConflictException('Ya existe un área con ese nombre');
    return this.prisma.area.create({
      data: { ...dto, empresa_id: empresaId },
      include: { empresa: true },
    });
  }

  async updateArea(id: number, dto: UpdateAreaDto, empresaId: number) {
    const area = await this.findOneArea(id, empresaId);
    if (dto.nombre) {
      const existing = await this.prisma.area.findFirst({
        where: { nombre: dto.nombre, empresa_id: area.empresa_id, NOT: { id } },
      });
      if (existing)
        throw new ConflictException('Ya existe un área con ese nombre');
    }
    return this.prisma.area.update({
      where: { id },
      data: dto,
      include: { empresa: true },
    });
  }

  async removeArea(id: number, empresaId: number) {
    await this.findOneArea(id, empresaId);
    // Validar que no tenga empleados asociados
    const empleadosCount = await this.prisma.empleado.count({
      where: { area_id: id },
    });
    if (empleadosCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${empleadosCount} empleado(s) en esta área`,
      );
    }
    await this.prisma.area.delete({ where: { id } });
    return { message: 'Área eliminada correctamente' };
  }

  // ==================== CARGOS ====================
  async findAllCargos(empresaId: number) {
    const where = { empresa_id: empresaId };
    return this.prisma.cargo.findMany({
      where,
      include: { empresa: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneCargo(id: number, empresaId?: number) {
    const where: Prisma.CargoWhereInput = { id };
    if (empresaId) where.empresa_id = empresaId;

    const cargo = await this.prisma.cargo.findFirst({
      where,
      include: { empresa: true },
    });
    if (!cargo) throw new NotFoundException('Cargo no encontrado');
    return cargo;
  }

  async createCargo(dto: CreateCargoDto, empresaId: number) {
    const existing = await this.prisma.cargo.findFirst({
      where: { nombre: dto.nombre, empresa_id: empresaId },
    });
    if (existing)
      throw new ConflictException('Ya existe un cargo con ese nombre');
    return this.prisma.cargo.create({
      data: { ...dto, empresa_id: empresaId },
      include: { empresa: true },
    });
  }

  async updateCargo(id: number, dto: UpdateCargoDto, empresaId: number) {
    const cargo = await this.findOneCargo(id, empresaId);
    if (dto.nombre) {
      const existing = await this.prisma.cargo.findFirst({
        where: {
          nombre: dto.nombre,
          empresa_id: cargo.empresa_id,
          NOT: { id },
        },
      });
      if (existing)
        throw new ConflictException('Ya existe un cargo con ese nombre');
    }
    return this.prisma.cargo.update({
      where: { id },
      data: dto,
      include: { empresa: true },
    });
  }

  async removeCargo(id: number, empresaId: number) {
    await this.findOneCargo(id, empresaId);
    // Validar que no tenga empleados asociados
    const empleadosCount = await this.prisma.empleado.count({
      where: { cargo_id: id },
    });
    if (empleadosCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${empleadosCount} empleado(s) con este cargo`,
      );
    }
    await this.prisma.cargo.delete({ where: { id } });
    return { message: 'Cargo eliminado correctamente' };
  }

  // ==================== BANCOS ====================
  async findAllBancos() {
    return this.prisma.banco.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOneBanco(id: number) {
    const banco = await this.prisma.banco.findUnique({ where: { id } });
    if (!banco) throw new NotFoundException('Banco no encontrado');
    return banco;
  }

  async createBanco(dto: CreateBancoDto) {
    const existing = await this.prisma.banco.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existing)
      throw new ConflictException('Ya existe un banco con ese nombre');
    return this.prisma.banco.create({ data: dto });
  }

  async updateBanco(id: number, dto: UpdateBancoDto) {
    await this.findOneBanco(id);
    if (dto.nombre) {
      const existing = await this.prisma.banco.findFirst({
        where: { nombre: dto.nombre, NOT: { id } },
      });
      if (existing)
        throw new ConflictException('Ya existe un banco con ese nombre');
    }
    return this.prisma.banco.update({ where: { id }, data: dto });
  }

  async removeBanco(id: number) {
    await this.findOneBanco(id);
    await this.prisma.banco.delete({ where: { id } });
    return { message: 'Banco eliminado correctamente' };
  }

  // ==================== PROCEDENCIAS ====================
  async findAllProcedencias(empresaId: number, includeInactive = false) {
    const where = includeInactive
      ? { empresa_id: empresaId }
      : { empresa_id: empresaId, activo: true };
    return this.prisma.procedencia.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { postulantes: true } },
      },
    });
  }

  async findOneProcedencia(id: number, empresaId: number) {
    const procedencia = await this.prisma.procedencia.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        _count: { select: { postulantes: true } },
      },
    });
    if (!procedencia) throw new NotFoundException('Procedencia no encontrada');
    return procedencia;
  }

  async createProcedencia(dto: CreateProcedenciaDto, empresaId: number) {
    const existing = await this.prisma.procedencia.findFirst({
      where: { nombre: dto.nombre, empresa_id: empresaId },
    });
    if (existing)
      throw new ConflictException('Ya existe una procedencia con ese nombre');
    return this.prisma.procedencia.create({
      data: { ...dto, empresa_id: empresaId },
    });
  }

  async updateProcedencia(
    id: number,
    empresaId: number,
    dto: UpdateProcedenciaDto,
  ) {
    const procedencia = await this.findOneProcedencia(id, empresaId);
    if (dto.nombre) {
      const existing = await this.prisma.procedencia.findFirst({
        where: {
          nombre: dto.nombre,
          empresa_id: procedencia.empresa_id,
          NOT: { id },
        },
      });
      if (existing)
        throw new ConflictException('Ya existe una procedencia con ese nombre');
    }
    return this.prisma.procedencia.update({
      where: { id },
      data: dto,
    });
  }

  async removeProcedencia(id: number, empresaId: number) {
    await this.findOneProcedencia(id, empresaId);
    // Verificar si tiene postulantes asociados
    const count = await this.prisma.postulante.count({
      where: { procedencia_id: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${count} postulante(s) usando esta procedencia. Desactívela en su lugar.`,
      );
    }
    await this.prisma.procedencia.delete({ where: { id } });
    return { message: 'Procedencia eliminada correctamente' };
  }

  async toggleProcedencia(id: number, empresaId: number) {
    const procedencia = await this.findOneProcedencia(id, empresaId);
    return this.prisma.procedencia.update({
      where: { id },
      data: { activo: !procedencia.activo },
    });
  }

  // ==================== UBIGEOS ====================
  async findAllDepartamentos() {
    return this.prisma.departamento.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async findAllProvincias(departamentoId?: number) {
    const where = departamentoId ? { departamento_id: departamentoId } : {};
    return this.prisma.provincia.findMany({
      where,
      include: { departamento: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findAllDistritos(provinciaId?: number) {
    const where = provinciaId ? { provincia_id: provinciaId } : {};
    return this.prisma.distrito.findMany({
      where,
      include: { provincia: { include: { departamento: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  // ==================== REGÍMENES PENSIONARIOS ====================
  async findAllRegimenes() {
    return this.prisma.regimenPensionario.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  // ==================== TIPOS DE DOCUMENTO DE EMPLEADO ====================
  async findAllTiposDocumentoEmpleado(empresaId?: number) {
    const where = empresaId ? { empresa_id: empresaId } : {};
    return this.prisma.tipoDocumentoEmpleado.findMany({
      where,
      include: {
        empresa: true,
        _count: { select: { documentos: true } },
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }

  async findOneTipoDocumentoEmpleado(id: number, empresaId?: number) {
    const where: Prisma.TipoDocumentoEmpleadoWhereInput = { id };
    if (empresaId) where.empresa_id = empresaId;

    const tipo = await this.prisma.tipoDocumentoEmpleado.findFirst({
      where,
      include: { empresa: true },
    });
    if (!tipo) throw new NotFoundException('Tipo de documento no encontrado');
    return tipo;
  }

  async createTipoDocumentoEmpleado(
    dto: CreateTipoDocumentoEmpleadoDto,
    empresaId: number,
  ) {
    const existing = await this.prisma.tipoDocumentoEmpleado.findFirst({
      where: { codigo: dto.codigo, empresa_id: empresaId },
    });
    if (existing)
      throw new ConflictException(
        'Ya existe un tipo de documento con ese código',
      );
    return this.prisma.tipoDocumentoEmpleado.create({
      data: { ...dto, empresa_id: empresaId },
      include: { empresa: true },
    });
  }

  async updateTipoDocumentoEmpleado(
    id: number,
    dto: UpdateTipoDocumentoEmpleadoDto,
    empresaId: number,
  ) {
    const tipo = await this.findOneTipoDocumentoEmpleado(id, empresaId);

    // Validar código único
    if (dto.codigo) {
      const existing = await this.prisma.tipoDocumentoEmpleado.findFirst({
        where: { codigo: dto.codigo, empresa_id: tipo.empresa_id, NOT: { id } },
      });
      if (existing)
        throw new ConflictException(
          'Ya existe un tipo de documento con ese código',
        );
    }

    // Validar cambio de tipo_vigencia con documentos existentes
    if (dto.tipo_vigencia && dto.tipo_vigencia !== tipo.tipo_vigencia) {
      // Si cambia a CON_VENCIMIENTO, verificar que todos los docs tengan fecha_vencimiento
      if (dto.tipo_vigencia === 'CON_VENCIMIENTO') {
        const docsSinVencimiento = await this.prisma.empleadoDocumento.count({
          where: {
            tipo_documento_empleado_id: id,
            eliminado: false,
            fecha_vencimiento: null,
          },
        });
        if (docsSinVencimiento > 0) {
          throw new ConflictException(
            `No se puede cambiar a "Con vencimiento": hay ${docsSinVencimiento} documento(s) sin fecha de vencimiento. ` +
              `Actualice los documentos primero o cree un nuevo tipo.`,
          );
        }
      }

      // Si cambia a SOLO_EMISION o CON_VENCIMIENTO, verificar que todos tengan fecha_emision
      if (
        dto.tipo_vigencia === 'SOLO_EMISION' ||
        dto.tipo_vigencia === 'CON_VENCIMIENTO'
      ) {
        const docsSinEmision = await this.prisma.empleadoDocumento.count({
          where: {
            tipo_documento_empleado_id: id,
            eliminado: false,
            fecha_emision: null,
          },
        });
        if (docsSinEmision > 0) {
          throw new ConflictException(
            `No se puede cambiar el tipo de vigencia: hay ${docsSinEmision} documento(s) sin fecha de emisión. ` +
              `Actualice los documentos primero o cree un nuevo tipo.`,
          );
        }
      }
    }

    // Limpiar dias_alerta si no es CON_VENCIMIENTO
    const dataToUpdate = { ...dto };
    if (
      dataToUpdate.tipo_vigencia &&
      dataToUpdate.tipo_vigencia !== 'CON_VENCIMIENTO'
    ) {
      dataToUpdate.dias_alerta = null;
    }

    return this.prisma.tipoDocumentoEmpleado.update({
      where: { id },
      data: dataToUpdate,
      include: { empresa: true },
    });
  }

  async removeTipoDocumentoEmpleado(id: number, empresaId: number) {
    await this.findOneTipoDocumentoEmpleado(id, empresaId);
    // Verificar si tiene documentos asociados
    const count = await this.prisma.empleadoDocumento.count({
      where: { tipo_documento_empleado_id: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${count} documento(s) de empleado usando este tipo`,
      );
    }
    const countPostulante = await this.prisma.postulanteDocumento.count({
      where: { tipo_documento_empleado_id: id },
    });
    if (countPostulante > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${countPostulante} documento(s) de postulante usando este tipo`,
      );
    }
    await this.prisma.tipoDocumentoEmpleado.delete({ where: { id } });
    return { message: 'Tipo de documento eliminado correctamente' };
  }

  // ==================== SEDES ====================
  async findAllSedes(empresaId: number) {
    const where = { empresa_id: empresaId, activo: true };
    return this.prisma.sede.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        cliente_id: true,
        cliente: { select: { id: true, razon_social: true } },
      },
    });
  }

  // ==================== TIPOS DE EVALUACIÓN ====================
  async findAllTiposEvaluacion(empresaId: number, includeInactive = false) {
    const where = includeInactive
      ? { empresa_id: empresaId }
      : { empresa_id: empresaId, activo: true };
    return this.prisma.tipoEvaluacionMaestro.findMany({
      where,
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        _count: { select: { evaluaciones: true } },
      },
    });
  }

  async findOneTipoEvaluacion(id: number, empresaId: number) {
    const tipo = await this.prisma.tipoEvaluacionMaestro.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        _count: { select: { evaluaciones: true } },
      },
    });
    if (!tipo) throw new NotFoundException('Tipo de evaluación no encontrado');
    return tipo;
  }

  async createTipoEvaluacion(dto: CreateTipoEvaluacionDto, empresaId: number) {
    const existing = await this.prisma.tipoEvaluacionMaestro.findFirst({
      where: { codigo: dto.codigo, empresa_id: empresaId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un tipo de evaluación con ese código',
      );
    }
    return this.prisma.tipoEvaluacionMaestro.create({
      data: {
        ...dto,
        empresa_id: empresaId,
      },
    });
  }

  async updateTipoEvaluacion(
    id: number,
    empresaId: number,
    dto: UpdateTipoEvaluacionDto,
  ) {
    const tipo = await this.findOneTipoEvaluacion(id, empresaId);
    if (dto.codigo) {
      const existing = await this.prisma.tipoEvaluacionMaestro.findFirst({
        where: { codigo: dto.codigo, empresa_id: tipo.empresa_id, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          'Ya existe un tipo de evaluación con ese código',
        );
      }
    }
    return this.prisma.tipoEvaluacionMaestro.update({
      where: { id },
      data: dto,
    });
  }

  async removeTipoEvaluacion(id: number, empresaId: number) {
    await this.findOneTipoEvaluacion(id, empresaId);

    // Verificar si tiene evaluaciones asociadas
    const count = await this.prisma.postulanteEvaluacion.count({
      where: { tipo_evaluacion_id: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${count} evaluación(es) usando este tipo. Desactívelo en su lugar.`,
      );
    }

    await this.prisma.tipoEvaluacionMaestro.delete({ where: { id } });
    return { message: 'Tipo de evaluación eliminado correctamente' };
  }

  async toggleTipoEvaluacion(id: number, empresaId: number) {
    const tipo = await this.findOneTipoEvaluacion(id, empresaId);
    return this.prisma.tipoEvaluacionMaestro.update({
      where: { id },
      data: { activo: !tipo.activo },
    });
  }

  // ==================== TIPOS DE CESE ====================
  async findAllTiposCese(empresaId: number) {
    const where = { empresa_id: empresaId };
    return this.prisma.tipoCeseMaestro.findMany({
      where,
      include: { empresa: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneTipoCese(id: number, empresaId?: number) {
    const where: Prisma.TipoCeseMaestroWhereInput = { id };
    if (empresaId) where.empresa_id = empresaId;

    const tipo = await this.prisma.tipoCeseMaestro.findFirst({
      where,
      include: { empresa: true },
    });
    if (!tipo) throw new NotFoundException('Tipo de cese no encontrado');
    return tipo;
  }

  async createTipoCese(dto: CreateTipoCeseDto, empresaId: number) {
    const existing = await this.prisma.tipoCeseMaestro.findFirst({
      where: { nombre: dto.nombre, empresa_id: empresaId },
    });
    if (existing)
      throw new ConflictException('Ya existe un tipo de cese con ese nombre');
    return this.prisma.tipoCeseMaestro.create({
      data: { ...dto, empresa_id: empresaId },
      include: { empresa: true },
    });
  }

  async updateTipoCese(id: number, dto: UpdateTipoCeseDto, empresaId: number) {
    const tipo = await this.findOneTipoCese(id, empresaId);
    if (dto.nombre) {
      const existing = await this.prisma.tipoCeseMaestro.findFirst({
        where: {
          nombre: dto.nombre,
          empresa_id: tipo.empresa_id,
          NOT: { id },
        },
      });
      if (existing)
        throw new ConflictException('Ya existe un tipo de cese con ese nombre');
    }
    return this.prisma.tipoCeseMaestro.update({
      where: { id },
      data: dto,
      include: { empresa: true },
    });
  }

  async removeTipoCese(id: number, empresaId: number) {
    await this.findOneTipoCese(id, empresaId);
    const count = await this.prisma.solicitudCese.count({
      where: { tipo_cese_id: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${count} solicitud(es) de cese usando este tipo`,
      );
    }
    await this.prisma.tipoCeseMaestro.delete({ where: { id } });
    return { message: 'Tipo de cese eliminado correctamente' };
  }
}
