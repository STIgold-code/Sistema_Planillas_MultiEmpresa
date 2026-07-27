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

  /**
   * @param empresaId Empresa del período: sus filas de `parametros_empresa`
   *   (tasas propias de póliza/contrato, versionadas) se superponen a los
   *   valores nacionales. Omitido → solo nacionales (comportamiento previo).
   */
  async cargar(empresaId?: number): Promise<ParametrosLegales> {
    const fallback = new ParametrosLegalesEnMemoria();

    const seleccion = {
      clave: true,
      valor: true,
      vigencia_desde: true,
      vigencia_hasta: true,
    } as const;

    type FilaCruda = {
      clave: string;
      valor: unknown;
      vigencia_desde: Date;
      vigencia_hasta: Date | null;
    };

    const [filas, filasEmpresa] = await Promise.all([
      this.prisma.parametroLegal.findMany({ select: seleccion }),
      empresaId
        ? this.prisma.parametroEmpresa.findMany({
            where: { empresa_id: empresaId },
            select: seleccion,
          })
        : Promise.resolve<FilaCruda[]>([]),
    ]);

    // Sin seed → usar el in-memory completo (no romper entornos sin parámetros).
    if (filas.length === 0) return fallback;

    const aAdapter = (
      lista: {
        clave: string;
        valor: unknown;
        vigencia_desde: Date;
        vigencia_hasta: Date | null;
      }[],
    ): FilaParametroLegal[] =>
      lista.map((f) => ({
        clave: f.clave,
        valor: f.valor,
        vigencia_desde: f.vigencia_desde,
        vigencia_hasta: f.vigencia_hasta,
      }));

    return new ParametrosLegalesPrisma(
      aAdapter(filas),
      fallback,
      aAdapter(filasEmpresa),
    );
  }
}
