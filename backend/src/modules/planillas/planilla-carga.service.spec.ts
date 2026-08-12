/**
 * Tests de aislamiento multi-tenant en la resolución del período de tareo (C-5).
 *
 * `resolverPeriodoTareo`, cuando la planilla ya trae `periodo_tareo_id`, debe
 * verificar que ese período pertenezca a la MISMA empresa. Un período de otra
 * empresa (IDOR cross-tenant) no debe usarse jamás: findFirst con empresa_id
 * devuelve null y el servicio aborta por inconsistencia.
 */
import { BadRequestException } from '@nestjs/common';
import { PlanillaCargaService } from './planilla-carga.service';

describe('PlanillaCargaService.resolverPeriodoTareo — IDOR cross-tenant (C-5)', () => {
  function build(findFirstResult: unknown) {
    const findFirst = jest.fn().mockResolvedValue(findFirstResult);
    const prisma = { periodoTareo: { findFirst } };
    const service = new PlanillaCargaService(prisma as never);
    return { service, findFirst };
  }

  it('scopea por empresa_id al resolver un periodo_tareo_id explícito', async () => {
    const { service, findFirst } = build({
      id: 99,
      estado: 'CERRADO',
      fecha_inicio: new Date(Date.UTC(2026, 1, 26)),
      fecha_fin: new Date(Date.UTC(2026, 2, 25)),
    });
    const resultado = await service.resolverPeriodoTareo(
      { periodo_tareo_id: 99, anio: 2026, mes: 3 },
      7,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 99, empresa_id: 7 },
    });
    // Devuelve la VENTANA real del período (aquí, con día de corte 25).
    expect(resultado.ventana?.fechaInicio.getDate()).toBe(26);
    expect(resultado.ventana?.fechaFin.getDate()).toBe(25);
  });

  it('aborta si el período pertenece a otra empresa (findFirst → null)', async () => {
    const { service } = build(null);
    await expect(
      service.resolverPeriodoTareo(
        { periodo_tareo_id: 99, anio: 2026, mes: 3 },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PlanillaCargaService.cargarContratosVigencia', () => {
  function build(contratos: unknown[]) {
    const findMany = jest.fn().mockResolvedValue(contratos);
    const prisma = { contrato: { findMany } };
    const service = new PlanillaCargaService(prisma as never);
    return { service, findMany };
  }

  it('scopea por empresa, descarta anulados y exige remuneración registrada', async () => {
    const { service, findMany } = build([]);
    const cierre = new Date(2026, 5, 30);

    await service.cargarContratosVigencia(7, [1, 2], cierre);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        empleado_id: { in: [1, 2] },
        empleado: { empresa_id: 7 },
        estado: { in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'] },
        fecha_inicio: { lte: cierre },
        remuneracion: { not: null },
      },
      select: {
        empleado_id: true,
        fecha_inicio: true,
        fecha_fin: true,
        remuneracion: true,
      },
      orderBy: { fecha_inicio: 'asc' },
    });
  });

  it('agrupa el historial por empleado conservando todas sus vigencias', async () => {
    const { service } = build([
      {
        empleado_id: 4,
        fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
        fecha_fin: new Date(Date.UTC(2026, 5, 30)),
        remuneracion: 1800,
      },
      {
        empleado_id: 4,
        fecha_inicio: new Date(Date.UTC(2026, 6, 1)),
        fecha_fin: null,
        remuneracion: 2000,
      },
      {
        empleado_id: 11,
        fecha_inicio: new Date(Date.UTC(2021, 0, 1)),
        fecha_fin: null,
        remuneracion: 1600,
      },
    ]);

    const mapa = await service.cargarContratosVigencia(
      7,
      [4, 11],
      new Date(2026, 5, 30),
    );

    expect(mapa.get(4)).toHaveLength(2);
    expect(mapa.get(11)).toHaveLength(1);
    expect(mapa.get(99)).toBeUndefined();
  });
});
