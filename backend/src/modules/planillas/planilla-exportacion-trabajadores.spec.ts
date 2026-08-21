/**
 * La exportación por trabajador tiene que clasificar cada día del tareo con la
 * MISMA regla que el motor (si devenga, si recorta el dominical), derivar la
 * fecha real desde el ordinal con la ventana del período y traer los acumulados
 * de renta, los cargos de préstamos y el historial con los que el Excel
 * reconstruye cada importe. Este spec fija ese contrato.
 */
import { PrismaService } from '../../prisma/prisma.service';
import { exportarPlanillaTrabajadores } from './planilla-exportacion-trabajadores';
import { PlanillaParametrosService } from './planilla-parametros.service';
import { ParametrosLegalesEnMemoria } from './infraestructura/parametros-legales-en-memoria';

const EMPLEADO = {
  estado: 'ACTIVO',
  numero_documento: '12345678',
  apellido_paterno: 'GUERRERO',
  apellido_materno: 'RAMOS',
  nombres: 'JUAN',
  fecha_ingreso: new Date(2024, 0, 2),
  fecha_cese: null,
  cuspp: null,
  tipo_comision_afp: null,
  nro_cuenta_haberes: null,
  cci_haberes: null,
  fecha_nacimiento: null,
  cargo: { nombre: 'VIGILANTE' },
  sede: null,
  regimen_pensionario: { tipo: 'ONP', nombre: 'ONP' },
  banco_haberes: null,
};

const PERIODO = {
  id: 3,
  mes: 7,
  anio: 2026,
  fecha_inicio: new Date(Date.UTC(2026, 5, 26)),
  fecha_fin: new Date(Date.UTC(2026, 6, 25)),
};

const PLANILLA = {
  id: 9,
  mes: 7,
  anio: 2026,
  estado: 'APROBADA',
  total_empleados: 1,
  total_bruto: 1673,
  total_descuentos: 233.09,
  total_neto: 1439.91,
  empresa: {
    razon_social: 'GRUPO BM S.A.C.',
    nombre_comercial: 'GRUPO BM',
    ruc: '20000000001',
    aporta_senati: false,
  },
  periodo_tareo: PERIODO,
  detalles: [
    {
      empleado_id: 11,
      empleado: { ...EMPLEADO, domiciliado: true },
      dias_permiso: 0,
      minutos_tardanza: 45,
      remuneracion_afecta: 1673,
      essalud_empleador: 150.57,
      total_aportes_empleador: 150.57,
      descuento_dominical: 10,
      total_descuentos_otros: 10,
    },
  ],
};

function marcacion(codigo: string, extra: Record<string, unknown> = {}) {
  return {
    codigo,
    descripcion: codigo,
    es_laborable: true,
    es_feriado_trabajado: false,
    horas_diurnas: 8,
    horas_nocturnas: 0,
    horas_default: 8,
    ...extra,
  };
}

const TAREOS = [
  {
    empleado_id: 11,
    detalles: [
      { dia: 1, horas: 8, tipo_marcacion: marcacion('A') },
      {
        dia: 2,
        horas: 0,
        tipo_marcacion: marcacion('F', { horas_diurnas: 0 }),
      },
      {
        dia: 3,
        horas: 0,
        tipo_marcacion: marcacion('DM', { horas_diurnas: 0 }),
      },
      {
        dia: 4,
        horas: 12,
        tipo_marcacion: marcacion('MINA', { horas_diurnas: 12 }),
      },
      { dia: 5, horas: 8, tipo_marcacion: marcacion('LSG') },
      { dia: 6, horas: 8, tipo_marcacion: null },
    ],
  },
];

const CARGOS = [
  {
    monto: 100,
    fecha: new Date(2026, 6, 25),
    prestamo: {
      id: 1,
      empleado_id: 11,
      tipo: 'PRESTAMO',
      fecha_otorgado: new Date(Date.UTC(2026, 4, 10)),
      monto_total: 500,
      cuota_mensual: 100,
      saldo: 300,
      movimientos: [
        { fecha: new Date(2026, 5, 25) },
        { fecha: new Date(2026, 6, 25) },
      ],
    },
  },
];

/** Préstamo activo sin cargo registrado todavía (planilla no aprobada). */
const PRESTAMOS_VIGENTES = [
  {
    id: 2,
    empleado_id: 11,
    tipo: 'ADELANTO_SUELDO',
    fecha_otorgado: new Date(Date.UTC(2026, 6, 1)),
    monto_total: 300,
    cuota_mensual: 300,
    saldo: 300,
    _count: { movimientos: 0 },
  },
];

const HISTORIAL = [
  {
    empleado_id: 11,
    dias_trabajados: 30,
    remuneracion_afecta: 1713,
    renta_5ta: 0,
    horas_extras: 0,
    bonificaciones: 0,
    gratificacion_monto: 0,
    planilla: { anio: 2026, mes: 6, estado: 'CALCULADA' },
  },
];

function armarPrisma() {
  return {
    planilla: {
      findFirst: jest.fn().mockResolvedValue(PLANILLA),
      findFirstOrThrow: jest.fn().mockResolvedValue(PLANILLA),
    },
    parametroLegal: { findMany: jest.fn().mockResolvedValue([]) },
    parametroEmpresa: { findMany: jest.fn().mockResolvedValue([]) },
    regimenPensionario: { findMany: jest.fn().mockResolvedValue([]) },
    tareo: { findMany: jest.fn().mockResolvedValue(TAREOS) },
    planillaDetalle: {
      groupBy: jest.fn().mockResolvedValue([
        {
          empleado_id: 11,
          _sum: { remuneracion_afecta: 10118, retenciones: 0, renta_5ta: 12.5 },
        },
      ]),
      findMany: jest.fn().mockResolvedValue(HISTORIAL),
    },
    prestamoMovimiento: { findMany: jest.fn().mockResolvedValue(CARGOS) },
    prestamo: { findMany: jest.fn().mockResolvedValue(PRESTAMOS_VIGENTES) },
  } as unknown as PrismaService;
}

