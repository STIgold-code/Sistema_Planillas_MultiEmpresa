import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ParametrosLegales } from './dominio/parametros/parametros-legales';
import { ParametrosLegalesEnMemoria } from './infraestructura/parametros-legales-en-memoria';
import {
  ParametrosLegalesPrisma,
  FilaParametroLegal,
} from './infraestructura/parametros-legales-prisma';

/**
 * Carga los parámetros legales para el motor de planillas.
 *
 * Construye el adapter Prisma de `ParametrosLegales` leyendo las filas escalares
 * de la tabla `parametros_legales` y delegando las claves estructuradas (tramos
 * IR, agrario, construcción civil) al adapter in-memory de respaldo. El dominio
 * solo ve la interfaz `ParametrosLegales` (DIP).
 *
 * Si la tabla no tiene filas (entorno sin seed), el adapter Prisma lanzaría
 * `ParametroLegalNoVigenteError` al resolver un escalar; para no romper entornos
 * sin seed se devuelve directamente el in-memory como fallback total.
 */
@Injectable()
export class PlanillaParametrosService {
  constructor(private prisma: PrismaService) {}

  async cargar(): Promise<ParametrosLegales> {
    const fallback = new ParametrosLegalesEnMemoria();

    const filas = await this.prisma.parametroLegal.findMany({
      select: {
        clave: true,
        valor: true,
        vigencia_desde: true,
        vigencia_hasta: true,
      },
    });

    // Sin seed → usar el in-memory completo (no romper entornos sin parámetros).
    if (filas.length === 0) return fallback;

    const filasAdapter: FilaParametroLegal[] = filas.map((f) => ({
      clave: f.clave,
      valor: f.valor,
      vigencia_desde: f.vigencia_desde,
      vigencia_hasta: f.vigencia_hasta,
    }));

    return new ParametrosLegalesPrisma(filasAdapter, fallback);
  }
}
