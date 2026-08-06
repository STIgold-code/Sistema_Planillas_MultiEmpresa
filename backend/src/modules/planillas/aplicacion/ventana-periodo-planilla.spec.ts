/**
 * Días de ingreso/cese a mitad de período cuando la empresa tiene DÍA DE CORTE.
 *
 * Semántica que se prueba:
 *  - `diasNuevoNoLab` = días de la VENTANA anteriores al ingreso.
 *  - `diasCesadoNoLab` = días de la VENTANA posteriores al cese.
 *
 * Con período calendario el resultado debe ser IDÉNTICO al histórico
 * (`día del mes - 1` y `días del mes - día del cese`), porque el ordinal del día
 * coincide con el día del mes. Ese es el test de regresión.
 */
import {
  calcularVentanaPeriodo,
  VentanaPeriodo,
} from '../../tareo/ventana-periodo';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './mapear-entrada-detalle';

/** Fecha al estilo Prisma `@db.Date`: medianoche UTC. */
const fechaBd = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

interface OpcionesEmpleado {
  fechaInicioContrato?: Date;
  fechaFinContrato?: Date | null;
  fechaIngreso?: Date | null;
  fechaCese?: Date | null;
  sinContrato?: boolean;
}

function crearEmpleado(opciones: OpcionesEmpleado = {}): EmpleadoParaDetalle {
  return {
    sueldo_base: 3000,
    fecha_ingreso: opciones.fechaIngreso ?? null,
    fecha_cese: opciones.fechaCese ?? null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: null,
    contratos: opciones.sinContrato
      ? []
      : [
          {
            fecha_inicio: opciones.fechaInicioContrato ?? fechaBd(2020, 1, 1),
            fecha_fin: opciones.fechaFinContrato ?? null,
          },
        ],
    tareos: [{ detalles: [] }],
  };
}

function mapear(
  empleado: EmpleadoParaDetalle,
  mes: number,
  anio: number,
  ventanaPeriodo?: VentanaPeriodo,
) {
  return mapearEntradaDetalle({
    empleado,
    mes,
    anio,
    ventanaPeriodo,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
  });
}

describe('ventana con día de corte 25 — julio 2026 = 26-jun a 25-jul (N=30)', () => {
  // 26-jun, 27, 28, 29, 30-jun = ordinales 1..5; 1-jul = ordinal 6; 25-jul = 30.
  const ventana = calcularVentanaPeriodo(2026, 7, 25);

  it('ingreso el 01-jul deja 5 días de la ventana sin devengar (26..30 de junio)', () => {
    const entrada = mapear(
      crearEmpleado({ fechaInicioContrato: fechaBd(2026, 7, 1) }),
      7,
      2026,
      ventana,
    );
    expect(entrada.diasNuevoNoLab).toBe(5);
  });

  it('ingreso el primer día de la ventana (26-jun) no deja días sin devengar', () => {
    const entrada = mapear(
      crearEmpleado({ fechaInicioContrato: fechaBd(2026, 6, 26) }),
      7,
      2026,
      ventana,
    );
    expect(entrada.diasNuevoNoLab).toBe(0);
  });

  it('ingreso el último día de la ventana (25-jul) deja 29 días sin devengar', () => {
    const entrada = mapear(
      crearEmpleado({ fechaInicioContrato: fechaBd(2026, 7, 25) }),
      7,
      2026,
      ventana,
    );
    expect(entrada.diasNuevoNoLab).toBe(29);
  });

  it('cese el 30-jun deja 25 días de la ventana posteriores al cese', () => {
    const entrada = mapear(
      crearEmpleado({
        fechaInicioContrato: fechaBd(2020, 1, 1),
        fechaFinContrato: fechaBd(2026, 6, 30),
      }),
      7,
      2026,
      ventana,
    );
    expect(entrada.diasCesadoNoLab).toBe(25);
    expect(entrada.empleadoCesa).toBe(true);
  });

  it('cese el último día de la ventana (25-jul) NO genera días cesados', () => {
    const entrada = mapear(
      crearEmpleado({
        fechaInicioContrato: fechaBd(2020, 1, 1),
        fechaFinContrato: fechaBd(2026, 7, 25),
      }),
      7,
      2026,
      ventana,
    );
    expect(entrada.diasCesadoNoLab).toBe(0);
  });

  it('un cese ANTERIOR a la ventana (25-jun) no cuenta como cese del período', () => {
    const entrada = mapear(
      crearEmpleado({
        fechaInicioContrato: fechaBd(2020, 1, 1),
        fechaFinContrato: fechaBd(2026, 6, 25),
      }),
      7,
      2026,
      ventana,
    );
    expect(entrada.diasCesadoNoLab).toBe(0);
    expect(entrada.empleadoCesa).toBe(false);
  });

  it('sin contrato usa fecha_ingreso / fecha_cese del empleado contra la ventana', () => {
    const nuevo = mapear(
      crearEmpleado({ sinContrato: true, fechaIngreso: fechaBd(2026, 7, 1) }),
      7,
      2026,
      ventana,
    );
    expect(nuevo.diasNuevoNoLab).toBe(5);

    const cesado = mapear(
      crearEmpleado({ sinContrato: true, fechaCese: fechaBd(2026, 6, 30) }),
      7,
      2026,
      ventana,
    );
    expect(cesado.diasCesadoNoLab).toBe(25);
  });

  it('la fecha de referencia de parámetros legales es el fin de la ventana', () => {
    const entrada = mapear(crearEmpleado(), 7, 2026, ventana);
    expect(entrada.fechaReferenciaParametros.getFullYear()).toBe(2026);
    expect(entrada.fechaReferenciaParametros.getMonth()).toBe(6); // julio
    expect(entrada.fechaReferenciaParametros.getDate()).toBe(25);
  });
});

