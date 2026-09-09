/**
 * La plantilla de cierre solo sirve si la ventana del período es la correcta y
 * si lo que trae prellenado es el estado real del sistema. Este spec fija esas
 * dos cosas, más la regla que causó el primer bug: el día de corte NO es un
 * parámetro de empresa, es una columna de `empresas`.
 */
import { PrismaService } from '../../prisma/prisma.service';
import { construirPlantillaCierre } from './plantilla-cierre-datos';
import { construirLibroPlantillaCierre } from './plantilla-cierre-excel';

const EMPRESA = { razon_social: 'GRUPO BM S.A.C.', ruc: '20000000001' };

const EMPLEADOS = [
  {
    id: 1,
    // DNI con cero inicial: si viaja como número, el desplegable y el VLOOKUP
    // del nombre dejan de encontrarlo.
    numero_documento: '06894124',
    apellido_paterno: 'GONZALES',
    apellido_materno: 'ESPINOZA',
    nombres: 'ARMANDO',
    estado: 'ACTIVO',
    fecha_ingreso: new Date(Date.UTC(2025, 11, 1)),
    fecha_cese: null,
    sueldo_base: 1130,
    asignacion_familiar: false,
    cargo: { nombre: 'OPERARIO' },
    regimen_pensionario: { tipo: 'AFP', nombre: 'AFP PRIMA' },
  },
  {
    id: 2,
    numero_documento: '41559571',
    apellido_paterno: 'MEDINA',
    apellido_materno: 'GOMERO',
    nombres: 'MIKER',
    estado: 'CESADO',
    fecha_ingreso: new Date(Date.UTC(2025, 11, 1)),
    fecha_cese: new Date(Date.UTC(2026, 5, 9)),
    sueldo_base: 2600,
    asignacion_familiar: true,
    cargo: null,
    regimen_pensionario: { tipo: 'ONP', nombre: 'ONP' },
  },
];

const DEUDAS = [
  {
    id: 10,
    empleado_id: 1,
    tipo: 'PRESTAMO',
    fecha_otorgado: new Date(Date.UTC(2026, 6, 24)),
    monto_total: 0,
    cuota_mensual: 200,
    saldo: 0,
    observaciones: '',
    empleado: EMPLEADOS[0],
    _count: { movimientos: 2 },
  },
  {
    id: 11,
    empleado_id: 2,
    tipo: 'ADELANTO_SUELDO',
    fecha_otorgado: new Date(Date.UTC(2026, 7, 25)),
    monto_total: 150,
    cuota_mensual: 150,
    saldo: 150,
    observaciones: 'Correo de cierre 08-2026',
    empleado: EMPLEADOS[1],
    _count: { movimientos: 0 },
  },
];

interface OpcionesPrisma {
  diaCorteEmpresa?: number | null;
  periodoTareo?: { fecha_inicio: Date; fecha_fin: Date; estado: string } | null;
  /** Último período existente, del que se deduce el corte si la empresa no lo tiene. */
  ultimoPeriodo?: { fecha_fin: Date } | null;
}

function armarPrisma(o: OpcionesPrisma = {}) {
  const periodoTareo = o.periodoTareo ?? null;
  const ultimo = o.ultimoPeriodo ?? null;
  return {
    empresa: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(EMPRESA),
      findUnique: jest
        .fn()
        .mockResolvedValue({ dia_corte_tareo: o.diaCorteEmpresa ?? null }),
    },
    periodoTareo: {
      findFirst: jest
        .fn()
        .mockImplementation(
          ({ select }: { select?: Record<string, boolean> }) =>
            Promise.resolve(select?.estado ? periodoTareo : ultimo),
        ),
    },
    empleado: { findMany: jest.fn().mockResolvedValue(EMPLEADOS) },
    periodoVacacional: {
      groupBy: jest
        .fn()
        .mockResolvedValue([{ empleado_id: 1, _sum: { dias_pendientes: 15 } }]),
    },
    prestamo: { findMany: jest.fn().mockResolvedValue(DEUDAS) },
  } as unknown as PrismaService;
}

describe('construirPlantillaCierre — ventana del período', () => {
  it('usa la ventana del período de tareo cuando ya existe', async () => {
    const datos = await construirPlantillaCierre(
      armarPrisma({
        periodoTareo: {
          fecha_inicio: new Date(Date.UTC(2026, 6, 26)),
          fecha_fin: new Date(Date.UTC(2026, 7, 25)),
          estado: 'BORRADOR',
        },
      }),
      10,
      2026,
      8,
    );

    expect(datos.periodo.fecha_inicio).toBe('2026-07-26');
    expect(datos.periodo.fecha_fin).toBe('2026-08-25');
    expect(datos.periodo.dias).toBe(31);
    expect(datos.periodo.periodo_tareo_existe).toBe(true);
  });

  it('lee el día de corte de la EMPRESA cuando el período todavía no existe', async () => {
    // Bug original: se buscaba en `parametros_empresa` y devolvía mes
    // calendario (01→31 de agosto) para una empresa con corte 25.
    const datos = await construirPlantillaCierre(
      armarPrisma({ diaCorteEmpresa: 25 }),
      10,
      2026,
      8,
    );

    expect(datos.periodo.fecha_inicio).toBe('2026-07-26');
    expect(datos.periodo.fecha_fin).toBe('2026-08-25');
    expect(datos.periodo.dia_corte).toBe(25);
    expect(datos.periodo.periodo_tareo_existe).toBe(false);
  });

  it('deduce el corte del último período cuando la empresa no lo tiene configurado', async () => {
    const datos = await construirPlantillaCierre(
      armarPrisma({
        ultimoPeriodo: { fecha_fin: new Date(Date.UTC(2026, 6, 25)) },
      }),
      10,
      2026,
      8,
    );

    expect(datos.periodo.dia_corte).toBe(25);
    expect(datos.periodo.fecha_inicio).toBe('2026-07-26');
  });

  it('cae al mes calendario si no hay corte ni períodos previos', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);

    expect(datos.periodo.dia_corte).toBeNull();
    expect(datos.periodo.fecha_inicio).toBe('2026-08-01');
    expect(datos.periodo.fecha_fin).toBe('2026-08-31');
  });

  it('un período que cierra a fin de mes NO se interpreta como día de corte', async () => {
    const datos = await construirPlantillaCierre(
      armarPrisma({
        ultimoPeriodo: { fecha_fin: new Date(Date.UTC(2026, 6, 31)) },
      }),
      10,
      2026,
      8,
    );
    expect(datos.periodo.dia_corte).toBeNull();
  });
});

