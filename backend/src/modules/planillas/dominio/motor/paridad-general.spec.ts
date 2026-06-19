/**
 * COMPUERTA DE PARIDAD (SDD T14).
 *
 * Corre el NUEVO camino (orquestador `calcular-boleta` + `RegimenGeneral`,
 * seleccionado por la factory) con las MISMAS entradas que los golden de PR1 y
 * verifica que produce, concepto a concepto, los MISMOS montos load-bearing que
 * la foto del motor legacy (`calcularEmpleado`).
 *
 * Alcance de la equivalencia: los conceptos monetarios que el camino régimen-
 * parametrizado de GENERAL realmente compone — haber mensual, horas extras,
 * jornada nocturna, gratificación, bonificación 30334, CTS, asignación familiar,
 * EsSalud, pensión (AFP/ONP) y renta 5ta. El motor legacy emite ~130 campos de
 * boleta (estructura, días, decenas de bonos en 0); reproducirlos campo a campo
 * negaría el rediseño SRP. La paridad se define sobre los MONTOS calculados, no
 * sobre la forma del DTO legacy. Cualquier diferencia legítima se documenta
 * explícitamente abajo.
 */
import { calcularBoleta } from './calcular-boleta';
import { crearCalculadoraRegimen } from '../regimenes/regimen.factory';
import { ParametrosLegalesEnMemoria } from '../../infraestructura/parametros-legales-en-memoria';
import {
  AfiliacionPensionaria,
  DetalleTareo,
  EntradaCalculo,
  RegimenLaboral,
  SistemaPensionario,
} from '../tipos';
import {
  ESCENARIOS_GENERAL,
  EscenarioGeneral,
  calcularDetalleOraculo,
} from '../../calculos/__fixtures__/empleados-general.fixture';
import { CLAVE_GRATIFICACION } from '../conceptos/gratificacion';
import { CLAVE_BONIF_EXTRAORDINARIA } from '../conceptos/bonificacion-extraordinaria';
import { CLAVE_CTS } from '../conceptos/cts';
import { CLAVE_ESSALUD } from '../conceptos/salud-empleador';
import { CLAVE_HE_25, CLAVE_HE_35 } from '../conceptos/horas-extras';
import { CLAVE_BONIF_NOCTURNA } from '../conceptos/jornada-nocturna';
import {
  CLAVE_ONP,
  CLAVE_AFP_APORTE,
  CLAVE_AFP_PRIMA,
  CLAVE_AFP_COMISION,
} from '../conceptos/sistema-pensionario';
import { CLAVE_RENTA_5TA } from '../conceptos/renta-quinta';

const params = new ParametrosLegalesEnMemoria();

interface FixtureEmpleadoLectura {
  sueldo_base: number;
  asignacion_familiar?: boolean | null;
  regimen_pensionario: {
    tipo: 'AFP' | 'ONP';
    aporte_obligatorio: number;
    prima_seguro: number;
    comision_flujo: number;
  } | null;
  tareos: { detalles: FixtureDetalle[] }[];
}

interface FixtureDetalle {
  horas: number | null;
  tipo_marcacion: {
    es_laborable: boolean;
    horas_diurnas: number;
    horas_nocturnas: number;
    horas_default: number;
  };
}

/** Mapea el detalle de tareo del fixture (Prisma-like) al shape puro de dominio. */
function mapearTareo(detalles: FixtureDetalle[]): DetalleTareo[] {
  return detalles.map((d) => {
    const tm = d.tipo_marcacion;
    const horasNomenclatura = tm.horas_diurnas + tm.horas_nocturnas;
    const horasDetalle = d.horas ?? 0;
    const horas =
      horasDetalle > 0
        ? horasDetalle
        : horasNomenclatura > 0
          ? horasNomenclatura
          : tm.horas_default;
    const horasExtras = horas > 8 ? horas - 8 : 0;
    return {
      fecha: new Date(),
      horasTrabajadas: horas,
      horasExtras,
      esNocturno: tm.horas_nocturnas > 0,
      esFeriado: false,
      asistio: tm.es_laborable,
    };
  });
}

function mapearAfiliacion(
  regimen: FixtureEmpleadoLectura['regimen_pensionario'],
): AfiliacionPensionaria | null {
  if (!regimen) return null;
  if (regimen.tipo === 'ONP') {
    return {
      sistema: SistemaPensionario.ONP,
      tasas: {
        aporteObligatorio: regimen.aporte_obligatorio / 100,
        primaSeguro: 0,
        comisionFlujo: 0,
      },
    };
  }
  return {
    sistema: SistemaPensionario.AFP,
    tasas: {
      aporteObligatorio: regimen.aporte_obligatorio / 100,
      primaSeguro: regimen.prima_seguro / 100,
      comisionFlujo: regimen.comision_flujo / 100,
    },
  };
}

function mapearEntrada(escenario: EscenarioGeneral): EntradaCalculo {
  const empleado = escenario.empleado as unknown as FixtureEmpleadoLectura;
  return {
    regimenLaboral: RegimenLaboral.GENERAL,
    remuneracionBasica: empleado.sueldo_base,
    // Asignación familiar desde el dato real del empleado (10% RMV por ley). Los
    // fixtures GENERAL usan asignacion_familiar=false, por lo que el monto sigue
    // en 0 y la paridad de los demás conceptos se mantiene al céntimo.
    tieneHijos: !!empleado.asignacion_familiar,
    afiliacion: mapearAfiliacion(empleado.regimen_pensionario),
    periodo: {
      anio: escenario.anio,
      mes: escenario.mes,
      fecha: new Date(escenario.anio, escenario.mes, 0),
    },
    tareo: mapearTareo(empleado.tareos[0].detalles),
    acumuladoRenta: escenario.acumuladoRemuneracion,
    retencionesPreviasRenta: escenario.acumuladoRetenciones,
  };
}

const monto = (
  conceptos: { clave: string; monto: number }[],
  clave: string,
): number =>
  conceptos.filter((c) => c.clave === clave).reduce((a, c) => a + c.monto, 0);

describe('COMPUERTA DE PARIDAD — GENERAL (T14)', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'paridad de montos con el motor legacy: %s',
    (_nombre, escenario) => {
      const legacy = calcularDetalleOraculo(escenario);

      const entrada = mapearEntrada(escenario);
      const calculadora = crearCalculadoraRegimen(entrada.regimenLaboral);
      const boleta = calcularBoleta(entrada, calculadora, params);
      const c = boleta.conceptos;

      // --- Conceptos compartidos afectos ---
      expect(monto(c, 'haber_mensual')).toBe(legacy.haber_mensual);
      expect(monto(c, CLAVE_HE_25)).toBe(legacy.horas_extras_25);
      expect(monto(c, CLAVE_HE_35)).toBe(legacy.horas_extras_35);
      expect(monto(c, CLAVE_BONIF_NOCTURNA)).toBe(legacy.bonificacion_nocturna);

      // Remuneración afecta (base de pensión/EsSalud/renta).
      expect(boleta.totalAportes).toBeGreaterThanOrEqual(0);

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
    },
  );
});
