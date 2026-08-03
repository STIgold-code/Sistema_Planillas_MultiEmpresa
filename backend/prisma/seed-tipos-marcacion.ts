/**
 * Seed idempotente del catálogo de tipos de marcación del tareo.
 *
 * Completa color y cuenta_como (los usa la leyenda y la grilla del frontend)
 * y agrega las licencias con/sin goce. Paleta y categorías alineadas con el
 * sistema RRHH de origen. No modifica es_laborable / genera_pago de tipos
 * existentes: esos campos afectan el motor de cálculo, no la presentación.
 *
 * Ejecución: npx ts-node prisma/seed-tipos-marcacion.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TipoMarcacionSeed {
  codigo: string;
  descripcion: string;
  color: string;
  cuenta_como: string;
  es_laborable: boolean;
  genera_pago: boolean;
  horas_default: number;
}

const TIPOS: TipoMarcacionSeed[] = [
  {
    codigo: 'A',
    descripcion: 'Asistió',
    color: '#22c55e',
    cuenta_como: 'DIA_TRABAJADO',
    es_laborable: true,
    genera_pago: true,
    horas_default: 8,
  },
  {
    codigo: 'F',
    descripcion: 'Falta',
    color: '#ef4444',
    cuenta_como: 'FALTA',
    es_laborable: true,
    genera_pago: false,
    horas_default: 8,
  },
  {
    codigo: 'V',
    descripcion: 'Vacaciones',
    color: '#14b8a6',
    cuenta_como: 'VACACIONES',
    es_laborable: true,
    genera_pago: true,
    horas_default: 8,
  },
  {
    codigo: 'DM',
    descripcion: 'Descanso médico',
    color: '#f97316',
    cuenta_como: 'SUBSIDIADO',
    es_laborable: true,
    genera_pago: true,
    horas_default: 8,
  },
  {
    codigo: 'FJ',
    descripcion: 'Falta justificada',
    color: '#f59e0b',
    cuenta_como: 'FALTA_JUSTIFICADA',
    es_laborable: true,
    genera_pago: true,
    horas_default: 8,
  },
  {
    codigo: 'DL',
    descripcion: 'Descanso laboral',
    color: '#eab308',
    cuenta_como: 'NO_LABORABLE',
    es_laborable: false,
    genera_pago: true,
    horas_default: 8,
  },
  {
    codigo: 'LCG',
    descripcion: 'Licencia con goce',
    color: '#6b7280',
    cuenta_como: 'LICENCIA',
    es_laborable: true,
    genera_pago: true,
    horas_default: 8,
  },
  {
    codigo: 'LSG',
    descripcion: 'Licencia sin goce',
    color: '#6b7280',
    cuenta_como: 'LICENCIA',
    es_laborable: false,
    genera_pago: false,
    horas_default: 8,
  },
];

async function main(): Promise<void> {
  for (const tipo of TIPOS) {
    const existente = await prisma.tipoMarcacion.findUnique({
      where: { codigo: tipo.codigo },
    });

    if (existente) {
      // Solo presentación: color y cuenta_como. No tocar flags de cálculo.
      await prisma.tipoMarcacion.update({
        where: { codigo: tipo.codigo },
        data: { color: tipo.color, cuenta_como: tipo.cuenta_como },
      });
      console.log(`~ ${tipo.codigo}: color/cuenta_como actualizados`);
    } else {
      await prisma.tipoMarcacion.create({ data: tipo });
      console.log(`+ ${tipo.codigo}: creado (${tipo.descripcion})`);
    }
  }

  const total = await prisma.tipoMarcacion.count();
  console.log(`Catálogo listo: ${total} tipos de marcación.`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