describe('regresión: período calendario se comporta EXACTAMENTE igual que antes', () => {
  const calendario = calcularVentanaPeriodo(2026, 7, null); // 01-jul a 31-jul

  it('ingreso a mitad de mes = día del mes - 1', () => {
    const conVentana = mapear(
      crearEmpleado({ fechaInicioContrato: fechaBd(2026, 7, 10) }),
      7,
      2026,
      calendario,
    );
    const sinVentana = mapear(
      crearEmpleado({ fechaInicioContrato: fechaBd(2026, 7, 10) }),
      7,
      2026,
    );
    expect(conVentana.diasNuevoNoLab).toBe(9);
    expect(sinVentana.diasNuevoNoLab).toBe(9);
  });

  it('ingreso el día 1 del mes no deja días sin devengar', () => {
    expect(
      mapear(
        crearEmpleado({ fechaInicioContrato: fechaBd(2026, 7, 1) }),
        7,
        2026,
      ).diasNuevoNoLab,
    ).toBe(0);
  });

  it('cese a mitad de mes = días del mes - día del cese', () => {
    const conVentana = mapear(
      crearEmpleado({ fechaFinContrato: fechaBd(2026, 7, 20) }),
      7,
      2026,
      calendario,
    );
    const sinVentana = mapear(
      crearEmpleado({ fechaFinContrato: fechaBd(2026, 7, 20) }),
      7,
      2026,
    );
    expect(conVentana.diasCesadoNoLab).toBe(11); // 31 - 20
    expect(sinVentana.diasCesadoNoLab).toBe(11);
  });

  it('cese el último día del mes NO genera días cesados', () => {
    expect(
      mapear(crearEmpleado({ fechaFinContrato: fechaBd(2026, 7, 31) }), 7, 2026)
        .diasCesadoNoLab,
    ).toBe(0);
  });

  it('febrero no bisiesto: cese el día 10 deja 18 días cesados', () => {
    expect(
      mapear(crearEmpleado({ fechaFinContrato: fechaBd(2026, 2, 10) }), 2, 2026)
        .diasCesadoNoLab,
    ).toBe(18); // 28 - 10
  });

  it('la fecha de referencia de parámetros legales es el fin de mes', () => {
    const entrada = mapear(crearEmpleado(), 7, 2026);
    expect(entrada.fechaReferenciaParametros.getMonth()).toBe(6);
    expect(entrada.fechaReferenciaParametros.getDate()).toBe(31);
  });
});
