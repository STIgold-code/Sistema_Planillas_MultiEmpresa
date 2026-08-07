/**
 * Amortización al APROBAR la planilla: cuota normal, última cuota parcial
 * (saldo 150 / cuota 100 → 100 y luego 50 con estado PAGADO), idempotencia del
 * cargo ante una re-aprobación y aislamiento por empresa.
 */
import { PrestamosAmortizacionService } from './prestamos-amortizacion.service';

interface FilaDetalle {
  empleado_id: number;
  prestamo: number;
  adelanto_quincena: number;
  adelanto_gratificacion: number;
}

interface FilaPrestamo {
  id: number;
  empleado_id: number;
  tipo: 'PRESTAMO' | 'ADELANTO_SUELDO' | 'ADELANTO_GRATIFICACION';
  cuota_mensual: number;
  saldo: number | null;
}

function build(opciones: {
  detalles: FilaDetalle[];
  prestamos: FilaPrestamo[];
  yaCargados?: number[];
}) {
  const tx = {
    planillaDetalle: {
      findMany: jest.fn().mockResolvedValue(opciones.detalles),
    },
    prestamoMovimiento: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          (opciones.yaCargados ?? []).map((id) => ({ prestamo_id: id })),
        ),
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    prestamo: {
      findMany: jest.fn().mockImplementation((args: unknown) => {
        const where = (args as { where: { id?: { notIn: number[] } } }).where;
        const excluidos = where.id?.notIn ?? [];
        return Promise.resolve(
          opciones.prestamos.filter((p) => !excluidos.includes(p.id)),
        );
      }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };
  const service = new PrestamosAmortizacionService();
  return { service, tx };
}

const PRESTAMO_BASE: FilaPrestamo = {
  id: 1,
  empleado_id: 100,
  tipo: 'PRESTAMO',
  cuota_mensual: 100,
  saldo: 500,
};

/** Primer argumento de la primera llamada, tipado (sin `any` de mock.calls). */
function primerArgumento<T>(mock: jest.Mock): T {
  return (mock.mock.calls as unknown as [T][])[0][0];
}

/** Primer argumento de TODAS las llamadas, tipado. */
function argumentosDeLlamadas<T>(mock: jest.Mock): T[] {
  return (mock.mock.calls as unknown as [T][]).map(([argumento]) => argumento);
}

describe('PrestamosAmortizacionService.amortizarPlanillaAprobada', () => {
  it('sin detalles con descuento no hace nada', async () => {
    const { service, tx } = build({ detalles: [], prestamos: [PRESTAMO_BASE] });

    const resumen = await service.amortizarPlanillaAprobada(tx as never, 50, 5);

    expect(resumen).toEqual({
      cargos: 0,
      montoAmortizado: 0,
      prestamosPagados: 0,
    });
    expect(tx.prestamoMovimiento.create).not.toHaveBeenCalled();
  });

  it('registra el cargo de la cuota y descuenta el saldo', async () => {
    const { service, tx } = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 100,
          adelanto_quincena: 0,
          adelanto_gratificacion: 0,
        },
      ],
      prestamos: [PRESTAMO_BASE],
    });

    const resumen = await service.amortizarPlanillaAprobada(tx as never, 50, 5);

    const movimiento = primerArgumento<{
      data: {
        prestamo_id: number;
        planilla_id: number;
        monto: number;
        tipo: string;
      };
    }>(tx.prestamoMovimiento.create);
    expect(movimiento.data).toEqual({
      prestamo_id: 1,
      planilla_id: 50,
      monto: 100,
      tipo: 'CARGO_PLANILLA',
      observaciones: 'Cargo por aprobación de la planilla #50',
    });

    const actualizacion = primerArgumento<{
      where: { id: number };
      data: { saldo?: number };
    }>(tx.prestamo.update);
    expect(actualizacion.where).toEqual({ id: 1 });
    expect(actualizacion.data.saldo).toBe(400);
    expect(resumen).toEqual({
      cargos: 1,
      montoAmortizado: 100,
      prestamosPagados: 0,
    });
  });

  it('la ÚLTIMA cuota parcial cancela el préstamo: saldo 150 cuota 100 → 100 y luego 50 PAGADO', async () => {
    const primera = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 100,
          adelanto_quincena: 0,
          adelanto_gratificacion: 0,
        },
      ],
      prestamos: [{ ...PRESTAMO_BASE, saldo: 150 }],
    });

    await primera.service.amortizarPlanillaAprobada(primera.tx as never, 50, 5);

    const datosPrimera = primerArgumento<{
      data: { saldo?: number; estado?: string };
    }>(primera.tx.prestamo.update);
    expect(datosPrimera.data.saldo).toBe(50);
    expect(datosPrimera.data.estado).toBeUndefined();

    // Mes siguiente: el saldo remanente (50) es menor a la cuota (100).
    const segunda = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 50,
          adelanto_quincena: 0,
          adelanto_gratificacion: 0,
        },
      ],
      prestamos: [{ ...PRESTAMO_BASE, saldo: 50 }],
    });

    const resumen = await segunda.service.amortizarPlanillaAprobada(
      segunda.tx as never,
      51,
      5,
    );

    const datosSegunda = primerArgumento<{
      data: { saldo?: number; estado?: string };
    }>(segunda.tx.prestamo.update);
    expect(datosSegunda.data.saldo).toBe(0);
    expect(datosSegunda.data.estado).toBe('PAGADO');
    expect(resumen.prestamosPagados).toBe(1);
  });

  it('es idempotente: re-aprobar la planilla NO vuelve a cargar el préstamo', async () => {
    const { service, tx } = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 100,
          adelanto_quincena: 0,
          adelanto_gratificacion: 0,
        },
      ],
      prestamos: [PRESTAMO_BASE],
      yaCargados: [1],
    });

    const resumen = await service.amortizarPlanillaAprobada(tx as never, 50, 5);

    expect(tx.prestamoMovimiento.create).not.toHaveBeenCalled();
    expect(tx.prestamo.update).not.toHaveBeenCalled();
    expect(resumen.cargos).toBe(0);
  });

  it('rutea cada tipo contra su propio préstamo sin mezclarlos', async () => {
    const { service, tx } = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 100,
          adelanto_quincena: 300,
          adelanto_gratificacion: 400,
        },
      ],
      prestamos: [
        PRESTAMO_BASE,
        {
          id: 2,
          empleado_id: 100,
          tipo: 'ADELANTO_SUELDO',
          cuota_mensual: 300,
          saldo: null,
        },
        {
          id: 3,
          empleado_id: 100,
          tipo: 'ADELANTO_GRATIFICACION',
          cuota_mensual: 400,
          saldo: 400,
        },
      ],
    });

    const resumen = await service.amortizarPlanillaAprobada(tx as never, 50, 5);

    const cargos = argumentosDeLlamadas<{
      data: { prestamo_id: number; monto: number };
    }>(tx.prestamoMovimiento.create).map((llamada) => llamada.data);
    expect(cargos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ prestamo_id: 1, monto: 100 }),
        expect.objectContaining({ prestamo_id: 2, monto: 300 }),
        expect.objectContaining({ prestamo_id: 3, monto: 400 }),
      ]),
    );
    expect(resumen.cargos).toBe(3);
    expect(resumen.montoAmortizado).toBe(800);
  });

  it('no imputa a un empleado el descuento de otro', async () => {
    const { service, tx } = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 100,
          adelanto_quincena: 0,
          adelanto_gratificacion: 0,
        },
      ],
      prestamos: [
        PRESTAMO_BASE,
        { ...PRESTAMO_BASE, id: 9, empleado_id: 200, saldo: 900 },
      ],
    });

    await service.amortizarPlanillaAprobada(tx as never, 50, 5);

    const actualizados = argumentosDeLlamadas<{ where: { id: number } }>(
      tx.prestamo.update,
    ).map((llamada) => llamada.where.id);
    expect(actualizados).toEqual([1]);
  });

  it('acota la lectura de préstamos y detalles a la empresa de la planilla', async () => {
    const { service, tx } = build({
      detalles: [
        {
          empleado_id: 100,
          prestamo: 100,
          adelanto_quincena: 0,
          adelanto_gratificacion: 0,
        },
      ],
      prestamos: [PRESTAMO_BASE],
    });

    await service.amortizarPlanillaAprobada(tx as never, 50, 5);

    const dondeDetalle = primerArgumento<{
      where: { planilla: { empresa_id: number }; planilla_id: number };
    }>(tx.planillaDetalle.findMany).where;
    expect(dondeDetalle.planilla_id).toBe(50);
    expect(dondeDetalle.planilla.empresa_id).toBe(5);

    const dondePrestamo = primerArgumento<{
      where: { empresa_id: number; estado: string };
    }>(tx.prestamo.findMany).where;
    expect(dondePrestamo.empresa_id).toBe(5);
    expect(dondePrestamo.estado).toBe('ACTIVO');
  });
});
