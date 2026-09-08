/**
 * Ida y vuelta completo de la plantilla de cierre: se GENERA el libro con el
 * mismo código que lo entrega al área contable, se LLENA como lo llenaría un
 * humano, y se IMPORTA. Así el test protege el contrato real —posiciones de
 * columnas, textos de los desplegables, formato de los documentos— y no una
 * versión idealizada de él.
 *
 * El caso central es el préstamo con saldo NULL: hoy su cuota sale todos los
 * meses sin fin, y la plantilla es lo que le pone un tope.
 */
import ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import { PlantillaCierreImportacionService } from './plantilla-cierre-importacion.service';
import { construirLibroPlantillaCierre } from './plantilla-cierre-excel';
import type {
  DeudaPlantilla,
  PlantillaCierre,
  TrabajadorPlantilla,
} from './plantilla-cierre-datos';

interface EmpleadoFalso {
  id: number;
  numero_documento: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  estado: string;
  fecha_cese: Date | null;
}

const GONZALES: EmpleadoFalso = {
  id: 1,
  numero_documento: '06894124',
  apellido_paterno: 'GONZALES',
  apellido_materno: 'ESPINOZA',
  nombres: 'ARMANDO',
  estado: 'ACTIVO',
  fecha_cese: null,
};

const MEDINA: EmpleadoFalso = {
  id: 2,
  numero_documento: '41559571',
  apellido_paterno: 'MEDINA',
  apellido_materno: 'GOMERO',
  nombres: 'MIKER',
  estado: 'CESADO',
  fecha_cese: new Date(Date.UTC(2026, 5, 9)),
};

