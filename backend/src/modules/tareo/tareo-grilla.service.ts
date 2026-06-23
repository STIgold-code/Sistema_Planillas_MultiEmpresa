import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterTareoDto } from './dto';
import { isDiaEnContrato } from './tareo-excel-helpers';

/**
 * Servicio dedicado a construir la grilla del periodo de tareo
 * (matriz empleados x dias con marcaciones, totales y resumen).
 *
 * Extraido de TareoService para mantener el archivo principal por debajo
 * de 400 LOC.
 */
@Injectable()
export class TareoGrillaService {
  constructor(private prisma: PrismaService) {}

  async getGrilla(
    periodoId: number,
    empresaId: number,
    filters: FilterTareoDto,
  ) {
    // Verificar que el periodo existe y pertenece a la empresa
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: periodoId, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new NotFoundException('Periodo no encontrado');
    }

    const {
      buscar,
      area_id,
      sede_id,
      cargo_id,
      page = 1,
      limit = 20,
    } = filters;

    // Construir where para tareos
    const where: Prisma.TareoWhereInput = {
      periodo_id: periodoId,
    };

    if (area_id) where.area_id = area_id;
    if (sede_id) where.sede_id = sede_id;
    if (cargo_id) where.cargo_id = cargo_id;

    // Rango de fechas del periodo para filtrar contratos
    const fechaInicioPeriodo = new Date(periodo.anio, periodo.mes - 1, 1);
    const fechaFinPeriodo = new Date(periodo.anio, periodo.mes, 0);

    if (buscar) {
      const orConditions: Prisma.EmpleadoWhereInput[] = [
        { numero_documento: { contains: buscar, mode: 'insensitive' } },
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
        { apellido_materno: { contains: buscar, mode: 'insensitive' } },
      ];
      const idNumerico = parseInt(buscar, 10);
      if (!isNaN(idNumerico)) {
        orConditions.push({ id: idNumerico });
      }
      where.empleado = { OR: orConditions };
    }

