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
    const { service, findFirst } = build({ id: 99, estado: 'CERRADO' });
    await service.resolverPeriodoTareo(
      { periodo_tareo_id: 99, anio: 2026, mes: 3 },
      7,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 99, empresa_id: 7 },
    });
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