const trabajador = (e: EmpleadoFalso): TrabajadorPlantilla => ({
  empleado_id: e.id,
  documento: e.numero_documento,
  nombre: `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
  cargo: 'OPERARIO',
  estado: e.estado,
  fecha_ingreso: '2025-12-01',
  fecha_cese: e.fecha_cese?.toISOString().slice(0, 10) ?? null,
  sueldo_base: 1500,
  regimen_pensionario: 'ONP',
  asignacion_familiar: false,
  dias_vacaciones_disponibles: 0,
});

/** Préstamo recurrente sin tope: el caso que hay que arreglar. */
const PRESTAMO_SIN_TOPE: DeudaPlantilla = {
  prestamo_id: 10,
  empleado_id: 1,
  documento: '06894124',
  nombre: 'GONZALES ESPINOZA, ARMANDO',
  tipo: 'PRESTAMO',
  fecha_otorgado: '2026-07-24',
  monto_total: 0,
  cuota_mensual: 200,
  saldo_sistema: null,
  cuotas_aplicadas: 2,
  observaciones: '',
};

const ADELANTO_VIGENTE: DeudaPlantilla = {
  prestamo_id: 11,
  empleado_id: 2,
  documento: '41559571',
  nombre: 'MEDINA GOMERO, MIKER',
  tipo: 'ADELANTO_SUELDO',
  fecha_otorgado: '2026-08-25',
  monto_total: 150,
  cuota_mensual: 150,
  saldo_sistema: 150,
  cuotas_aplicadas: 0,
  observaciones: 'Correo de cierre 08-2026',
};

const DATOS: PlantillaCierre = {
  empresa: { razon_social: 'GRUPO BM S.A.C.', ruc: '20000000001' },
  periodo: {
    anio: 2026,
    mes: 8,
    etiqueta: 'Agosto 2026',
    fecha_inicio: '2026-07-26',
    fecha_fin: '2026-08-25',
    dias: 31,
    dia_corte: 25,
    periodo_tareo_existe: true,
    estado_periodo_tareo: 'BORRADOR',
  },
  trabajadores: [trabajador(GONZALES), trabajador(MEDINA)],
  prestamos: [PRESTAMO_SIN_TOPE],
  adelantos: [ADELANTO_VIGENTE],
  generado: '2026-08-29T00:00:00.000Z',
};

/**
 * Genera el libro, lo llena como lo llenaría el contador y devuelve el buffer.
 *
 * El llenado base deja TODAS las filas prellenadas completas, porque así lo
 * exige la plantilla: una fila con documento y sin monto es un error, no una
 * fila vacía. Cada test sobrescribe solo lo suyo.
 */
async function llenar(
  aplicar: (wb: ExcelJS.Workbook) => void = () => undefined,
): Promise<Buffer> {
  const wb = construirLibroPlantillaCierre(DATOS);

  const prestamos = wb.getWorksheet('Prestamos');
  prestamos.getCell(5, 8).value = 400;
  prestamos.getCell(5, 9).value = 'Sí';

  const adelantos = wb.getWorksheet('Adelantos');
  adelantos.getCell(5, 8).value = 150;
  adelantos.getCell(5, 9).value = 'Se descuenta este mes';

  aplicar(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const PRESTAMOS_BD = [
  {
    id: 10,
    empleado_id: 1,
    tipo: 'PRESTAMO',
    cuota_mensual: 200,
    saldo: null,
    monto_total: null,
  },
  {
    id: 11,
    empleado_id: 2,
    tipo: 'ADELANTO_SUELDO',
    cuota_mensual: 150,
    saldo: 150,
    monto_total: 150,
  },
];

function armar() {
  const reactivarEmpleado = jest.fn().mockResolvedValue({});
  const actualizarPrestamo = jest.fn().mockResolvedValue({});
  const cancelarPrestamo = jest.fn().mockResolvedValue({});

  const prisma = {
    empleado: {
      findMany: jest.fn().mockResolvedValue([GONZALES, MEDINA]),
      update: reactivarEmpleado,
    },
    prestamo: { findMany: jest.fn().mockResolvedValue(PRESTAMOS_BD) },
  } as unknown as PrismaService;

  const prestamos = {
    update: actualizarPrestamo,
    cancelar: cancelarPrestamo,
  } as unknown as PrestamosService;

  return {
    reactivarEmpleado,
    actualizarPrestamo,
    cancelarPrestamo,
    servicio: new PlantillaCierreImportacionService(prisma, prestamos),
  };
}

describe('PlantillaCierreImportacionService — préstamo sin tope', () => {
  it('propone ponerle saldo y lo dice en castellano, no en jerga', async () => {
    // El llenado base confirma 400 de saldo real en el préstamo sin tope.
    const buffer = await llenar();

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    const cambio = preview.deudas.find((d) => d.prestamo_id === 10);

    expect(cambio?.accion).toBe('ACTUALIZAR');
    expect(cambio?.monto).toBe(400);
    expect(cambio?.detalle).toContain('SIN saldo');
    expect(cambio?.detalle).toContain('indefinidamente');
    expect(preview.aplicable).toBe(true);
  });

  it('al aplicar delega en PrestamosService: no escribe el saldo por su cuenta', async () => {
    const buffer = await llenar();

    const { servicio, actualizarPrestamo } = armar();
    const resultado = await servicio.aplicar(10, 2026, 8, buffer);

    expect(actualizarPrestamo).toHaveBeenCalledWith(
      10,
      10,
      expect.objectContaining({ saldo: 400 }),
    );
    expect(resultado.saldos_confirmados).toBe(1);
  });

  it('el saldo NULL viaja al Excel como aviso, nunca como cero', () => {
    const wb = construirLibroPlantillaCierre(DATOS);
    const celda = wb.getWorksheet('Prestamos').getCell(5, 6);

    expect(celda.value).toBe('SIN TOPE ⚠');
  });
});

/**
 * El monto original es el dato que el sistema no tiene (los préstamos reales
 * nacieron sin él) y el que la contadora sí sabe: es la plata que entregó. La
 * columna ahora es editable y la importación lo fija junto con el saldo.
 */
describe('PlantillaCierreImportacionService — monto total otorgado', () => {
  it('fija el monto original cuando la contadora lo escribe', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(5, 4).value = 800; // monto original otorgado
      ws.getCell(5, 8).value = 400; // saldo real pendiente
    });

    const { servicio, actualizarPrestamo } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    expect(preview.deudas[0].detalle).toContain('800.00');

    await servicio.aplicar(10, 2026, 8, buffer);
    expect(actualizarPrestamo).toHaveBeenCalledWith(
      10,
      10,
      expect.objectContaining({ monto_total: 800, saldo: 400 }),
    );
  });

  it('un saldo mayor al monto ESCRITO en la plantilla es un error', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(5, 4).value = 300;
      ws.getCell(5, 8).value = 400; // debe más de lo que se otorgó: imposible
    });

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);

    expect(preview.aplicable).toBe(false);
    expect(preview.errores[0].motivo).toContain('supera el monto total');
  });

  it('sin monto escrito no viaja nada: no se inventa un monto', async () => {
    const buffer = await llenar();

    const { servicio, actualizarPrestamo } = armar();
    await servicio.aplicar(10, 2026, 8, buffer);

    expect(actualizarPrestamo).toHaveBeenCalledWith(10, 10, {
      saldo: 400,
      observaciones: 'Confirmado en la plantilla de cierre 08-2026.',
    });
  });
});

describe('PlantillaCierreImportacionService — cerrar sin perder el monto', () => {
  it('una deuda que se salda igual registra el monto que se otorgó', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(5, 4).value = 3000; // la contadora sí escribió el monto
      ws.getCell(5, 8).value = 0;
      ws.getCell(5, 9).value = 'No - ya pagado';
    });

    const { servicio, actualizarPrestamo } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    expect(preview.deudas[0].accion).toBe('CERRAR');

    await servicio.aplicar(10, 2026, 8, buffer);
    expect(actualizarPrestamo).toHaveBeenCalledWith(
      10,
      10,
      expect.objectContaining({ saldo: 0, monto_total: 3000 }),
    );
  });
});

describe('PlantillaCierreImportacionService — la cuota pactada', () => {
  it('no se toca cuando el contador repite la misma: renegociar es otra cosa', async () => {
    const buffer = await llenar((wb) => {
      wb.getWorksheet('Prestamos').getCell(5, 5).value = 200; // la de siempre
    });

    const { servicio, actualizarPrestamo } = armar();
    await servicio.aplicar(10, 2026, 8, buffer);

    // El DTO exacto: solo saldo y motivo. Nada de cuota.
    expect(actualizarPrestamo).toHaveBeenCalledWith(10, 10, {
      saldo: 400,
      observaciones: 'Confirmado en la plantilla de cierre 08-2026.',
    });
  });

  it('viaja cuando de verdad cambia, y el preview lo dice', async () => {
    const buffer = await llenar((wb) => {
      wb.getWorksheet('Prestamos').getCell(5, 5).value = 250;
    });

    const { servicio, actualizarPrestamo } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    expect(preview.deudas[0].detalle).toContain('250.00');

    await servicio.aplicar(10, 2026, 8, buffer);
    expect(actualizarPrestamo).toHaveBeenCalledWith(
      10,
      10,
      expect.objectContaining({ cuota_mensual: 250 }),
    );
  });
});

describe('PlantillaCierreImportacionService — cierres', () => {
  it('"No - ya pagado" salda la deuda vía update, que la marca PAGADO', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(5, 8).value = 0;
      ws.getCell(5, 9).value = 'No - ya pagado';
    });

    const { servicio, actualizarPrestamo, cancelarPrestamo } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    expect(preview.deudas[0].accion).toBe('CERRAR');
    expect(preview.deudas[0].cierra_como).toBe('PAGADO');

    await servicio.aplicar(10, 2026, 8, buffer);
    expect(actualizarPrestamo).toHaveBeenCalledWith(
      10,
      10,
      expect.objectContaining({ saldo: 0 }),
    );
    expect(cancelarPrestamo).not.toHaveBeenCalled();
  });

  it('"No - cancelado" da de baja la deuda, que no es lo mismo que pagarla', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(5, 8).value = 0;
      ws.getCell(5, 9).value = 'No - cancelado';
    });

    const { servicio, actualizarPrestamo, cancelarPrestamo } = armar();
    await servicio.aplicar(10, 2026, 8, buffer);

    expect(cancelarPrestamo).toHaveBeenCalledWith(10, 10, expect.anything());
    expect(actualizarPrestamo).not.toHaveBeenCalled();
  });

  it('un adelanto "ya se descontó antes" se cierra, no se vuelve a cobrar', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Adelantos');
      ws.getCell(5, 8).value = 150;
      ws.getCell(5, 9).value = 'Ya se descontó antes';
    });

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    const adelanto = preview.deudas.find((d) => d.prestamo_id === 11);

    expect(adelanto?.accion).toBe('CERRAR');
    expect(adelanto?.cierra_como).toBe('PAGADO');
  });
});

describe('PlantillaCierreImportacionService — altas nuevas', () => {
  it('NO crea deudas: sin convenio firmado no se descuenta de la remuneración', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      // Fila agregada a mano por el contador: no existe en el sistema.
      ws.getCell(6, 1).value = '41559571';
      ws.getCell(6, 5).value = 80;
      ws.getCell(6, 8).value = 800;
      ws.getCell(6, 9).value = 'Sí';
    });

    const { servicio, actualizarPrestamo } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);
    const alta = preview.deudas.find((d) => d.fila === 6);

    expect(alta?.accion).toBe('ALTA_PENDIENTE');
    expect(alta?.detalle).toContain('convenio firmado');
    expect(
      preview.soloInformativo.find((b) =>
        b.concepto.startsWith('Préstamos y adelantos nuevos'),
      )?.filas,
    ).toBe(1);

    const resultado = await servicio.aplicar(10, 2026, 8, buffer);
    expect(resultado.altas_pendientes).toBe(1);
    // La única escritura es la confirmación del préstamo que ya existía.
    expect(actualizarPrestamo).toHaveBeenCalledTimes(1);
  });
});

describe('PlantillaCierreImportacionService — errores que bloquean', () => {
  it('una fila sin monto confirmado no se aplica en silencio', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(5, 8).value = null; // decisión sí, monto no
    });

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);

    expect(preview.aplicable).toBe(false);
    expect(preview.errores[0]).toMatchObject({ hoja: 'Prestamos', fila: 5 });
    await expect(servicio.aplicar(10, 2026, 8, buffer)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('un saldo mayor al monto pactado se avisa acá y no revienta al aplicar', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Adelantos');
      ws.getCell(5, 8).value = 900; // el adelanto pactado fue de 150
      ws.getCell(5, 9).value = 'Se descuenta este mes';
    });

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);

    expect(preview.aplicable).toBe(false);
    expect(preview.errores[0].motivo).toContain('supera el monto total');
  });

  it('un documento que no es de la empresa se reporta con su fila', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Prestamos');
      ws.getCell(6, 1).value = '99999999';
      ws.getCell(6, 5).value = 50;
      ws.getCell(6, 8).value = 500;
      ws.getCell(6, 9).value = 'Sí';
    });

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);

    expect(preview.aplicable).toBe(false);
    expect(preview.errores.some((e) => e.motivo.includes('99999999'))).toBe(
      true,
    );
  });
});

describe('PlantillaCierreImportacionService — reingresos', () => {
  it('reactiva al cesado que el contador marca como reingresado', async () => {
    const buffer = await llenar((wb) => {
      const ws = wb.getWorksheet('Trabajadores');
      // Fila 6 = MEDINA, que figura CESADO.
      ws.getCell(6, 11).value = 'Reingresó';
      ws.getCell(6, 12).value = 'Volvió el 01/08';
    });

    const { servicio, reactivarEmpleado } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);

    expect(preview.empleados).toHaveLength(1);
    expect(preview.empleados[0].detalle).toContain('CESADO');

    const resultado = await servicio.aplicar(10, 2026, 8, buffer);
    expect(reactivarEmpleado).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { estado: 'ACTIVO', fecha_cese: null },
    });
    expect(resultado.empleados_reactivados).toBe(1);
  });

  it('un "Sí" en un trabajador ya activo no genera ningún cambio', async () => {
    const buffer = await llenar((wb) => {
      wb.getWorksheet('Trabajadores').getCell(5, 11).value = 'Sí';
    });

    const { servicio } = armar();
    const preview = await servicio.preview(10, 2026, 8, buffer);

    expect(preview.empleados).toHaveLength(0);
  });
});
