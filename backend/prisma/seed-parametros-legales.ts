/**
 * Idempotent seeder for the `parametros_legales` table.
 *
 * Seeds the SCALAR legal parameters consumed by the Prisma-backed
 * `ParametrosLegales` adapter, using EXACTLY the same values the in-memory
 * adapter wraps from `planillas.config.ts` (RMV, UIT, asignación familiar,
 * EsSalud tasa/mínimo, SCTR salud/pensión, SIS microempresa). Using identical
 * values is CRITICAL: it guarantees that swapping the in-memory adapter for the
 * Prisma adapter does NOT move any calculation — parity stays intact.
 *
 * The IR brackets (tramosIR), agrario and construcción civil tables are
 * STRUCTURED and do not fit the single-Decimal `parametros_legales` row, so they
 * are intentionally NOT seeded here; the Prisma adapter delegates them to the
 * in-memory fallback until a structured schema lands.
 *
 * Idempotent: upserts by (clave, vigencia_desde) so repeated runs converge to
 * the same rows without duplicating. Safe to call from the main restore seed or
 * standalone.
 */
import { PrismaClient } from '@prisma/client';

/** Valores escalares, espejo EXACTO de los defaults de `planillas.config.ts`. */
const RMV = Number(process.env.PLANILLA_RMV) || 1130;
const UIT = Number(process.env.PLANILLA_UIT) || 5500;
const ASIGNACION_FAMILIAR = Number(process.env.PLANILLA_ASIG_FAMILIAR) || 113;
const ESSALUD_TASA = Number(process.env.PLANILLA_ESSALUD_PCT) || 0.09;
const ESSALUD_MINIMO = Number(process.env.PLANILLA_ESSALUD_MIN) || 101.7;
const SCTR_NIVEL_II = 0.0123;
const SCTR_SALUD = Number(process.env.PLANILLA_SCTR_SALUD_TASA) || SCTR_NIVEL_II;
const SCTR_PENSION =
  Number(process.env.PLANILLA_SCTR_PENSION_TASA) || SCTR_NIVEL_II;
/** Placeholder espejo del in-memory (SIS microempresa). */
const SIS_MICROEMPRESA = 15;

/**
 * Vigencia base: 2025-01-01, idéntica a `VIGENCIA_BASE` del adapter in-memory,
 * de modo que la resolución por fecha sea idéntica.
 */
const VIGENCIA_DESDE = new Date('2025-01-01');

interface SemillaEscalar {
  clave: string;
  valor: number;
  descripcion: string;
}

const PARAMETROS_ESCALARES: SemillaEscalar[] = [
  { clave: 'rmv', valor: RMV, descripcion: 'Remuneración Mínima Vital' },
  { clave: 'uit', valor: UIT, descripcion: 'Unidad Impositiva Tributaria' },
  {
    clave: 'asignacionFamiliar',
    valor: ASIGNACION_FAMILIAR,
    descripcion: 'Asignación familiar (10% RMV)',
  },
  {
    clave: 'essaludTasa',
    valor: ESSALUD_TASA,
    descripcion: 'Tasa EsSalud empleador (fracción)',
  },
  {
    clave: 'essaludMinimo',
    valor: ESSALUD_MINIMO,
    descripcion: 'Piso EsSalud (9% de RMV)',
  },
  {
    clave: 'sisMicroempresa',
    valor: SIS_MICROEMPRESA,
    descripcion: 'Aporte SIS semicontributivo microempresa REMYPE',
  },
  {
    clave: 'sctrSalud',
    valor: SCTR_SALUD,
    descripcion: 'Tasa SCTR Salud (fracción)',
  },
  {
    clave: 'sctrPension',
    valor: SCTR_PENSION,
    descripcion: 'Tasa SCTR Pensión (fracción)',
  },
];

/**
 * Inserta o actualiza las filas escalares de `parametros_legales`. Idempotente:
 * busca por (clave, vigencia_desde); actualiza el valor si ya existe, inserta si
 * no. No borra otras vigencias.
 */
export async function seedParametrosLegales(
  prisma: PrismaClient,
): Promise<number> {
  let afectadas = 0;

  for (const p of PARAMETROS_ESCALARES) {
    // Idempotente por la clave compuesta UNIQUE(clave, vigencia_desde): un solo
    // upsert atómico, sin carrera entre findFirst y create.
    await prisma.parametroLegal.upsert({
      where: {
        clave_vigencia_desde: {
          clave: p.clave,
          vigencia_desde: VIGENCIA_DESDE,
        },
      },
      update: { valor: p.valor, descripcion: p.descripcion },
      create: {
        clave: p.clave,
        valor: p.valor,
        descripcion: p.descripcion,
        vigencia_desde: VIGENCIA_DESDE,
        vigencia_hasta: null,
      },
    });
    afectadas += 1;
  }

  return afectadas;
}

/** Permite ejecutar el seeder de parámetros de forma standalone. */
async function main() {
  // Cargar variables de entorno (DATABASE_URL) al ejecutar standalone.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
  const prisma = new PrismaClient();
  try {
    const n = await seedParametrosLegales(prisma);
    console.log(`parametros_legales: ${n} filas escalares sembradas (idempotente)`);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo cuando se invoca directamente (no al importar desde seed.ts).
if (require.main === module) {
  main().catch((e) => {
    console.error('Error sembrando parametros_legales:', e);
    process.exit(1);
  });
}
