import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ahoraPeru,
  sumarDiasPeru,
  finDelDiaPeru,
} from '../../common/utils/datetime.util';

/** Días por defecto de la ventana de "contratos por vencer". */
const DIAS_POR_VENCER_DEFAULT = 30;

/** Totales agregados de todo el estudio (todas las empresas). */
export interface TotalesConsolidado {
  empresas: number;
  empresasActivas: number;
  empleadosActivos: number;
  contratosPorVencer: number;
  contratosVencidos: number;
}

/** Resumen por empresa para la tabla del panorama global. */
export interface ResumenEmpresa {
  id: number;
  nombre: string;
  activo: boolean;
  empleadosActivos: number;
  contratosPorVencer: number;
  contratosVencidos: number;
}

/** Contrato por vencer con su empresa y trabajador, para la vista de detalle. */
export interface ContratoPorVencer {
  contratoId: number;
  empresaId: number;
  empresaNombre: string;
  empleadoNombre: string;
  fechaFin: string;
  diasRestantes: number;
}

export interface ResumenConsolidado {
  totales: TotalesConsolidado;
  empresas: ResumenEmpresa[];
  contratosPorVencer: ContratoPorVencer[];
}

/**
 * Servicio de la vista consolidada del estudio.
 *
 * A diferencia del resto del sistema (scopeado a una empresa activa), este
 * servicio agrega TODAS las empresas a la vez. Es de solo lectura y su acceso
 * está restringido a superadmin en el controller (`@RequirePermissions('*')`),
 * porque expone datos cross-tenant de forma deliberada.
 *
 * Rendimiento: ejecuta un conjunto fijo de queries en paralelo y agrega en
 * memoria sobre conjuntos acotados (contratos por vencer/vencidos), evitando
 * el patrón N+1 de consultar empresa por empresa.
 */
@Injectable()
export class ConsolidadoService {
  constructor(private prisma: PrismaService) {}

  async getResumen(
    dias = DIAS_POR_VENCER_DEFAULT,
  ): Promise<ResumenConsolidado> {
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const hastaFin = finDelDiaPeru(sumarDiasPeru(hoy, dias));

    const [
      empresas,
      empleadosPorEmpresa,
      contratosPorVencerRaw,
      contratosVencidosRaw,
    ] = await Promise.all([
      this.prisma.empresa.findMany({
        select: {
          id: true,
          razon_social: true,
          nombre_comercial: true,
          activo: true,
        },
        orderBy: { razon_social: 'asc' },
      }),
      // Empleados activos agrupados por empresa (una sola query).
      this.prisma.empleado.groupBy({
        by: ['empresa_id'],
        where: { estado: 'ACTIVO' },
        _count: { _all: true },
      }),
      // Contratos vigentes que vencen dentro de la ventana.
      this.prisma.contrato.findMany({
        where: {
          estado: 'ACTIVO',
          fecha_fin: { gte: hoy, lte: hastaFin },
        },
        select: {
          id: true,
          fecha_fin: true,
          empleado: {
            select: {
              empresa_id: true,
              apellido_paterno: true,
              apellido_materno: true,
              nombres: true,
            },
          },
        },
        orderBy: { fecha_fin: 'asc' },
      }),
      // Contratos ya vencidos (estado PENDIENTE) de trabajadores no cesados.
      this.prisma.contrato.findMany({
        where: {
          estado: 'PENDIENTE',
          empleado: { estado: { not: 'CESADO' } },
        },
        select: { empleado: { select: { empresa_id: true } } },
      }),
    ]);

    const empleadosMap = new Map<number, number>();
    for (const fila of empleadosPorEmpresa) {
      empleadosMap.set(fila.empresa_id, fila._count._all);
    }

    const porVencerMap = new Map<number, number>();
    for (const contrato of contratosPorVencerRaw) {
      const empresaId = contrato.empleado.empresa_id;
      porVencerMap.set(empresaId, (porVencerMap.get(empresaId) ?? 0) + 1);
    }

    const vencidosMap = new Map<number, number>();
    for (const contrato of contratosVencidosRaw) {
      const empresaId = contrato.empleado.empresa_id;
      vencidosMap.set(empresaId, (vencidosMap.get(empresaId) ?? 0) + 1);
    }

    const nombreEmpresa = new Map<number, string>();
    const resumenEmpresas: ResumenEmpresa[] = empresas.map((empresa) => {
      const nombre = empresa.nombre_comercial?.trim() || empresa.razon_social;
      nombreEmpresa.set(empresa.id, nombre);
      return {
        id: empresa.id,
        nombre,
        activo: empresa.activo,
        empleadosActivos: empleadosMap.get(empresa.id) ?? 0,
        contratosPorVencer: porVencerMap.get(empresa.id) ?? 0,
        contratosVencidos: vencidosMap.get(empresa.id) ?? 0,
      };
    });

    // Orden: primero las empresas que requieren atención (más vencimientos).
    resumenEmpresas.sort(
      (a, b) =>
        b.contratosPorVencer - a.contratosPorVencer ||
        b.contratosVencidos - a.contratosVencidos ||
        a.nombre.localeCompare(b.nombre),
    );

    const contratosPorVencer: ContratoPorVencer[] = contratosPorVencerRaw
      .filter((contrato) => contrato.fecha_fin !== null)
      .map((contrato) => {
        const fechaFin = contrato.fecha_fin;
        const empresaId = contrato.empleado.empresa_id;
        return {
          contratoId: contrato.id,
          empresaId,
          empresaNombre: nombreEmpresa.get(empresaId) ?? '',
          empleadoNombre:
            `${contrato.empleado.apellido_paterno} ${contrato.empleado.apellido_materno} ${contrato.empleado.nombres}`.trim(),
          fechaFin: fechaFin.toISOString(),
          diasRestantes: Math.max(
            0,
            Math.ceil((fechaFin.getTime() - hoy.getTime()) / 86_400_000),
          ),
        };
      });

    return {
      totales: {
        empresas: empresas.length,
        empresasActivas: empresas.filter((empresa) => empresa.activo).length,
        empleadosActivos: [...empleadosMap.values()].reduce((a, b) => a + b, 0),
        contratosPorVencer: contratosPorVencerRaw.length,
        contratosVencidos: contratosVencidosRaw.length,
      },
      empresas: resumenEmpresas,
      contratosPorVencer,
    };
  }
}
