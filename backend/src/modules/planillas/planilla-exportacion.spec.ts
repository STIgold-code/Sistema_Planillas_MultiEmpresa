/**
 * El DTO de exportación tiene que exponer TODO lo que suma en los totales.
 * SENATI integraba `total_aportes_empleador` sin viajar en el DTO, así que el
 * Excel mostraba un total que no cuadraba contra sus columnas y el contador no
 * tenía forma de saber por qué. Este test evita que vuelva a pasar.
 */
import { PrismaService } from '../../prisma/prisma.service';
import { exportarPlanilla } from './planilla-exportacion';
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
    aporta_senati: true,
  },
  periodo_tareo: {
    id: 3,
    mes: 7,
    anio: 2026,
    fecha_inicio: new Date(2026, 5, 26),
    fecha_fin: new Date(2026, 6, 25),
  },
  detalles: [
    {
      empleado: EMPLEADO,
      remuneracion_afecta: 1673,
      essalud_empleador: 150.57,
      sctr_salud_empleador: 0,
      sctr_pension_empleador: 0,
      vida_ley_empleador: 11.88,
      senati_empleador: 12.55,
      total_aportes_empleador: 175,
      descuento_dominical: 55.77,
      total_descuentos_otros: 55.77,
    },
  ],
};

function armarPrisma(planilla: unknown) {
  return {
    planilla: { findFirst: jest.fn().mockResolvedValue(planilla) },
    parametroLegal: { findMany: jest.fn().mockResolvedValue([]) },
    parametroEmpresa: { findMany: jest.fn().mockResolvedValue([]) },
    regimenPensionario: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
}

const parametrosService = {
  cargar: jest.fn().mockResolvedValue(new ParametrosLegalesEnMemoria()),
} as unknown as PlanillaParametrosService;

describe('exportarPlanilla', () => {
  it('expone SENATI y el descuento dominical, que suman en los totales', async () => {
    const dto = await exportarPlanilla(
      armarPrisma(PLANILLA),
      parametrosService,
      9,
      1,
    );

    const detalle = dto.detalles[0];
    expect(detalle.senati_empleador).toBe(12.55);
    expect(detalle.dominical_monto).toBe(55.77);

    // Los aportes visibles + SENATI cierran contra el total del sistema.
    const aportesVisibles =
      detalle.essalud_empleador +
      detalle.sctr_salud_empleador +
      detalle.sctr_pension_empleador +
      detalle.vida_ley_empleador +
      detalle.senati_empleador;
    expect(aportesVisibles).toBeCloseTo(detalle.total_aportes_empleador, 2);
  });

  it('adjunta el bloque de parámetros resuelto al fin de la ventana del período', async () => {
    const dto = await exportarPlanilla(
      armarPrisma(PLANILLA),
      parametrosService,
      9,
      1,
    );

    expect(dto.parametros.vigencia).toEqual(new Date(2026, 6, 25));
    expect(dto.parametros.tasas.length).toBeGreaterThan(0);
    expect(dto.cabecera.empresa.aporta_senati).toBe(true);
  });

  it('cae al mes calendario cuando la planilla no tiene período de tareo', async () => {
    const sinPeriodo = { ...PLANILLA, periodo_tareo: null };
    const dto = await exportarPlanilla(
      armarPrisma(sinPeriodo),
      parametrosService,
      9,
      1,
    );

    expect(dto.parametros.vigencia).toEqual(new Date(2026, 6, 31));
  });

  it('lanza NotFound si la planilla no existe en la empresa activa', async () => {
    await expect(
      exportarPlanilla(armarPrisma(null), parametrosService, 9, 1),
    ).rejects.toThrow('Planilla no encontrada');
  });
});
