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

/**
 * La boleta es el documento legal del trabajador; debe exponer el régimen
 * laboral con el que se calculó la planilla. El dato vive ya como snapshot en
 * `PlanillaDetalle.regimen_laboral`, así que la respuesta de boletas lo LEE del
 * detalle asociado (sin recalcular ni duplicar columna).
 */
describe('BoletasService — régimen laboral en la respuesta', () => {
  function buildService(boleta: unknown) {
    const findMany = jest.fn().mockResolvedValue([boleta]);
    const count = jest.fn().mockResolvedValue(1);
    const findFirst = jest.fn().mockResolvedValue(boleta);
    const prisma = {
      boleta: { findMany, count, findFirst },
    };
    const service = new BoletasService(
      prisma as never,
      {} as never,
      {} as never,
    );
    return { service, findMany, findFirst };
  }

  it('findAll selecciona regimen_laboral del planilla_detalle y lo devuelve', async () => {
    const boleta = {
      id: 10,
      anio: 2026,
      mes: 3,
      planilla_detalle: {
        neto_pagar: 1000,
        total_ingresos: 1200,
        total_descuentos: 200,
        regimen_laboral: RegimenLaboralPrisma.PEQUENA_EMPRESA,
      },
    };
    const { service, findMany } = buildService(boleta);

    const res = await service.findAll(7, {} as never);

    const calls = findMany.mock.calls as unknown as Array<
      [{ include: { planilla_detalle: { select: Record<string, boolean> } } }]
    >;
    const arg = calls[0][0];
    expect(arg.include.planilla_detalle.select.regimen_laboral).toBe(true);
    expect(res.data[0].planilla_detalle.regimen_laboral).toBe(
      RegimenLaboralPrisma.PEQUENA_EMPRESA,
    );
  });

  it('findByEmpleado selecciona regimen_laboral del planilla_detalle', async () => {
    const boleta = {
      id: 11,
      anio: 2026,
      mes: 3,
      planilla_detalle: {
        neto_pagar: 1000,
        total_ingresos: 1200,
        total_descuentos: 200,
        regimen_laboral: RegimenLaboralPrisma.MICROEMPRESA,
      },
    };
    const { service, findMany } = buildService(boleta);

    const res = await service.findByEmpleado(5, 7, {} as never);

    const calls = findMany.mock.calls as unknown as Array<
      [{ include: { planilla_detalle: { select: Record<string, boolean> } } }]
    >;
    const arg = calls[0][0];
    expect(arg.include.planilla_detalle.select.regimen_laboral).toBe(true);
    expect(res.data[0].planilla_detalle.regimen_laboral).toBe(
      RegimenLaboralPrisma.MICROEMPRESA,
    );
  });

  it('findOne devuelve el regimen_laboral del detalle asociado', async () => {
    const boleta = {
      id: 12,
      anio: 2026,
      mes: 3,
      empresa_id: 7,
      planilla_detalle: {
        regimen_laboral: RegimenLaboralPrisma.GENERAL,
      },
    };
    const { service, findFirst } = buildService(boleta);

    const res = (await service.findOne(12, 7)) as {
      planilla_detalle: { regimen_laboral: RegimenLaboralPrisma };
    };

    expect(findFirst).toHaveBeenCalled();
    expect(res.planilla_detalle.regimen_laboral).toBe(
      RegimenLaboralPrisma.GENERAL,
    );
  });
});
