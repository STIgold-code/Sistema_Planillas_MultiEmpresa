/**
 * Resolución del régimen laboral aplicable a un empleado en un período.
 *
 * Regla de negocio: el régimen del CONTRATO tiene prioridad sobre el régimen por
 * defecto de la EMPRESA (override). Si el contrato no especifica régimen, se usa
 * el `regimen_laboral_default` de la empresa (que en el schema nunca es null:
 * `@default(GENERAL)`).
 *
 * Capa de aplicación: traduce el enum de Prisma (`@prisma/client`) al enum puro
 * del dominio (`RegimenLaboral`). El dominio NUNCA importa Prisma; el mapeo vive
 * aquí, en el borde. Ambos enums comparten los mismos miembros por contrato de
 * diseño, de modo que el mapeo es 1:1 y verificable.
 */
import { RegimenLaboral as RegimenLaboralPrisma } from '@prisma/client';
import { RegimenLaboral } from '../dominio/tipos';

/** Subset de campos requeridos del contrato para resolver el régimen. */
export interface ContratoConRegimen {
  regimen_laboral: RegimenLaboralPrisma | null;
}

/** Subset de campos requeridos de la empresa para resolver el régimen. */
export interface EmpresaConRegimenDefault {
  regimen_laboral_default: RegimenLaboralPrisma;
}

/**
 * Mapea el enum de Prisma al enum del dominio. Falla rápido si Prisma introduce
 * un miembro que el dominio aún no soporta (evita un mapeo silencioso a GENERAL).
 */
export function mapearRegimenPrisma(
  regimen: RegimenLaboralPrisma,
): RegimenLaboral {
  const dominio = RegimenLaboral[regimen as keyof typeof RegimenLaboral];
  if (!dominio) {
    throw new Error(
      `Régimen laboral Prisma "${regimen}" sin equivalente en el dominio`,
    );
  }
  return dominio;
}

/**
 * Devuelve el régimen laboral efectivo: el del contrato si existe, de lo
 * contrario el por defecto de la empresa.
 */
export function resolverRegimenLaboral(
  contrato: ContratoConRegimen | null | undefined,
  empresa: EmpresaConRegimenDefault,
): RegimenLaboral {
  const prisma = contrato?.regimen_laboral ?? empresa.regimen_laboral_default;
  return mapearRegimenPrisma(prisma);
}
