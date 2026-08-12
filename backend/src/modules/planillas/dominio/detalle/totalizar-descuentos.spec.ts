/**
 * Reglas de totalización de descuentos y neto.
 *
 * Cubre las columnas que el flujo real no siempre alcanza (permisos, tardanzas,
 * feriado, retención judicial, adelantos, el agregado legacy `prestamos`) y los
 * espejos que NO deben contarse dos veces.
 */
import { totalizarDescuentos } from './totalizar-descuentos';
import { calcularDetalleCompleto } from './calcular-detalle-completo';
import { DetalleCompleto } from './tipos-detalle';
import {
  ParametrosLegalesEnMemoria,
  ValorVigente,
} from '../../infraestructura/parametros-legales-en-memoria';
import { TramoIR } from '../tipos';

const uno = <T>(valor: T): ValorVigente<T>[] => [
  { valor, vigenciaDesde: new Date('2000-01-01') },
];

const TRAMOS: TramoIR[] = [
  { hasta: 5, tasa: 0.08 },
  { hasta: Infinity, tasa: 0.3 },
];

const parametros = new ParametrosLegalesEnMemoria({
  rmv: uno(1130),
  uit: uno(5500),
  asignacionFamiliar: uno(113),
  essaludTasa: uno(0.09),
  essaludMinimo: uno(101.7),
  sisMicroempresa: uno(15),
  tramosIR: uno(TRAMOS),
  sctrSalud: uno(0.015),
  sctrPension: uno(0.02),
  vidaLeyTasa: uno(0.0053),
  senatiTasa: uno(0.0075),
});

/**
 * Detalle en cero (sin tareo): base mínima y REAL sobre la que aplicar los
 * overrides de cada caso, sin inventar un literal de ~130 campos.
 */
function detalleEnCero(): DetalleCompleto {
  return calcularDetalleCompleto(
    {
      sueldoBase: 0,
      mes: 4,
      anio: 2026,
      dias: [],
      afiliacion: null,
      promedios: {
        promedioHorasExtras: 0,
        promedioComisiones: 0,
        promedioBonificaciones: 0,
        ultimaGratificacion: 0,
      },
      acumuladoRenta: 0,
      retencionesPreviasRenta: 0,
      fechaReferenciaParametros: new Date('2026-04-30'),
      diasNuevoNoLab: 0,
      diasCesadoNoLab: 0,
      empleadoCesa: false,
      tieneFechaIngreso: false,
      tieneAsignacionFamiliar: false,
      tieneSctr: false,
      empresaAportaSenati: false,
      trabajadorDomiciliado: true,
      mesesGratificacion: 6,
      mesesCts: 6,
      diasCts: 0,
    },
    parametros,
  );
}

const con = (overrides: Partial<DetalleCompleto>): DetalleCompleto =>
  totalizarDescuentos({ ...detalleEnCero(), ...overrides });

describe('totalizarDescuentos — descuentos de ley', () => {
  it('suma aporte, prima, comisión, ONP y renta de 5.ª', () => {
    const d = con({
      afp_aporte: 300,
      afp_prima: 52.2,
      afp_comision: 44.1,
      onp: 0,
      renta_5ta: 46.67,
    });
    // 300 + 52.20 + 44.10 + 0 + 46.67
    expect(d.total_descuentos_ley).toBe(442.97);
  });

  it('NO cuenta `afp_seguro`: es el espejo de `afp_prima`', () => {
    const d = con({ afp_aporte: 300, afp_prima: 52.2, afp_seguro: 52.2 });
    expect(d.total_descuentos_ley).toBe(352.2);
  });

  it('`quinta_categoria` se deriva de `renta_5ta` y no se suma aparte', () => {
    const d = con({ renta_5ta: 46.67, quinta_categoria: 999 });
    expect(d.quinta_categoria).toBe(46.67);
    expect(d.total_descuentos_ley).toBe(46.67);
  });
});

describe('totalizarDescuentos — otros descuentos', () => {
  it('suma recortes del tareo, adelantos y retenciones', () => {
    const d = con({
      descuento_faltas: 10,
      descuento_dominical: 20,
      descuento_permisos: 30,
      descuento_tardanzas: 40,
      descuento_feriado: 50,
      descuento_sobregiro: 60,
      descuento_reintegro: 70,
      retencion_judicial: 80,
      otros_descuentos: 90,
      adelantos: 100,
      adelanto_quincena: 110,
      adelanto_vacacional: 120,
      otros_adelantos: 130,
      adelanto_cts: 140,
      adelanto_gratificacion: 150,
      prestamo: 160,
    });
    expect(d.total_descuentos_otros).toBe(1360);
    expect(d.total_descuentos_ley).toBe(0);
  });

  it('`prestamos` (agregado legacy) solo cuenta cuando `prestamo` está en 0', () => {
    expect(con({ prestamo: 0, prestamos: 200 }).total_descuentos_otros).toBe(
      200,
    );
    expect(con({ prestamo: 160, prestamos: 200 }).total_descuentos_otros).toBe(
      160,
    );
  });
});

describe('totalizarDescuentos — total y neto', () => {
  it('total = ley + otros, y neto = ingresos − total', () => {
    const d = con({
      total_ingresos: 3000,
      onp: 390,
      renta_5ta: 20,
      adelanto_quincena: 500,
    });
    expect(d.total_descuentos_ley).toBe(410);
    expect(d.total_descuentos_otros).toBe(500);
    expect(d.total_descuentos).toBe(910);
    expect(d.neto_pagar).toBe(2090);
    expect(d.neto_mes).toBe(d.neto_pagar);
  });

  it('es idempotente: re-totalizar no altera los totales', () => {
    const primera = con({
      total_ingresos: 3000,
      onp: 390,
      renta_5ta: 20,
      prestamo: 160,
    });
    const segunda = totalizarDescuentos(primera);
    expect(segunda).toEqual(primera);
  });

  it('ignora los totales que traiga la entrada: siempre rederiva de las columnas', () => {
    const d = con({
      total_ingresos: 3000,
      onp: 390,
      total_descuentos_ley: 999,
      total_descuentos: 999,
      neto_pagar: 1,
    });
    expect(d.total_descuentos_ley).toBe(390);
    expect(d.total_descuentos).toBe(390);
    expect(d.neto_pagar).toBe(2610);
  });
});
