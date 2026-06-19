/**
 * Tests de re-validación de certificación al generar boletas (C-2).
 *
 * `generarBoletas` promueve detalles al documento legal (boleta). Antes de crear
 * cualquier boleta debe re-validar el régimen laboral de cada empleado: si algún
 * empleado pertenece a un régimen no certificado (AGRARIO/CC), la transacción se
 * aborta nombrándolo y NO se crea ninguna boleta.
 */
import { BadRequestException } from '@nestjs/common';
import { BoletasService } from './boletas.service';
import { RegimenLaboral as RegimenLaboralPrisma } from '@prisma/client';

describe('BoletasService.generarBoletas — guardia de certificación (C-2)', () => {
  function build(regimenContrato: RegimenLaboralPrisma) {
    const planilla = {
      id: 1,
      anio: 2026,
      mes: 3,
      estado: 'APROBADA',
      detalles: [
        {
          id: 50,
          empleado_id: 5,
          boleta: null,
          empleado: {
            nombres: 'Juan',
            apellido_paterno: 'Pérez',
            empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
            contratos: [{ regimen_laboral: regimenContrato }],
          },
        },
      ],
    };
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      planilla: { findFirst: jest.fn().mockResolvedValue(planilla) },
      boleta: { createMany },
    };
    const prisma = {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    };
    const service = new BoletasService(
      prisma as never,
      {} as never,
      {} as never,
    );
    return { service, createMany };
  }

  it('aborta si un empleado es AGRARIO (no certificado) sin crear boletas', async () => {
    const { service, createMany } = build(RegimenLaboralPrisma.AGRARIO);
    await expect(
      service.generarBoletas({ planilla_id: 1 } as never, 7, 3),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('aborta si un empleado es CONSTRUCCION_CIVIL (no certificado)', async () => {
    const { service, createMany } = build(
      RegimenLaboralPrisma.CONSTRUCCION_CIVIL,
    );
    await expect(
      service.generarBoletas({ planilla_id: 1 } as never, 7, 3),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('genera boletas para un empleado GENERAL (certificado)', async () => {
    const { service, createMany } = build(RegimenLaboralPrisma.GENERAL);
    const res = await service.generarBoletas({ planilla_id: 1 } as never, 7, 3);
    expect(createMany).toHaveBeenCalled();
    expect(res.cantidad).toBe(1);
  });
});
