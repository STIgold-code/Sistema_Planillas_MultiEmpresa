/**
 * Amortización al APROBAR la planilla: cuota normal, última cuota parcial
 * (saldo 150 / cuota 100 → 100 y luego 50 con estado PAGADO), idempotencia del
 * cargo ante una re-aprobación y aislamiento por empresa.
 */
import { PrestamosAmortizacionService } from './prestamos-amortizacion.service';
import {
  calcularVentanaPeriodo,
  fechaCalendarioLocal,
} from '../tareo/ventana-periodo';

/** Primer argumento de una llamada al mock, ya tipado. */
function argumento<T>(mock: jest.Mock, llamada = 0): T {
  const argumentos = mock.mock.calls[llamada] as unknown[];
  return argumentos[0] as T;
}

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
  /** Solo para los casos que ejercitan la ventana del período. */
  fecha_otorgado?: Date;
}

/** Ventana del período que devuelve el mock de `planilla.findFirst`. */
interface VentanaMock {
  anio: number;
  mes: number;
  fecha_fin: Date | null;
}

const VENTANA_ABIERTA: VentanaMock = {
  anio: 2026,
  mes: 12,
  fecha_fin: new Date(Date.UTC(2026, 11, 31)),
};

function build(opciones: {
  detalles: FilaDetalle[];
  prestamos: FilaPrestamo[];
  yaCargados?: number[];
  ventana?: VentanaMock;
}) {
  const ventana = opciones.ventana ?? VENTANA_ABIERTA;
  const tx = {
    planilla: {
      findFirst: jest.fn().mockResolvedValue({
        anio: ventana.anio,
        mes: ventana.mes,
        periodo_tareo: ventana.fecha_fin
          ? { fecha_fin: ventana.fecha_fin }
          : null,
      }),
    },
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
        const where = (
          args as {
            where: {
              id?: { notIn: number[] };
              fecha_otorgado?: { lte: Date };
            };
          }
        ).where;
        const excluidos = where.id?.notIn ?? [];
        const tope = where.fecha_otorgado?.lte;
        return Promise.resolve(
          opciones.prestamos.filter(
            (p) =>
              !excluidos.includes(p.id) &&
              (!tope || !p.fecha_otorgado || p.fecha_otorgado <= tope),
          ),
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

/** Cargo ya registrado contra un préstamo, tal como lo devuelve la reversión. */
interface FilaCargo {
  id: number;
  monto: number;
  prestamo: { id: number; saldo: number | null; estado: string };
}

function buildReversion(cargos: FilaCargo[]) {
  const tx = {
    prestamoMovimiento: {
      findMany: jest.fn().mockResolvedValue(cargos),
      deleteMany: jest.fn().mockResolvedValue({ count: cargos.length }),
    },
    prestamo: {
      update: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };
  const service = new PrestamosAmortizacionService();
  return { service, tx };
}

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

describe('PrestamosAmortizacionService.revertirPlanillaAnulada', () => {
  it('sin cargos previos no hace nada', async () => {
    const { service, tx } = buildReversion([]);

    const resumen = await service.revertirPlanillaAnulada(tx as never, 50, 5);

    expect(resumen.cargos).toBe(0);
    expect(tx.prestamo.update).not.toHaveBeenCalled();
    expect(tx.prestamoMovimiento.deleteMany).not.toHaveBeenCalled();
  });

  it('devuelve el saldo descontado y borra el cargo', async () => {
    const { service, tx } = buildReversion([
      { id: 11, monto: 100, prestamo: { id: 1, saldo: 400, estado: 'ACTIVO' } },
    ]);

    const resumen = await service.revertirPlanillaAnulada(tx as never, 50, 5);

    const actualizacion = primerArgumento<{
      where: { id: number };
      data: { saldo?: number; estado?: string };
    }>(tx.prestamo.update);
    expect(actualizacion.where).toEqual({ id: 1 });
    expect(actualizacion.data.saldo).toBe(500);
    expect(actualizacion.data.estado).toBeUndefined();

    expect(tx.prestamoMovimiento.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [11] } },
    });
    expect(resumen).toEqual({
      cargos: 1,
      montoAmortizado: 100,
      prestamosPagados: 0,
    });
  });

  it('reactiva un préstamo que la planilla anulada había dejado en PAGADO', async () => {
    const { service, tx } = buildReversion([
      { id: 11, monto: 50, prestamo: { id: 1, saldo: 0, estado: 'PAGADO' } },
    ]);

    const resumen = await service.revertirPlanillaAnulada(tx as never, 50, 5);

    const actualizacion = primerArgumento<{
      data: { saldo?: number; estado?: string };
    }>(tx.prestamo.update);
    expect(actualizacion.data.saldo).toBe(50);
    expect(actualizacion.data.estado).toBe('ACTIVO');
    expect(resumen.prestamosPagados).toBe(1);
  });

  it('un préstamo recurrente (saldo NULL) no recibe saldo al revertir', async () => {
    const { service, tx } = buildReversion([
      {
        id: 11,
        monto: 300,
        prestamo: { id: 2, saldo: null, estado: 'ACTIVO' },
      },
    ]);

    await service.revertirPlanillaAnulada(tx as never, 50, 5);

    const actualizacion = primerArgumento<{
      data: { saldo?: number; estado?: string };
    }>(tx.prestamo.update);
    expect(actualizacion.data.saldo).toBeUndefined();
  });

  it('solo revierte cargos de préstamos de la empresa de la planilla', async () => {
    const { service, tx } = buildReversion([
      { id: 11, monto: 100, prestamo: { id: 1, saldo: 400, estado: 'ACTIVO' } },
    ]);

    await service.revertirPlanillaAnulada(tx as never, 50, 5);

    const donde = primerArgumento<{
      where: {
        planilla_id: number;
        tipo: string;
        prestamo: { empresa_id: number };
      };
    }>(tx.prestamoMovimiento.findMany).where;
    expect(donde.planilla_id).toBe(50);
    expect(donde.tipo).toBe('CARGO_PLANILLA');
    expect(donde.prestamo.empresa_id).toBe(5);
  });

  it('tras revertir, el préstamo puede volver a cargarse en la misma planilla', async () => {
    // El borrado (en vez de un contra-movimiento) libera el unique
    // (prestamo_id, planilla_id, tipo) para una futura re-aprobación.
    const { service, tx } = buildReversion([
      { id: 11, monto: 100, prestamo: { id: 1, saldo: 400, estado: 'ACTIVO' } },
    ]);

    await service.revertirPlanillaAnulada(tx as never, 50, 5);

    expect(tx.prestamoMovimiento.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [11] } },
    });
  });
});