describe('construirPlantillaCierre — estado prellenado', () => {
  it('incluye a los cesados: un reingreso no registrado solo se ve si aparece', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);
    const cesado = datos.trabajadores.find((t) => t.estado === 'CESADO');

    expect(cesado).toBeDefined();
    expect(cesado?.nombre).toContain('MEDINA');
  });

  it('trae el saldo vacacional y el documento con su cero inicial intacto', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);
    const gonzales = datos.trabajadores.find((t) => t.empleado_id === 1);

    expect(gonzales?.documento).toBe('06894124');
    expect(gonzales?.dias_vacaciones_disponibles).toBe(15);
  });

  it('separa préstamos de adelantos y expone el saldo que el sistema cree tener', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);

    expect(datos.prestamos).toHaveLength(1);
    expect(datos.prestamos[0]).toMatchObject({
      tipo: 'PRESTAMO',
      cuota_mensual: 200,
      // Un saldo en cero con cuota viva es justamente lo que hay que corregir.
      saldo_sistema: 0,
      cuotas_aplicadas: 2,
    });
    expect(datos.adelantos).toHaveLength(1);
    expect(datos.adelantos[0]).toMatchObject({
      tipo: 'ADELANTO_SUELDO',
      saldo_sistema: 150,
    });
  });
});

describe('construirLibroPlantillaCierre', () => {
  it('arma el libro con todas las hojas del flujo de cierre', async () => {
    const datos = await construirPlantillaCierre(
      armarPrisma({ diaCorteEmpresa: 25 }),
      10,
      2026,
      8,
    );
    const wb = construirLibroPlantillaCierre(datos);

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Instrucciones',
      'Periodo',
      'Trabajadores',
      'Prestamos',
      'Adelantos',
      'Vacaciones y descansos',
      'Otros conceptos',
      'Planilla informal',
      'Politica del periodo',
      'Control',
    ]);
  });

  it('el documento se escribe como TEXTO para no perder el cero inicial', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);
    const wb = construirLibroPlantillaCierre(datos);
    const ws = wb.getWorksheet('Trabajadores');

    const celda = ws?.getCell(5, 1);
    expect(celda?.value).toBe('06894124');
    expect(celda?.numFmt).toBe('@');
  });

  it('una columna editable va en ÁMBAR aunque venga prellenada', async () => {
    // El color dice "podés escribir acá", no "está vacía". El monto otorgado
    // viene con valor y aun así hay que poder corregirlo: si queda en blanco,
    // no está en la leyenda y nadie sabe si se toca.
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);
    const ws = construirLibroPlantillaCierre(datos).getWorksheet('Prestamos');

    const conValor = ws?.getCell(5, 4).fill as { fgColor?: { argb?: string } };
    // Fila 10: dentro de las libres que la plantilla deja para altas nuevas.
    const vacia = ws?.getCell(10, 4).fill as { fgColor?: { argb?: string } };

    expect(ws?.getCell(5, 4).value).not.toBeNull();
    expect(conValor?.fgColor?.argb).toBe('FFFFF2CC');
    expect(vacia?.fgColor?.argb).toBe('FFFFF2CC');
  });

  it('el documento se elige de una lista: no se teclea el nombre', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);
    const wb = construirLibroPlantillaCierre(datos);
    const ws = wb.getWorksheet('Prestamos');

    const validacion = ws?.getCell(5, 1).dataValidation;
    expect(validacion?.type).toBe('list');
    expect(validacion?.formulae?.[0]).toContain('Trabajadores!$A$');
  });

  it('el nombre se resuelve por fórmula desde el documento', async () => {
    const datos = await construirPlantillaCierre(armarPrisma(), 10, 2026, 8);
    const wb = construirLibroPlantillaCierre(datos);
    const celda = wb.getWorksheet('Prestamos')?.getCell(5, 2).value as {
      formula?: string;
    };

    expect(celda.formula).toContain('VLOOKUP');
    expect(celda.formula).toContain('Trabajadores');
  });

  it('avisa en la hoja del período cuando el tareo todavía no existe', async () => {
    const datos = await construirPlantillaCierre(
      armarPrisma({ diaCorteEmpresa: 25 }),
      10,
      2026,
      8,
    );
    const ws = construirLibroPlantillaCierre(datos).getWorksheet('Periodo');

    const textos: string[] = [];
    ws?.eachRow((row) =>
      row.eachCell((c) => {
        if (typeof c.value === 'string') textos.push(c.value);
      }),
    );
    expect(textos.join(' ')).toContain('NO EXISTE');
  });
});
