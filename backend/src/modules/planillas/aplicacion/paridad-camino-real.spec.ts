/**
 * COMPUERTA DE PARIDAD DEL CAMINO REAL (PR6 slice 2).
 *
 * A diferencia de `dominio/motor/paridad-general.spec.ts` (que mapea el fixture a
 * mano dentro del test), esta compuerta ejerce el CAMINO REAL completo de
 * producción: el mapper de aplicación `mapearEntradaCalculo` (Prisma → dominio)
 * encadenado con la factory de régimen y el orquestador `calcular-boleta`. Si el
 * mapper introdujera un bug de traducción (horas, tasas, nocturno, régimen), esta
 * compuerta lo detecta comparando, concepto a concepto, contra el motor legacy
 * `calcularEmpleado` con las MISMAS entradas que los golden de PR1.
 *
 * Alcance de la equivalencia: los MONTOS load-bearing que el camino régimen-
 * parametrizado de GENERAL realmente compone (haber, HE, nocturna, gratificación,
 * bonificación 30334, CTS, EsSalud, pensión AFP/ONP y renta 5ta). El legacy emite
 * ~130 campos de DTO (estructura, días, decenas de bonos en 0, aportes empleador
 * vida ley/SCTR, computables); reproducir esos campos auxiliares NO es objetivo de
 * la paridad de montos y se gestiona en el mapeo inverso del servicio. Cualquier
 * diferencia legítima se documenta explícitamente abajo.
 *
 * Diferencias intencionales documentadas:
 *  - Asignación familiar: el legacy la fija en 0 ("no viene del tareo"). El mapper
 *    pasa `tieneHijos: false`, de modo que el camino real tampoco la paga. Paridad
 *    preservada a propósito (brecha legal heredada, a habilitar en cambio aparte).
 */
import { calcularBoleta } from '../dominio/motor/calcular-boleta';
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { calcularEmpleado } from '../calculos/calcular-empleado';
import { ESCENARIOS_GENERAL } from '../calculos/__fixtures__/empleados-general.fixture';
import {
  mapearEntradaCalculo,
  EmpleadoParaMapeo,
} from './mapear-entrada-calculo';
import { CLAVE_GRATIFICACION } from '../dominio/conceptos/gratificacion';
import { CLAVE_BONIF_EXTRAORDINARIA } from '../dominio/conceptos/bonificacion-extraordinaria';
import { CLAVE_CTS } from '../dominio/conceptos/cts';
import { CLAVE_ESSALUD } from '../dominio/conceptos/salud-empleador';
import { CLAVE_HE_25, CLAVE_HE_35 } from '../dominio/conceptos/horas-extras';
import { CLAVE_BONIF_NOCTURNA } from '../dominio/conceptos/jornada-nocturna';
import {
  CLAVE_ONP,
  CLAVE_AFP_APORTE,
  CLAVE_AFP_PRIMA,
  CLAVE_AFP_COMISION,
} from '../dominio/conceptos/sistema-pensionario';
import { CLAVE_RENTA_5TA } from '../dominio/conceptos/renta-quinta';

const params = new ParametrosLegalesEnMemoria();

const monto = (
  conceptos: { clave: string; monto: number }[],
  clave: string,
): number =>
  conceptos.filter((c) => c.clave === clave).reduce((a, c) => a + c.monto, 0);

describe('COMPUERTA DE PARIDAD — CAMINO REAL (mapper + motor) vs legacy', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'paridad de montos por el camino de producción: %s',
    (_nombre, escenario) => {
      // --- Camino legacy (oráculo de paridad) ---
      const legacy = calcularEmpleado(
        escenario.empleado,
        escenario.mes,
        escenario.anio,
        escenario.acumuladoRemuneracion,
        escenario.acumuladoRetenciones,
      );

      // --- Camino REAL nuevo: mapper de aplicación + factory + orquestador ---
      const entrada = mapearEntradaCalculo({
        empleado: escenario.empleado as unknown as EmpleadoParaMapeo,
        empresa: { regimen_laboral_default: 'GENERAL' },
        mes: escenario.mes,
        anio: escenario.anio,
        acumuladoRenta: escenario.acumuladoRemuneracion,
        retencionesPreviasRenta: escenario.acumuladoRetenciones,
      });
      const calculadora = crearCalculadoraRegimen(entrada.regimenLaboral);
      const boleta = calcularBoleta(entrada, calculadora, params);
      const c = boleta.conceptos;

      // --- Conceptos compartidos afectos ---
      expect(monto(c, 'haber_mensual')).toBe(legacy.haber_mensual);
      expect(monto(c, CLAVE_HE_25)).toBe(legacy.horas_extras_25);
      expect(monto(c, CLAVE_HE_35)).toBe(legacy.horas_extras_35);
      expect(monto(c, CLAVE_BONIF_NOCTURNA)).toBe(legacy.bonificacion_nocturna);

      // --- Pensión (AFP/ONP) ---
      expect(monto(c, CLAVE_ONP)).toBe(legacy.onp);
      expect(monto(c, CLAVE_AFP_APORTE)).toBe(legacy.afp_aporte);
      expect(monto(c, CLAVE_AFP_PRIMA)).toBe(legacy.afp_prima);
      expect(monto(c, CLAVE_AFP_COMISION)).toBe(legacy.afp_comision);

      // --- Renta 5ta ---
      expect(monto(c, CLAVE_RENTA_5TA)).toBe(legacy.renta_5ta);

      // --- Régimen-variables ---
      expect(monto(c, CLAVE_GRATIFICACION)).toBe(legacy.gratificacion_monto);
      expect(monto(c, CLAVE_BONIF_EXTRAORDINARIA)).toBe(
        legacy.gratificacion_monto > 0 ? legacy.bonif_extraordinaria : 0,
      );
      expect(monto(c, CLAVE_CTS)).toBe(legacy.cts_monto);
      expect(monto(c, CLAVE_ESSALUD)).toBe(legacy.essalud_empleador);

      // --- Asignación familiar: 0 en ambos (brecha legacy heredada) ---
      expect(monto(c, 'asignacion_familiar')).toBe(legacy.asignacion_familiar);
    },
  );
});
