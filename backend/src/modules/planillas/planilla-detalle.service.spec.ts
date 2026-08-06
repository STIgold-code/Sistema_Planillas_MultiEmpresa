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

/**
 * El recálculo por fila (`updateDetalle`) y el cálculo completo de la planilla
 * deben producir el MISMO total de ingresos. La bonificación extraordinaria
 * (Ley 30334) y el descanso trabajado se perdían del total al editar cualquier
 * concepto, lo que bajaba el neto del trabajador (bug reportado al registrar un
 * adelanto de quincena: el total caía exactamente en el monto de la bonificación).
 */
describe('PlanillaDetalleService.updateDetalle — total de ingresos alineado con el cálculo completo', () => {
  /** Subset numérico del `data` de actualización que verifican estos tests. */
  type DataDetalleActualizado = Partial<Record<string, number>>;

  interface DetalleFila {
    sueldo_base: number;
    dias_trabajados: number;
    gratificacion_monto: number;
    bonif_extraordinaria: number;
    descanso_trabajado_monto: number;
    adelanto_quincena: number;
  }

  function build(fila: DetalleFila) {
    const detalle = {
      id: 10,
      planilla_id: 1,
      observaciones: null,
      empleado: {
        regimen_pensionario: { tipo: 'ONP', aporte_obligatorio: 13 },
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
        contratos: [{ regimen_laboral: RegimenLaboralPrisma.GENERAL }],
      },
      ...fila,
    };

    // Captura tipada del `data` que el servicio manda al update de Prisma.
    let dataEnviada: DataDetalleActualizado = {};
    const update = jest.fn((args: { data: DataDetalleActualizado }) => {
      dataEnviada = args.data;
      return Promise.resolve({ id: 10 });
    });
    const tx = {
      planillaDetalle: {
        update,
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: {}, _count: 1 } as unknown),
      },
      planilla: { update: jest.fn().mockResolvedValue({}) },
    };

    const prisma = {
      planillaDetalle: {
        findFirst: jest.fn().mockResolvedValue(detalle),
      },
      $transaction: jest.fn(
        (cb: (t: typeof tx) => Promise<unknown>) => cb(tx) as unknown,
      ),
    };
    const consulta = {
      findOneSimple: jest.fn().mockResolvedValue({ id: 1, estado: 'REVISADA' }),
    };
    const auditoria = { registrar: jest.fn() };
    const service = new PlanillaDetalleService(
      prisma as never,
      consulta as never,
      auditoria as never,
    );
    return { service, obtenerData: () => dataEnviada };
  }

  // Fila de julio: sueldo 2700 mes completo + descanso trabajado 180
  // (afectos = 2880) + gratificación 2700 + bonificación 30334 de 243
  // (no afectos = 2943) → total de ingresos = 5823.
  const filaJulio: DetalleFila = {
    sueldo_base: 2700,
    dias_trabajados: 30,
    gratificacion_monto: 2700,
    bonif_extraordinaria: 243,
    descanso_trabajado_monto: 180,
    adelanto_quincena: 0,
  };

  it('editar un adelanto no altera el total de ingresos de la fila', async () => {
    const { service, obtenerData } = build(filaJulio);
    await service.updateDetalle(1, 10, 5, { adelanto_quincena: 500 } as never);
    expect(obtenerData().total_ingresos).toBe(5823);
  });

  it('incluye la bonificación extraordinaria en los ingresos no afectos', async () => {
    const { service, obtenerData } = build(filaJulio);
    await service.updateDetalle(1, 10, 5, {} as never);
    expect(obtenerData().total_ingresos_no_afectos).toBe(2943);
  });

  it('incluye el descanso trabajado en los ingresos afectos', async () => {
    const { service, obtenerData } = build(filaJulio);
    await service.updateDetalle(1, 10, 5, {} as never);
    expect(obtenerData().total_ingresos_afectos).toBe(2880);
  });

  it('el neto es consistente: ingresos − descuentos', async () => {
    const { service, obtenerData } = build(filaJulio);
    await service.updateDetalle(1, 10, 5, { adelanto_quincena: 500 } as never);
    const data = obtenerData();
    const ingresos = data.total_ingresos ?? 0;
    const descuentos = data.total_descuentos ?? 0;
    // ONP 13% sobre la afecta (2880) = 374.40 + adelanto 500 = 874.40.
    expect(descuentos).toBe(874.4);
    expect(data.neto_pagar).toBe(
      Math.round((ingresos - descuentos) * 100) / 100,
    );
  });

  it('fuera de julio/diciembre la bonificación de referencia NO suma al total', async () => {
    // Sin gratificación en el período, `bonif_extraordinaria` guarda un valor de
    // referencia (9% de la base) que NO se paga: el total no debe incluirlo.
    const { service, obtenerData } = build({
      ...filaJulio,
      gratificacion_monto: 0,
      bonif_extraordinaria: 243,
    });
    await service.updateDetalle(1, 10, 5, {} as never);
    expect(obtenerData().total_ingresos).toBe(2880);
  });
});