    // Obtener total de registros para paginación
    const total = await this.prisma.tareo.count({ where });

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Obtener tareos con empleados y detalles (paginado)
    const tareos = await this.prisma.tareo.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        empleado: { apellido_paterno: 'asc' },
      },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            apellido_paterno: true,
            apellido_materno: true,
            nombres: true,
            contratos: {
              where: {
                fecha_inicio: { lte: fechaFinPeriodo },
                OR: [
                  { fecha_fin: null },
                  { fecha_fin: { gte: fechaInicioPeriodo } },
                ],
              },
              orderBy: { fecha_inicio: 'desc' },
              take: 1,
              select: {
                fecha_inicio: true,
                fecha_fin: true,
              },
            },
          },
        },
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        cargo: { select: { id: true, nombre: true } },
        detalles: {
          orderBy: { dia: 'asc' },
          include: {
            tipo_marcacion: {
              select: { id: true, codigo: true, color: true },
            },
          },
        },
      },
    });

    // Obtener tipos de marcación activos
    const tiposMarcacion = await this.prisma.tipoMarcacion.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
    });

    // Calcular días del mes
    const diasDelMes = new Date(periodo.anio, periodo.mes, 0).getDate();

    // Transformar datos para la grilla
    const grilla = tareos.map((tareo) => {
      // Crear mapa de detalles por día
      const detallesMap = new Map(tareo.detalles.map((d) => [d.dia, d]));

      // Obtener contrato vigente para validar días
      const contratoVigente = tareo.empleado.contratos?.[0] || null;

      // Construir array de días con información de contrato
      const dias: Array<{
        dia: number;
        detalle_id: number | null;
        codigo: string | null;
        color: string | null;
        tipo_marcacion_id: number | null;
        en_contrato: boolean;
      }> = [];

      for (let dia = 1; dia <= diasDelMes; dia++) {
        const detalle = detallesMap.get(dia);
        const enContrato = isDiaEnContrato(
          dia,
          periodo.mes,
          periodo.anio,
          contratoVigente?.fecha_inicio || null,
          contratoVigente?.fecha_fin || null,
        );

        dias.push({
          dia,
          detalle_id: detalle?.id || null,
          codigo: detalle?.tipo_marcacion?.codigo || null,
          color: detalle?.tipo_marcacion?.color || null,
          tipo_marcacion_id: detalle?.tipo_marcacion_id || null,
          en_contrato: enContrato,
        });
      }

      // Calcular totales por cuenta_como
      const totales: Record<string, number> = {};
      tareo.detalles.forEach((d) => {
        if (d.tipo_marcacion) {
          // Buscar tipo_marcacion completo para obtener cuenta_como
          const tipoCompleto = tiposMarcacion.find(
            (t) => t.id === d.tipo_marcacion_id,
          );
          if (tipoCompleto?.cuenta_como) {
            totales[tipoCompleto.cuenta_como] =
              (totales[tipoCompleto.cuenta_como] || 0) + 1;
          }
        }
      });

      return {
        tareo_id: tareo.id,
        empleado_id: tareo.empleado.id,
        numero_documento: tareo.empleado.numero_documento,
        nombre_completo: `${tareo.empleado.apellido_paterno} ${tareo.empleado.apellido_materno}, ${tareo.empleado.nombres}`,
        area: tareo.area?.nombre || null,
        sede: tareo.sede?.nombre || null,
        cargo: tareo.cargo?.nombre || null,
        fecha_inicio_contrato: contratoVigente?.fecha_inicio || null,
        fecha_fin_contrato: contratoVigente?.fecha_fin || null,
        estado: tareo.estado,
        dias,
        totales,
      };
    });

    // Obtener áreas y sedes únicas del periodo para filtros
    const areasYSedes = await this.prisma.tareo.findMany({
      where: { periodo_id: periodoId },
      select: {
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
      },
      distinct: ['area_id', 'sede_id'],
    });

    const areasUnicas = [
      ...new Map(
        areasYSedes.filter((t) => t.area).map((t) => [t.area.id, t.area]),
      ).values(),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const sedesUnicas = [
      ...new Map(
        areasYSedes.filter((t) => t.sede).map((t) => [t.sede.id, t.sede]),
      ).values(),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Resumen del periodo (todos los empleados, no solo la pagina actual)
    const resumenQuery = await this.prisma.tareoDetalle.groupBy({
      by: ['tipo_marcacion_id'],
      where: {
        tareo: { periodo_id: periodoId },
        tipo_marcacion_id: { not: null },
      },
      _count: true,
      _sum: { horas: true },
    });

    // Mapear tipo_marcacion_id a tipo completo
    const tipoMap = new Map(tiposMarcacion.map((t) => [t.id, t]));

    // Contadores para las cards específicas
    let descansosMedicos = 0; // DM
    let licenciasSinGoce = 0; // LSG
    let faltas = 0; // F (solo injustificadas)
    let descansosTrabajados = 0; // DT
    let feriadosTrabajados = 0; // todos con es_feriado_trabajado = true

    resumenQuery.forEach((r) => {
      const tipo = tipoMap.get(r.tipo_marcacion_id);
      if (!tipo) return;

      const count = r._count;

      // Conteo por código específico
      switch (tipo.codigo) {
        case 'DM':
          descansosMedicos += count;
          break;
        case 'LSG':
          licenciasSinGoce += count;
          break;
        case 'F':
          faltas += count;
          break;
        case 'DT':
          descansosTrabajados += count;
          break;
      }

      // Feriados trabajados (cualquier código con es_feriado_trabajado = true)
      if (tipo.es_feriado_trabajado) {
        feriadosTrabajados += count;
      }
    });

    const resumen_periodo = {
      total_empleados: total,
      descansos_medicos: descansosMedicos,
      licencias_sin_goce: licenciasSinGoce,
      faltas: faltas,
      descansos_trabajados: descansosTrabajados,
      feriados_trabajados: feriadosTrabajados,
    };

    return {
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        mes: periodo.mes,
        estado: periodo.estado,
        dias_mes: diasDelMes,
      },
      tipos_marcacion: tiposMarcacion,
      empleados: grilla,
      areas: areasUnicas,
      sedes: sedesUnicas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      resumen_periodo,
    };
  }

  // Obtener detalle de un empleado específico
}
