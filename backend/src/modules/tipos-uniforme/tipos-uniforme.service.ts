import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTipoUniformeDto,
  TallaInputDto,
} from './dto/create-tipo-uniforme.dto';
import { UpdateTipoUniformeDto } from './dto/update-tipo-uniforme.dto';

interface FindAllOptions {
  buscar?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

const TIPO_UNIFORME_INCLUDE = {
  tallas: {
    select: { id: true, valor: true, orden: true, stock_minimo: true },
    orderBy: { orden: Prisma.SortOrder.asc },
  },
  caracteristicas: {
    select: { id: true, nombre: true, descripcion: true },
    orderBy: { nombre: Prisma.SortOrder.asc },
  },
} satisfies Prisma.TipoUniformeInclude;

@Injectable()
export class TiposUniformeService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: number, dto: CreateTipoUniformeDto) {
    await this.ensureNombreDisponible(empresaId, dto.nombre);
    const { tallas, caracteristica_ids, ...datos } = dto;
    if (caracteristica_ids?.length) {
      await this.ensureCaracteristicasEmpresa(empresaId, caracteristica_ids);
    }
    return this.prisma.$transaction(async (tx) => {
      const tipo = await tx.tipoUniforme.create({
        data: {
          ...datos,
          empresa_id: empresaId,
          ...(caracteristica_ids !== undefined
            ? {
                caracteristicas: {
                  connect: caracteristica_ids.map((id) => ({ id })),
                },
              }
            : {}),
        },
      });
      if (tallas !== undefined) {
        await this.sincronizarTallas(tx, tipo.id, tallas);
      }
      return tx.tipoUniforme.findUniqueOrThrow({
        where: { id: tipo.id },
        include: TIPO_UNIFORME_INCLUDE,
      });
    });
  }

  async findAll(empresaId: number, options: FindAllOptions = {}) {
    const { buscar, activo, page = 1, limit = 50 } = options;

    const where: Prisma.TipoUniformeWhereInput = { empresa_id: empresaId };
    if (activo !== undefined) where.activo = activo;
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.tipoUniforme.findMany({
        where,
        include: TIPO_UNIFORME_INCLUDE,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tipoUniforme.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findForSelect(empresaId: number) {
    return this.prisma.tipoUniforme.findMany({
      where: { empresa_id: empresaId, activo: true },
      select: {
        id: true,
        nombre: true,
        genero: true,
        cantidad_estandar: true,
        tallas: {
          select: { valor: true, orden: true, stock_minimo: true },
          orderBy: { orden: 'asc' },
        },
        caracteristicas: {
          select: { id: true, nombre: true, descripcion: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const tipo = await this.prisma.tipoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      include: TIPO_UNIFORME_INCLUDE,
    });
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de uniforme con ID ${id} no encontrado`,
      );
    }
    return tipo;
  }

  async update(id: number, empresaId: number, dto: UpdateTipoUniformeDto) {
    await this.findOne(id, empresaId);
    if (dto.nombre) {
      await this.ensureNombreDisponible(empresaId, dto.nombre, id);
    }
    const { tallas, caracteristica_ids, ...datos } = dto;
    if (caracteristica_ids?.length) {
      await this.ensureCaracteristicasEmpresa(empresaId, caracteristica_ids);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.tipoUniforme.update({
        where: { id },
        data: {
          ...datos,
          // `set` reemplaza el conjunto completo (incluye limpiar con []).
          ...(caracteristica_ids !== undefined
            ? {
                caracteristicas: {
                  set: caracteristica_ids.map((cid) => ({ id: cid })),
                },
              }
            : {}),
        },
      });
      if (tallas !== undefined) {
        await this.sincronizarTallas(tx, id, tallas);
      }
      return tx.tipoUniforme.findUniqueOrThrow({
        where: { id },
        include: TIPO_UNIFORME_INCLUDE,
      });
    });
  }

  async toggleActivo(id: number, empresaId: number) {
    const tipo = await this.findOne(id, empresaId);
    return this.prisma.tipoUniforme.update({
      where: { id },
      data: { activo: !tipo.activo },
      include: TIPO_UNIFORME_INCLUDE,
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    // Verificar dependencias antes de eliminar: stock e items de requerimiento.
    // Si existe alguna referencia, el delete físico está bloqueado; se debe
    // desactivar el tipo en su lugar (usando toggleActivo).
    const [stockCount, requerimientoCount] = await Promise.all([
      this.prisma.itemInventario.count({ where: { tipo_uniforme_id: id } }),
      this.prisma.requerimientoUniformeDetalle.count({
        where: { tipo_uniforme_id: id },
      }),
    ]);

    if (stockCount > 0 || requerimientoCount > 0) {
      throw new ConflictException(
        'No se puede eliminar: el tipo de uniforme tiene stock o requerimientos asociados. Desactívalo en su lugar.',
      );
    }

    await this.prisma.tipoUniforme.delete({ where: { id } });
    return { message: 'Tipo de uniforme eliminado correctamente' };
  }

  /**
   * Sincroniza el catálogo de tallas de un tipo de uniforme: elimina las
   * tallas actuales y recrea las recibidas, asignando `orden` según su
   * posición en el arreglo. Los valores se normalizan (trim + mayúsculas) y
   * se descartan vacíos y duplicados para respetar el unique
   * (tipo_uniforme_id, valor). Cada talla conserva su `stock_minimo` (0 si no
   * se especifica) — el mínimo que dispara el faltante en la vista de stock.
   */
  private async sincronizarTallas(
    tx: Prisma.TransactionClient,
    tipoUniformeId: number,
    tallas: TallaInputDto[],
  ) {
    const vistas = new Set<string>();
    const normalizadas = tallas
      .map((talla) => ({
        valor: talla.valor.trim().toUpperCase(),
        stock_minimo: talla.stock_minimo ?? 0,
      }))
      .filter(({ valor }) => {
        if (!valor || vistas.has(valor)) return false;
        vistas.add(valor);
        return true;
      });

    await tx.tallaTipoUniforme.deleteMany({
      where: { tipo_uniforme_id: tipoUniformeId },
    });

    if (normalizadas.length === 0) return;

    await tx.tallaTipoUniforme.createMany({
      data: normalizadas.map(({ valor, stock_minimo }, orden) => ({
        tipo_uniforme_id: tipoUniformeId,
        valor,
        orden,
        stock_minimo,
      })),
    });
  }

  /**
   * Valida que todos los IDs de característica pertenezcan a la empresa, para
   * evitar conectar características de otra empresa (multi-tenant).
   */
  private async ensureCaracteristicasEmpresa(empresaId: number, ids: number[]) {
    if (ids.length === 0) return;
    const unicos = [...new Set(ids)];
    const encontradas = await this.prisma.caracteristica.findMany({
      where: { id: { in: unicos }, empresa_id: empresaId },
      select: { id: true },
    });
    if (encontradas.length !== unicos.length) {
      throw new NotFoundException(
        'Una o más características no existen en esta empresa',
      );
    }
  }

  private async ensureNombreDisponible(
    empresaId: number,
    nombre: string,
    excluirId?: number,
  ) {
    const existe = await this.prisma.tipoUniforme.findFirst({
      where: {
        nombre,
        empresa_id: empresaId,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe un tipo de uniforme con el nombre "${nombre}"`,
      );
    }
  }
}
