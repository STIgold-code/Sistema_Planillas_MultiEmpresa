/**
 * Integración préstamos ↔ cálculo de planilla.
 *
 * Los descuentos de préstamos/adelantos deben entrar por el CAMINO REAL del
 * cálculo (`calcularDetalleEmpleado`) ANTES del cierre de totales: el neto tiene
 * que bajar sin depender de una edición manual posterior, y el recálculo
 * completo ya no los pierde.
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { ESCENARIOS_GENERAL } from '../calculos/__fixtures__/empleados-general.fixture';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';
import { DescuentosPrestamosDetalle } from '../dominio/detalle/tipos-detalle';

const parametros = new ParametrosLegalesEnMemoria();
const escenario = ESCENARIOS_GENERAL[0];

function calcular(
  descuentosPrestamos?: DescuentosPrestamosDetalle,
  mes: number = escenario.mes,
) {
  return calcularDetalleEmpleado({
    empleado: escenario.empleado as unknown as EmpleadoParaMapeo &
      EmpleadoParaDetalle,
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes,
    anio: escenario.anio,
    acumuladoRenta: escenario.acumuladoRemuneracion,
    retencionesPreviasRenta: escenario.acumuladoRetenciones,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    parametros,
    descuentosPrestamos,
  }) as Record<string, number>;
}

describe('calcularDetalleEmpleado — descuentos de préstamos y adelantos', () => {
  it('sin préstamos activos los descuentos quedan en cero (comportamiento previo)', () => {
    const dto = calcular();

    expect(dto.prestamo).toBe(0);
    expect(dto.adelanto_quincena).toBe(0);
    expect(dto.adelanto_gratificacion).toBe(0);
  });

  it('vuelca cada tipo en su campo del detalle', () => {
    const dto = calcular({
      prestamo: 100,
      adelantoQuincena: 200,
      adelantoGratificacion: 50,
    });

    expect(dto.prestamo).toBe(100);
    expect(dto.adelanto_quincena).toBe(200);
    expect(dto.adelanto_gratificacion).toBe(50);
  });

  it('los montos entran ANTES de los totales: suben el total de descuentos y bajan el neto', () => {
    const base = calcular();
    const conPrestamo = calcular({
      prestamo: 100,
      adelantoQuincena: 200,
      adelantoGratificacion: 0,
    });

    expect(conPrestamo.total_descuentos).toBeCloseTo(
      base.total_descuentos + 300,
      2,
    );
    expect(conPrestamo.total_descuentos_otros).toBeCloseTo(
      base.total_descuentos_otros + 300,
      2,
    );
    expect(conPrestamo.neto_pagar).toBeCloseTo(base.neto_pagar - 300, 2);
    // Los ingresos NO se tocan: un préstamo es descuento, no remuneración.
    expect(conPrestamo.total_ingresos).toBe(base.total_ingresos);
  });

  it('no toca el campo agregado legacy `prestamos` (la boleta lo usa como fallback)', () => {
    const dto = calcular({
      prestamo: 100,
      adelantoQuincena: 0,
      adelantoGratificacion: 0,
    });

    expect(dto.prestamos).toBe(0);
    expect(dto.adelantos).toBe(0);
  });
});