/**
 * El cálculo de la planilla solo considera los préstamos otorgados hasta el fin
 * de la ventana del período. La amortización tiene que usar EXACTAMENTE el mismo
 * corte: si no, un préstamo registrado entre el cálculo y la aprobación —con
 * fecha retroactiva, que el alta permite— se cuela en el reparto y, por ir
 * primero en el orden por antigüedad, se lleva un cargo que era de otra deuda.
 */
describe('PrestamosAmortizacionService — la ventana del período manda', () => {
  const VENTANA_JULIO = {
    anio: 2026,
    mes: 7,
    fecha_fin: new Date(Date.UTC(2026, 6, 25)),
  };

  const A_CALCULADO: FilaPrestamo = {
    id: 1,
    empleado_id: 100,
    tipo: 'PRESTAMO',
    cuota_mensual: 100,
    saldo: 1000,
    fecha_otorgado: new Date(Date.UTC(2026, 6, 1)),
  };
  const B_POSTERIOR: FilaPrestamo = {
    id: 2,
    empleado_id: 100,
    tipo: 'PRESTAMO',
    cuota_mensual: 100,
    saldo: 500,
    // Otorgado el 28 de julio: FUERA de la ventana 26-jun → 25-jul, aunque su
    // fecha lo ponga primero en el orden de amortización.
    fecha_otorgado: new Date(Date.UTC(2026, 6, 28)),
  };

  const DETALLE = [
    {
      empleado_id: 100,
      prestamo: 100,
      adelanto_quincena: 0,
      adelanto_gratificacion: 0,
    },
  ];

  it('no imputa el cargo a un préstamo otorgado después del fin del período', async () => {
    const { service, tx } = build({
      detalles: DETALLE,
      prestamos: [B_POSTERIOR, A_CALCULADO],
      ventana: VENTANA_JULIO,
    });

    await service.amortizarPlanillaAprobada(tx as never, 50, 1);

    const movimiento = argumento<{
      data: { prestamo_id: number; monto: number };
    }>(tx.prestamoMovimiento.create);
    expect(movimiento.data.prestamo_id).toBe(A_CALCULADO.id);
    expect(tx.prestamoMovimiento.create).toHaveBeenCalledTimes(1);
  });

  it('pide los préstamos acotados por la fecha de fin de la ventana', async () => {
    const { service, tx } = build({
      detalles: DETALLE,
      prestamos: [A_CALCULADO],
      ventana: VENTANA_JULIO,
    });

    await service.amortizarPlanillaAprobada(tx as never, 50, 1);

    const consulta = argumento<{ where: { fecha_otorgado?: { lte: Date } } }>(
      tx.prestamo.findMany,
    );
    expect(consulta.where.fecha_otorgado?.lte).toEqual(
      fechaCalendarioLocal(VENTANA_JULIO.fecha_fin),
    );
  });

  it('sin período de tareo cae al mes calendario, igual que el cálculo', async () => {
    const { service, tx } = build({
      detalles: DETALLE,
      prestamos: [A_CALCULADO],
      ventana: { anio: 2026, mes: 7, fecha_fin: null },
    });

    await service.amortizarPlanillaAprobada(tx as never, 50, 1);

    const consulta = argumento<{ where: { fecha_otorgado?: { lte: Date } } }>(
      tx.prestamo.findMany,
    );
    expect(consulta.where.fecha_otorgado?.lte).toEqual(
      calcularVentanaPeriodo(2026, 7, null).fechaFin,
    );
  });
});
