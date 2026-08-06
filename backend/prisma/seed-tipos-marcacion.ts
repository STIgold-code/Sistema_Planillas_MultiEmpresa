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
  /** Horas de la jornada pactada; el motor genera extras sobre las 8. */
  horas_diurnas?: number;
  horas_nocturnas?: number;
  /** Al marcar la celda, rellena TareoDetalle.horas con la jornada pactada. */
  requiere_calculo?: boolean;
  /** Feriado laborado: paga valorDía × 2 además del día devengado. */
  es_feriado_trabajado?: boolean;
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
  // Destaque a mina (política BM validada con el PO): jornada diurna de
  // 8h + 4 extras fijas; el motor genera 2h al 25% y 2h al 35% por día.
  {
    codigo: 'MINA',
    descripcion: 'Destaque a mina (8h + 4 extras)',
    color: '#16a34a',
    cuenta_como: 'DIA_TRABAJADO',
    es_laborable: true,
    genera_pago: true,
    horas_default: 12,
    horas_diurnas: 12,
    horas_nocturnas: 0,
    requiere_calculo: true,
  },
  {
    codigo: 'MINA-F',
    descripcion: 'Destaque a mina en feriado',
    color: '#a855f7',
    cuenta_como: 'FERIADO_TRABAJADO',
    es_laborable: true,
    genera_pago: true,
    horas_default: 12,
    horas_diurnas: 12,
    horas_nocturnas: 0,
    requiere_calculo: true,
    es_feriado_trabajado: true,
  },
  // Descanso semanal trabajado al 100% (a elección del trabajador): además
  // del día devengado, el motor paga valorDía × 2 por el descanso laborado.
  {
    codigo: 'DT',
    descripcion: 'Descanso trabajado',
    color: '#eab308',
    cuenta_como: 'DIA_TRABAJADO',
    es_laborable: true,
    genera_pago: true,
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
