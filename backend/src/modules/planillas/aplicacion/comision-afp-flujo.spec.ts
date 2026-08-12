/**
 * Flujo completo del TIPO DE COMISIÓN AFP (Ley 29903, TUO SPP) por los DOS
 * motores que conviven en producción:
 *
 *  1. Camino DETALLE: `mapearEntradaDetalle` + `calcularDetalleCompleto` →
 *     campo `afp_comision` del DTO de `PlanillaDetalle`.
 *  2. Camino RÉGIMEN: `mapearEntradaCalculo` + `calcularBoleta` +
 *     `extraerMontosLoadBearing` → el mismo campo, que PISA al anterior en el
 *     servicio real.
 *
 * Si los dos no resuelven la MISMA tasa, la planilla persiste un valor y la
 * boleta muestra otro. Por eso cada escenario se afirma en ambos caminos.
 */
import { calcularVentanaPeriodo } from '../../tareo/ventana-periodo';
import { calcularDetalleCompleto } from '../dominio/detalle/calcular-detalle-completo';
import { calcularBoleta } from '../dominio/motor/calcular-boleta';
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { TipoComisionAfp } from '../dominio/tipos';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './mapear-entrada-detalle';
import {
  mapearEntradaCalculo,
  EmpleadoParaMapeo,
} from './mapear-entrada-calculo';
import { extraerMontosLoadBearing } from './mapear-resultado-detalle';

const PARAMS = new ParametrosLegalesEnMemoria();

/** Sueldo con base afecta redonda: 30 días trabajados → 3000 de base. */
const SUELDO = 3000;
const MES = 3;
const ANIO = 2026;

/** Tasas 2026 de AFP HABITAT en PORCENTAJE, como las guarda Prisma. */
const HABITAT = {
  tipo: 'AFP',
  aporte_obligatorio: 10,
  prima_seguro: 1.37,
  comision_flujo: 1.47,
  comision_mixta_flujo: 0.38,
};

function diaTrabajado(dia: number) {
  return {
    dia,
    horas: 8,
    tipo_marcacion: {
      codigo: 'A',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: 8,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

const TAREO = Array.from({ length: 30 }, (_, i) => diaTrabajado(i + 1));

/** Comisión que persiste el camino DETALLE. */
function comisionPorDetalle(tipo: TipoComisionAfp | null): number {
  const empleado: EmpleadoParaDetalle = {
    sueldo_base: SUELDO,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    fecha_cese: null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: HABITAT,
    tipo_comision_afp: tipo,
    contratos: [
      { fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null },
    ],
    tareos: [{ detalles: TAREO }],
  };
  const entrada = mapearEntradaDetalle({
    empleado,
    mes: MES,
    anio: ANIO,
    ventanaPeriodo: calcularVentanaPeriodo(ANIO, MES, null),
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
  });
  return calcularDetalleCompleto(entrada, PARAMS).afp_comision;
}

/** Comisión que PISA el camino RÉGIMEN (motor de boleta). */
function comisionPorRegimen(tipo: TipoComisionAfp | null): number {
  const empleado: EmpleadoParaMapeo = {
    sueldo_base: SUELDO,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    asignacion_familiar: false,
    regimen_pensionario: HABITAT,
    tipo_comision_afp: tipo,
    contratos: [{ regimen_laboral: null }],
    tareos: [{ detalles: TAREO }],
  };
  const entrada = mapearEntradaCalculo({
    empleado,
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes: MES,
    anio: ANIO,
  });
  const boleta = calcularBoleta(
    entrada,
    crearCalculadoraRegimen(entrada.regimenLaboral),
    PARAMS,
  );
  return extraerMontosLoadBearing(boleta).afp_comision;
}

describe('tipo de comisión AFP — paridad de los dos motores', () => {
  it('FLUJO retiene 1.47% de la base afecta (3000 → 44.10)', () => {
    expect(comisionPorDetalle(TipoComisionAfp.FLUJO)).toBe(44.1);
    expect(comisionPorRegimen(TipoComisionAfp.FLUJO)).toBe(44.1);
  });

  it('MIXTA retiene solo 0.38% de la MISMA base (3000 → 11.40)', () => {
    expect(comisionPorDetalle(TipoComisionAfp.MIXTA)).toBe(11.4);
    expect(comisionPorRegimen(TipoComisionAfp.MIXTA)).toBe(11.4);
  });

  it('dos afiliados de la misma AFP y misma base pagan comisiones distintas', () => {
    expect(comisionPorDetalle(TipoComisionAfp.MIXTA)).toBeLessThan(
      comisionPorDetalle(TipoComisionAfp.FLUJO),
    );
    expect(comisionPorRegimen(TipoComisionAfp.MIXTA)).toBeLessThan(
      comisionPorRegimen(TipoComisionAfp.FLUJO),
    );
  });

  it('REGRESIÓN: sin tipo declarado se mantiene el comportamiento actual (flujo)', () => {
    expect(comisionPorDetalle(null)).toBe(44.1);
    expect(comisionPorRegimen(null)).toBe(44.1);
  });

  it('el aporte obligatorio y la prima NO dependen del tipo de comisión', () => {
    const empleadoBase = (tipo: TipoComisionAfp): EmpleadoParaDetalle => ({
      sueldo_base: SUELDO,
      fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
      fecha_cese: null,
      asignacion_familiar: false,
      sctr: false,
      regimen_pensionario: HABITAT,
      tipo_comision_afp: tipo,
      contratos: [
        { fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null },
      ],
      tareos: [{ detalles: TAREO }],
    });
    const calcular = (tipo: TipoComisionAfp) =>
      calcularDetalleCompleto(
        mapearEntradaDetalle({
          empleado: empleadoBase(tipo),
          mes: MES,
          anio: ANIO,
          ventanaPeriodo: calcularVentanaPeriodo(ANIO, MES, null),
          acumuladoRenta: 0,
          retencionesPreviasRenta: 0,
          promedios: {
            promedioHorasExtras: 0,
            promedioComisiones: 0,
            promedioBonificaciones: 0,
            ultimaGratificacion: 0,
          },
        }),
        PARAMS,
      );
    const flujo = calcular(TipoComisionAfp.FLUJO);
    const mixta = calcular(TipoComisionAfp.MIXTA);

    expect(flujo.afp_aporte).toBe(300);
    expect(mixta.afp_aporte).toBe(300);
    expect(flujo.afp_prima).toBe(41.1);
    expect(mixta.afp_prima).toBe(41.1);
  });

  it('la ONP ignora el tipo de comisión (no existe comisión en el SNP)', () => {
    const onp = {
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
      comision_mixta_flujo: 0,
    };
    const entrada = mapearEntradaDetalle({
      empleado: {
        sueldo_base: SUELDO,
        fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
        fecha_cese: null,
        asignacion_familiar: false,
        sctr: false,
        regimen_pensionario: onp,
        tipo_comision_afp: TipoComisionAfp.MIXTA,
        contratos: [
          { fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null },
        ],
        tareos: [{ detalles: TAREO }],
      },
      mes: MES,
      anio: ANIO,
      ventanaPeriodo: calcularVentanaPeriodo(ANIO, MES, null),
      acumuladoRenta: 0,
      retencionesPreviasRenta: 0,
      promedios: {
        promedioHorasExtras: 0,
        promedioComisiones: 0,
        promedioBonificaciones: 0,
        ultimaGratificacion: 0,
      },
    });
    const dto = calcularDetalleCompleto(entrada, PARAMS);
    expect(dto.onp).toBe(390);
    expect(dto.afp_comision).toBe(0);
  });
});
