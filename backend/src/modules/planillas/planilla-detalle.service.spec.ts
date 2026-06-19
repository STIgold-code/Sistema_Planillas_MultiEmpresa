/**
 * Tests de guardia de certificación en la edición de detalle (C-1).
 *
 * `updateDetalle` recalcula y persiste montos de planilla. Antes de cualquier
 * recálculo/persistencia debe re-validar que el régimen laboral del empleado
 * esté certificado para producción: un empleado AGRARIO/CC (no certificado)
 * debe ser rechazado con BadRequestException ANTES de tocar la transacción.
 */
import { BadRequestException } from '@nestjs/common';
import { PlanillaDetalleService } from './planilla-detalle.service';
import { RegimenLaboral as RegimenLaboralPrisma } from '@prisma/client';

describe('PlanillaDetalleService.updateDetalle — guardia de certificación (C-1)', () => {
  function build(regimenContrato: RegimenLaboralPrisma) {
    const detalle = {
      id: 10,
      planilla_id: 1,
      dias_trabajados: 30,
      sueldo_base: 3000,
      empleado: {
        regimen_pensionario: { tipo: 'ONP', aporte_obligatorio: 13 },
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
        contratos: [{ regimen_laboral: regimenContrato }],
      },
    };
    const transaction = jest.fn();
    const prisma = {
      planillaDetalle: {
        findFirst: jest.fn().mockResolvedValue(detalle),
      },
      $transaction: transaction,
    };
    const consulta = {
      findOneSimple: jest
        .fn()
        .mockResolvedValue({ id: 1, estado: 'CALCULADA' }),
    };
    const auditoria = { registrar: jest.fn() };
    const service = new PlanillaDetalleService(
      prisma as never,
      consulta as never,
      auditoria as never,
    );
    return { service, transaction };
  }

  it('rechaza un empleado AGRARIO (no certificado) ANTES de persistir', async () => {
    const { service, transaction } = build(RegimenLaboralPrisma.AGRARIO);
    await expect(
      service.updateDetalle(1, 10, 5, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rechaza un empleado CONSTRUCCION_CIVIL (no certificado) ANTES de persistir', async () => {
    const { service, transaction } = build(
      RegimenLaboralPrisma.CONSTRUCCION_CIVIL,
    );
    await expect(
      service.updateDetalle(1, 10, 5, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('permite un empleado GENERAL (certificado): no aborta por la guardia', async () => {
    const { service, transaction } = build(RegimenLaboralPrisma.GENERAL);
    transaction.mockResolvedValue({ id: 10 });
    await expect(
      service.updateDetalle(1, 10, 5, {} as never),
    ).resolves.toBeDefined();
    expect(transaction).toHaveBeenCalled();
  });
});