const parametrosService = {
  cargar: jest.fn().mockResolvedValue(new ParametrosLegalesEnMemoria()),
} as unknown as PlanillaParametrosService;

describe('exportarPlanillaTrabajadores', () => {
  it('deriva la fecha real de cada día desde el ordinal con la ventana del período', async () => {
    const dto = await exportarPlanillaTrabajadores(
      armarPrisma(),
      parametrosService,
      9,
      1,
    );
    const tareo = dto.trazabilidad[0].tareo;

    expect(dto.periodo).toEqual({
      fecha_inicio: '2026-06-26',
      fecha_fin: '2026-07-25',
      dias: 30,
    });
    expect(tareo[0].fecha).toBe('2026-06-26');
    expect(tareo[4].fecha).toBe('2026-06-30');
  });

  it('clasifica cada día con la regla del motor: devenga y sin goce', async () => {
    const dto = await exportarPlanillaTrabajadores(
      armarPrisma(),
      parametrosService,
      9,
      1,
    );
    const porCodigo = new Map(
      dto.trazabilidad[0].tareo.map((d) => [d.codigo, d]),
    );

    // Asistió: devenga y no recorta.
    expect(porCodigo.get('A')).toMatchObject({
      devenga: true,
      sin_goce: false,
    });
    // Falta: no devenga (sale de la base) y recorta el dominical.
    expect(porCodigo.get('F')).toMatchObject({
      devenga: false,
      sin_goce: true,
    });
    // Descanso médico: no devenga en el haber pero NO recorta el dominical.
    expect(porCodigo.get('DM')).toMatchObject({
      devenga: false,
      sin_goce: false,
    });
    // Licencia sin goce: igual que la falta.
    expect(porCodigo.get('LSG')).toMatchObject({
      devenga: false,
      sin_goce: true,
    });
    // Destaque a mina de 12 h: devenga y sus horas viajan para las extras.
    expect(porCodigo.get('MINA')).toMatchObject({ devenga: true, horas: 12 });
  });

  it('ignora los días sin marcación', async () => {
    const dto = await exportarPlanillaTrabajadores(
      armarPrisma(),
      parametrosService,
      9,
      1,
    );
    expect(dto.trazabilidad[0].tareo).toHaveLength(5);
  });

  it('trae los acumulados de renta, los cargos de préstamos y el historial del trabajador', async () => {
    const dto = await exportarPlanillaTrabajadores(
      armarPrisma(),
      parametrosService,
      9,
      1,
    );
    const t = dto.trazabilidad[0];

    expect(t.renta).toEqual({
      acumulado_previo: 10118,
      retenciones_previas: 12.5,
    });
    expect(t.minutos_tardanza).toBe(45);
    expect(t.domiciliado).toBe(true);

    // Con cargos registrados, esos son la verdad (no los préstamos vigentes).
    expect(t.prestamos).toHaveLength(1);
    expect(t.prestamos[0]).toMatchObject({
      tipo: 'PRESTAMO',
      cargo: 100,
      cuota_numero: 2,
      cuotas_previstas: 5,
      saldo_actual: 300,
      fecha_otorgado: '2026-05-10',
      origen: 'MOVIMIENTO',
    });

    expect(t.historial).toHaveLength(1);
    expect(t.historial[0]).toMatchObject({
      anio: 2026,
      mes: 6,
      remuneracion_afecta: 1713,
    });
  });

  it('expone la escala del impuesto a la renta con el tramo superior abierto', async () => {
    const dto = await exportarPlanillaTrabajadores(
      armarPrisma(),
      parametrosService,
      9,
      1,
    );
    const tramos = dto.parametros.tramos_ir;

    expect(tramos.length).toBeGreaterThan(0);
    expect(tramos[0]).toMatchObject({ desde_uit: 0, hasta_uit: 5, tasa: 0.08 });
    expect(tramos[tramos.length - 1].hasta_uit).toBeNull();
    expect(dto.parametros.deduccion_uit).toBe(7);
  });

  it('sin cargos registrados explica el descuento con los préstamos vigentes, como el cálculo', async () => {
    const prisma = armarPrisma();
    (prisma.prestamoMovimiento.findMany as jest.Mock).mockResolvedValue([]);

    const dto = await exportarPlanillaTrabajadores(
      prisma,
      parametrosService,
      9,
      1,
    );
    const t = dto.trazabilidad[0];

    expect(t.prestamos).toHaveLength(1);
    expect(t.prestamos[0]).toMatchObject({
      tipo: 'ADELANTO_SUELDO',
      cargo: 300,
      cuota_numero: 1,
      cuotas_previstas: 1,
      origen: 'VIGENTE',
    });
  });

  it('devuelve un tareo vacío cuando la planilla no tiene período de tareo', async () => {
    const prisma = armarPrisma();
    const sinPeriodo = { ...PLANILLA, periodo_tareo: null };
    (prisma.planilla.findFirst as jest.Mock).mockResolvedValue(sinPeriodo);
    (prisma.planilla.findFirstOrThrow as jest.Mock).mockResolvedValue(
      sinPeriodo,
    );

    const dto = await exportarPlanillaTrabajadores(
      prisma,
      parametrosService,
      9,
      1,
    );
    expect(dto.periodo).toBeNull();
    expect(dto.trazabilidad[0].tareo).toEqual([]);
  });
});
