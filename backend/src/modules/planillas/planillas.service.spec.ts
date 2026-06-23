/**
 * Tests unitarios del método `calcularEmpleado` de PlanillasService.
 *
 * Este método es PURO: recibe un empleado con todas sus relaciones precargadas
 * y devuelve el cálculo completo de planilla de ese mes (~100 campos).
 *
 * Estrategia: usamos fixtures mínimos que van agregando complejidad. Cada test
 * valida campos específicos verificables contra la legislación laboral peruana.
 *
 * Referencias:
 * - RMV 2025: S/ 1,130
 * - Asignación Familiar: 10% RMV = S/ 113
 * - D.S. 007-2002-TR (horas extras)
 * - Art. 53 LIR (IR 5ta)
 */
import {
  ASIGNACION_FAMILIAR,
  RMV,
  ONP_PORCENTAJE,
  ESSALUD_PORCENTAJE,
  SOBRETASA_NOCTURNA,
  round2,
} from './planillas.config';
import { calcularDetalleCompleto } from './dominio/detalle/calcular-detalle-completo';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './aplicacion/mapear-entrada-detalle';
import { ParametrosLegalesEnMemoria } from './infraestructura/parametros-legales-en-memoria';

/** Forma mínima de un detalle de tareo usado en los fixtures de prueba. */
interface DetalleTareoFixture {
  fecha: Date;
  horas: number;
  tipo_marcacion: {
    codigo: string;
    es_laborable: boolean;
    horas_diurnas: number;
    horas_nocturnas: number;
    horas_default: number;
  };
}

describe('PlanillasService.calcularEmpleado', () => {
  // El motor legacy fue retirado. Estas pruebas de comportamiento ahora ejercen
  // el motor PURO del dominio `calcularDetalleCompleto` (vía el mapper de
  // aplicación), que reprodujo el legacy al céntimo antes de borrarlo.
  const PARAMS = new ParametrosLegalesEnMemoria();

  const calcular = (
    empleado: Record<string, unknown>,
    mes: number = 1,
    anio: number = 2026,
    acumuladoRenta: number = 0,
    retencionesPreviasRenta: number = 0,
  ) => {
    const entrada = mapearEntradaDetalle({
      empleado: empleado as unknown as EmpleadoParaDetalle,
      mes,
      anio,
      acumuladoRenta,
      retencionesPreviasRenta,
      promedios: {
        promedioHorasExtras: 0,
        promedioComisiones: 0,
        promedioBonificaciones: 0,
        ultimaGratificacion: 0,
      },
    });
    return calcularDetalleCompleto(entrada, PARAMS);
  };

  /**
   * Fixture: construye un empleado mínimo para cálculo.
   * Los overrides permiten personalizar atributos sin rearmar toda la estructura.
   */
  function crearEmpleado(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      numero_documento: '12345678',
      apellido_paterno: 'TEST',
      apellido_materno: 'EMPLEADO',
      nombres: 'MINIMO',
      sueldo_base: 1130,
      asignacion_familiar: false,
      tipo_pago: 'PLANILLA',
      turno: 'DIA',
      fecha_ingreso: new Date('2024-01-01'),
      fecha_cese: null,
      fecha_planilla: new Date('2024-01-01'),
      estado: 'ACTIVO',
      sctr: false,
      regimen_pensionario_id: null,
      regimen_pensionario: null,
      banco_haberes_id: null,
      banco_haberes: null,
      cuspp: null,
      bono_productividad: null,
      bono_desempeno: null,
      bono_movilidad: null,
      bono_refrigerio: null,
      bono_armado: null,
      asignacion_cliente: null,
      monto_adelanto: null,
      contratos: [],
      tareos: [],
      ...overrides,
    };
  }

  /**
   * Fixture: construye un tareo con N días de asistencia ('A').
   * Simula un empleado que trabajó todo el mes sin incidencias.
   */
  function crearTareoAsistenciaCompleta(dias: number = 30) {
    const detalles = Array.from({ length: dias }, (_, i) => ({
      fecha: new Date(2024, 0, i + 1),
      horas: 8,
      tipo_marcacion: {
        codigo: 'A',
        es_laborable: true,
        horas_diurnas: 8,
        horas_nocturnas: 0,
        horas_default: 8,
      },
    }));
    return [{ detalles }];
  }

  describe('empleado mínimo sin tareo', () => {
    it('no genera error al ejecutarse', () => {
      expect(() => calcular(crearEmpleado())).not.toThrow();
    });

    it('devuelve un objeto con los campos esperados', () => {
      const resultado = calcular(crearEmpleado());
      expect(resultado).toHaveProperty('sueldo_base');
      expect(resultado).toHaveProperty('haber_mensual');
      expect(resultado).toHaveProperty('total_ingresos');
      expect(resultado).toHaveProperty('total_descuentos');
      expect(resultado).toHaveProperty('neto_pagar');
      expect(resultado).toHaveProperty('essalud_empleador');
    });

    it('refleja el sueldo_base del empleado', () => {
      const r = calcular(crearEmpleado({ sueldo_base: 1500 }));
      expect(r.sueldo_base).toBe(1500);
    });
  });

  describe('empleado con RMV + tareo completo (30 días asistidos)', () => {
    it('calcula haber mensual completo (sueldo/30 * 30)', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: RMV,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.haber_mensual).toBeCloseTo(RMV, 2);
    });

    it('no aplica asignación familiar cuando es false', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: RMV,
          asignacion_familiar: false,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.asignacion_familiar).toBe(0);
    });

    /**
     * COMPORTAMIENTO CORRECTO (Ley 25129): cuando el empleado tiene derecho
     * (`asignacion_familiar = true`), la asignación familiar (10% RMV = S/113) se
     * calcula AUTOMÁTICAMENTE durante el cálculo de la planilla.
     *
     * CAMBIO INTENCIONAL: el legacy fijaba este monto en 0 para todos (subpago
     * heredado) y exigía edición manual post-cálculo. Esa brecha quedó corregida
     * al cablear el dato real del empleado en ambos caminos de cálculo.
     */
    it('calcula la asignación familiar automáticamente cuando el empleado tiene derecho', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: RMV,
          asignacion_familiar: true,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.asignacion_familiar).toBe(ASIGNACION_FAMILIAR);
    });

    it('la constante ASIGNACION_FAMILIAR refleja el 10% de la RMV vigente', () => {
      expect(ASIGNACION_FAMILIAR).toBe(113);
    });

    it('el neto a pagar es positivo y menor al total de ingresos', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.neto_pagar).toBeGreaterThan(0);
      expect(r.neto_pagar).toBeLessThanOrEqual(r.total_ingresos);
    });
  });

  describe('aporte EsSalud del empleador (9%)', () => {
    it('calcula 9% de la remuneración afecta', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      // EsSalud empleador = 9% de remuneración_afecta
      const esperado = r.remuneracion_afecta * 0.09;
      expect(r.essalud_empleador).toBeCloseTo(esperado, 0);
    });

    it('aplica el mínimo legal cuando rem.afecta < RMV', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: RMV,
          tareos: crearTareoAsistenciaCompleta(15), // solo medio mes
        }),
      );
      // Si rem_afecta < RMV, EsSalud mínimo = 9% de RMV = 101.7
      if (r.remuneracion_afecta < RMV) {
        expect(r.essalud_empleador).toBeGreaterThanOrEqual(101.7);
      }
    });
  });

  describe('descuento por faltas', () => {
    function crearTareoConFaltas(diasAsistidos: number, diasFalta: number) {
      const detalles: DetalleTareoFixture[] = [];
      for (let i = 0; i < diasAsistidos; i++) {
        detalles.push({
          fecha: new Date(2024, 0, i + 1),
          horas: 8,
          tipo_marcacion: {
            codigo: 'A',
            es_laborable: true,
            horas_diurnas: 8,
            horas_nocturnas: 0,
            horas_default: 8,
          },
        });
      }
      for (let i = 0; i < diasFalta; i++) {
        detalles.push({
          fecha: new Date(2024, 0, diasAsistidos + i + 1),
          horas: 0,
          tipo_marcacion: {
            codigo: 'F',
            es_laborable: true,
            horas_diurnas: 0,
            horas_nocturnas: 0,
            horas_default: 0,
          },
        });
      }
      return [{ detalles }];
    }

    it('registra los días de falta en el resultado', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoConFaltas(28, 2),
        }),
      );
      expect(r.dias_falta).toBe(2);
    });

    it('genera descuento cuando hay faltas', () => {
      const con = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoConFaltas(28, 2),
        }),
      );
      const sin = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(con.descuento_faltas).toBeGreaterThan(0);
      expect(con.neto_pagar).toBeLessThan(sin.neto_pagar);
    });
  });

  describe('invariantes que SIEMPRE se cumplen', () => {
    it('el total_dias siempre es 30 (divisor legal peruano)', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 2000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.total_dias).toBe(30);
    });

    it('total_descuentos = total_descuentos_ley + total_descuentos_otros', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 5000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.total_descuentos).toBeCloseTo(
        r.total_descuentos_ley + r.total_descuentos_otros,
        2,
      );
    });

    it('total_ingresos = total_ingresos_afectos + total_ingresos_no_afectos', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 5000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.total_ingresos).toBeCloseTo(
        r.total_ingresos_afectos + r.total_ingresos_no_afectos,
        2,
      );
    });
  });

  // =============================================
  // AFP / ONP — Descuentos Pensionarios
  // =============================================

  describe('AFP - descuento pensionario (3 componentes)', () => {
    /**
     * Fixture: régimen AFP Habitat (valores reales SBS)
     * - Aporte obligatorio: 10%
     * - Prima seguro: 1.74%
     * - Comisión flujo: 1.47%
     */
    const AFP_HABITAT = {
      id: 1,
      nombre: 'HABITAT',
      tipo: 'AFP',
      aporte_obligatorio: 10,
      prima_seguro: 1.74,
      comision_flujo: 1.47,
      comision_mixta: 0,
      activo: true,
    };

    function empleadoAFP(
      sueldo: number,
      overrides: Record<string, unknown> = {},
    ) {
      return crearEmpleado({
        sueldo_base: sueldo,
        regimen_pensionario_id: AFP_HABITAT.id,
        regimen_pensionario: AFP_HABITAT,
        tareos: crearTareoAsistenciaCompleta(30),
        ...overrides,
      });
    }

    it('calcula aporte obligatorio = 10% de remuneración afecta', () => {
      const r = calcular(empleadoAFP(3000));
      expect(r.afp_aporte).toBeCloseTo(r.remuneracion_afecta * 0.1, 1);
    });

    it('calcula prima de seguro = 1.74% de remuneración afecta', () => {
      const r = calcular(empleadoAFP(3000));
      expect(r.afp_prima).toBeCloseTo(r.remuneracion_afecta * 0.0174, 1);
    });

    it('afp_seguro es igual a afp_prima', () => {
      const r = calcular(empleadoAFP(3000));
      expect(r.afp_seguro).toBe(r.afp_prima);
    });

    it('calcula comisión flujo = 1.47% de remuneración afecta', () => {
      const r = calcular(empleadoAFP(3000));
      expect(r.afp_comision).toBeCloseTo(r.remuneracion_afecta * 0.0147, 1);
    });

    it('no calcula ONP cuando el régimen es AFP', () => {
      const r = calcular(empleadoAFP(3000));
      expect(r.onp).toBe(0);
    });

    it('el total de descuentos de ley incluye AFP', () => {
      const r = calcular(empleadoAFP(3000));
      expect(r.total_descuentos_ley).toBeGreaterThanOrEqual(
        r.afp_aporte + r.afp_prima + r.afp_comision,
      );
    });

    it('con tasas distintas (Integra) calcula correctamente', () => {
      const AFP_INTEGRA = {
        ...AFP_HABITAT,
        nombre: 'INTEGRA',
        prima_seguro: 1.74,
        comision_flujo: 1.55,
      };
      const r = calcular(
        crearEmpleado({
          sueldo_base: 5000,
          regimen_pensionario_id: 2,
          regimen_pensionario: AFP_INTEGRA,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.afp_comision).toBeCloseTo(r.remuneracion_afecta * 0.0155, 1);
    });
  });

  describe('ONP - descuento pensionario (tasa fija 13%)', () => {
    const ONP_REGIMEN = {
      id: 10,
      nombre: 'ONP',
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
      comision_mixta: 0,
      activo: true,
    };

    function empleadoONP(sueldo: number) {
      return crearEmpleado({
        sueldo_base: sueldo,
        regimen_pensionario_id: ONP_REGIMEN.id,
        regimen_pensionario: ONP_REGIMEN,
        tareos: crearTareoAsistenciaCompleta(30),
      });
    }

    it('calcula ONP = 13% de remuneración afecta', () => {
      const r = calcular(empleadoONP(3000));
      expect(r.onp).toBeCloseTo(r.remuneracion_afecta * ONP_PORCENTAJE, 1);
    });

    it('no calcula AFP cuando el régimen es ONP', () => {
      const r = calcular(empleadoONP(3000));
      expect(r.afp_aporte).toBe(0);
      expect(r.afp_prima).toBe(0);
      expect(r.afp_comision).toBe(0);
    });

    it('usa ONP_PORCENTAJE como fallback si aporte_obligatorio es 0', () => {
      const regimenSinTasa = { ...ONP_REGIMEN, aporte_obligatorio: 0 };
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          regimen_pensionario_id: 10,
          regimen_pensionario: regimenSinTasa,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      // Debe usar ONP_PORCENTAJE (0.13) como fallback
      expect(r.onp).toBeCloseTo(r.remuneracion_afecta * ONP_PORCENTAJE, 1);
    });
  });

  describe('sin régimen pensionario', () => {
    it('no descuenta AFP ni ONP', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          regimen_pensionario: null,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.afp_aporte).toBe(0);
      expect(r.afp_prima).toBe(0);
      expect(r.afp_comision).toBe(0);
      expect(r.onp).toBe(0);
    });
  });

  // =============================================
  // HORAS EXTRAS — D.S. 007-2002-TR
  // =============================================

  describe('horas extras diurnas (D.S. 007-2002-TR)', () => {
    /**
     * Fixture: tareo con días de asistencia + días con horas extras.
     *
     * El motor lee `detalle.horas` (no `horas_trabajadas`) y calcula HE
     * cuando horas > 8. El turno diurno/nocturno se determina por
     * `tipo_marcacion.horas_diurnas` / `horas_nocturnas`.
     */
    function crearTareoConHorasExtras(
      diasNormales: number,
      horasExtras25: number,
      horasExtras35: number,
    ) {
      const detalles: DetalleTareoFixture[] = [];
      for (let i = 0; i < diasNormales; i++) {
        detalles.push({
          fecha: new Date(2024, 0, i + 1),
          horas: 8,
          tipo_marcacion: {
            codigo: 'A',
            es_laborable: true,
            horas_diurnas: 8,
            horas_nocturnas: 0,
            horas_default: 8,
          },
        });
      }
      // Agregar un día con HE al final (total horas > 8)
      const totalHorasExtra = horasExtras25 + horasExtras35;
      if (totalHorasExtra > 0) {
        detalles.push({
          fecha: new Date(2024, 0, diasNormales + 1),
          horas: 8 + totalHorasExtra,
          tipo_marcacion: {
            codigo: 'E',
            es_laborable: true,
            horas_diurnas: 8 + totalHorasExtra,
            horas_nocturnas: 0,
            horas_default: 8,
          },
        });
      }
      return [{ detalles }];
    }

    it('calcula valor hora normal = sueldo / 30 / 8', () => {
      const sueldo = 3000;
      const r = calcular(
        crearEmpleado({
          sueldo_base: sueldo,
          tareos: crearTareoConHorasExtras(29, 2, 0),
        }),
      );
      const valorHoraNormal = round2(sueldo / 30 / 8);
      // HE25 diurnas = horas * valorHora * 1.25
      const esperado = round2(2 * round2(valorHoraNormal * 1.25));
      expect(r.horas_extras_25).toBeCloseTo(esperado, 1);
    });

    it('calcula HE 25% (primeras 2 horas) correctamente', () => {
      const sueldo = 1800;
      const horas = 2;
      const r = calcular(
        crearEmpleado({
          sueldo_base: sueldo,
          tareos: crearTareoConHorasExtras(29, horas, 0),
        }),
      );
      expect(r.horas_extras_25).toBeGreaterThan(0);
      expect(r.horas_extras_35).toBe(0);
    });

    it('calcula HE 35% (desde 3ra hora extra) correctamente', () => {
      // 5 horas extra en total: 2 al 25% + 3 al 35%
      const sueldo = 1800;
      const r = calcular(
        crearEmpleado({
          sueldo_base: sueldo,
          tareos: crearTareoConHorasExtras(29, 5, 0), // 5 HE = 2 al 25% + 3 al 35%
        }),
      );
      expect(r.horas_extras_25).toBeGreaterThan(0);
      expect(r.horas_extras_35).toBeGreaterThan(0);
    });

    it('HE con 4 horas genera tanto 25% como 35%', () => {
      // 4 horas extra: primeras 2 → 25%, siguiente 2 → 35%
      const sueldo = 3000;
      const r = calcular(
        crearEmpleado({
          sueldo_base: sueldo,
          tareos: crearTareoConHorasExtras(29, 4, 0),
        }),
      );
      expect(r.horas_extras_25).toBeGreaterThan(0);
      expect(r.horas_extras_35).toBeGreaterThan(0);
      expect(r.horas_extras_35).toBeGreaterThan(r.horas_extras_25);
    });

    it('sin horas extras el monto es 0', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.horas_extras).toBe(0);
      expect(r.horas_extras_25).toBe(0);
      expect(r.horas_extras_35).toBe(0);
    });

    it('las horas extras son ingresos afectos', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoConHorasExtras(28, 4, 2),
        }),
      );
      expect(r.horas_extras).toBeGreaterThan(0);
      // Total ingresos afectos debe incluir las HE
      expect(r.total_ingresos_afectos).toBeGreaterThanOrEqual(
        r.haber_mensual + r.horas_extras,
      );
    });
  });

  describe('sueldo nocturno (D.S. 007-2002-TR)', () => {
    function crearTareoNocturno(diasNoche: number, diasDia: number = 0) {
      const detalles: DetalleTareoFixture[] = [];
      for (let i = 0; i < diasDia; i++) {
        detalles.push({
          fecha: new Date(2024, 0, i + 1),
          horas: 8,
          tipo_marcacion: {
            codigo: 'A',
            es_laborable: true,
            horas_diurnas: 8,
            horas_nocturnas: 0,
            horas_default: 8,
          },
        });
      }
      for (let i = 0; i < diasNoche; i++) {
        detalles.push({
          fecha: new Date(2024, 0, diasDia + i + 1),
          horas: 8,
          tipo_marcacion: {
            codigo: 'C',
            es_laborable: true,
            horas_diurnas: 0,
            horas_nocturnas: 8,
            horas_default: 8,
          },
        });
      }
      return [{ detalles }];
    }

    it('calcula sobretasa nocturna del 35%', () => {
      const sueldo = 3000;
      const diasNoche = 10;
      const r = calcular(
        crearEmpleado({
          sueldo_base: sueldo,
          turno: 'NOCHE',
          tareos: crearTareoNocturno(diasNoche),
        }),
      );
      // S.Nocturno = (sueldo * 0.35 / 30) × turno_noche
      const esperado = round2(((sueldo * SOBRETASA_NOCTURNA) / 30) * diasNoche);
      expect(r.sueldo_nocturno).toBeCloseTo(esperado, 1);
    });

    it('turno noche sin días nocturnos = sueldo nocturno 0', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          turno: 'NOCHE',
          tareos: crearTareoAsistenciaCompleta(30), // todos con código A (día)
        }),
      );
      expect(r.sueldo_nocturno).toBe(0);
    });
  });

  // =============================================
  // INVARIANTES CRUZADAS (AFP + HE + EsSalud)
  // =============================================

  describe('invariantes cruzadas: AFP + HE + EsSalud', () => {
    const AFP = {
      id: 1,
      nombre: 'HABITAT',
      tipo: 'AFP',
      aporte_obligatorio: 10,
      prima_seguro: 1.74,
      comision_flujo: 1.47,
      comision_mixta: 0,
      activo: true,
    };

    it('neto_pagar = total_ingresos - total_descuentos', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 5000,
          regimen_pensionario_id: 1,
          regimen_pensionario: AFP,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      expect(r.neto_pagar).toBeCloseTo(
        r.total_ingresos - r.total_descuentos,
        2,
      );
    });

    it('los descuentos pensionarios son proporcionales al sueldo', () => {
      const r1 = calcular(
        crearEmpleado({
          sueldo_base: 2000,
          regimen_pensionario_id: 1,
          regimen_pensionario: AFP,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      const r2 = calcular(
        crearEmpleado({
          sueldo_base: 4000,
          regimen_pensionario_id: 1,
          regimen_pensionario: AFP,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      // Doble sueldo ≈ doble descuento AFP (proporcional)
      expect(r2.afp_aporte).toBeCloseTo(r1.afp_aporte * 2, 0);
    });

    it('EsSalud se calcula SOLO como aporte empleador, no descuento al trabajador', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 5000,
          regimen_pensionario_id: 1,
          regimen_pensionario: AFP,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
      );
      // EsSalud aparece como aporte empleador, NO dentro de descuentos del trabajador
      expect(r.essalud_empleador).toBeGreaterThan(0);
      expect(r.essalud).toBe(0); // El campo essalud del trabajador siempre es 0
    });
  });

  // =============================================
  // GRATIFICACIONES — Ley 27735 + Ley 30334
  // =============================================

  describe('gratificaciones (Ley 27735)', () => {
    it('se paga en julio (Fiestas Patrias)', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7, // julio
      );
      expect(r.gratificacion_monto).toBeGreaterThan(0);
    });

    it('se paga en diciembre (Navidad)', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        12, // diciembre
      );
      expect(r.gratificacion_monto).toBeGreaterThan(0);
    });

    it('NO se paga en meses que no son julio ni diciembre', () => {
      for (const mes of [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]) {
        const r = calcular(
          crearEmpleado({
            sueldo_base: 3000,
            tareos: crearTareoAsistenciaCompleta(30),
          }),
          mes,
        );
        expect(r.gratificacion_monto).toBe(0);
      }
    });

    it('empleado con semestre completo recibe sueldo íntegro como gratificación', () => {
      // Ingresó el 01/01/2024, planilla julio 2024 → 6 meses completos
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-01-01'),
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7, // julio
        2024,
      );
      // Gratificación completa = sueldo (sin bonos ni promedios)
      expect(r.gratificacion_monto).toBeCloseTo(3000, 0);
    });

    it('incluye bonificación extraordinaria del 9% (Ley 30334)', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7,
        2024,
      );
      // Bonif. ext. = 9% de la gratificación
      expect(r.bonif_extraordinaria).toBeCloseTo(
        r.gratificacion_monto * ESSALUD_PORCENTAJE,
        1,
      );
    });

    it('la gratificación es ingreso NO afecto (no se descuenta AFP/ONP)', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7,
        2024,
      );
      // La gratificación va a total_ingresos_no_afectos, no a total_ingresos_afectos
      expect(r.total_ingresos_no_afectos).toBeGreaterThanOrEqual(
        r.gratificacion_monto,
      );
    });

    it('empleado ingresado a mitad del semestre recibe gratificación proporcional', () => {
      // Ingresó 01/04/2024 → solo 3 meses del semestre ene-jun para julio
      const completo = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-01-01'),
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7,
        2024,
      );
      const parcial = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-04-01'),
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7,
        2024,
      );
      expect(parcial.gratificacion_monto).toBeLessThan(
        completo.gratificacion_monto,
      );
      expect(parcial.gratificacion_monto).toBeGreaterThan(0);
    });
  });

  // =============================================
  // CTS — D.S. 001-97-TR
  // =============================================

  describe('CTS (D.S. 001-97-TR)', () => {
    it('se deposita en mayo', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        5, // mayo
        2024,
      );
      expect(r.cts_monto).toBeGreaterThan(0);
    });

    it('se deposita en noviembre', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        11, // noviembre
        2024,
      );
      expect(r.cts_monto).toBeGreaterThan(0);
    });

    it('NO se deposita en otros meses', () => {
      for (const mes of [1, 2, 3, 4, 6, 7, 8, 9, 10, 12]) {
        const r = calcular(
          crearEmpleado({
            sueldo_base: 3000,
            tareos: crearTareoAsistenciaCompleta(30),
          }),
          mes,
          2024,
        );
        expect(r.cts_monto).toBe(0);
      }
    });

    it('semestre completo: CTS = rem.computable / 12 * 6 = medio sueldo aprox', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-01-01'),
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        5,
        2024,
      );
      // CTS semestre completo ≈ (sueldo + 1/6 grat) / 12 * 6
      // Sin gratificación previa: (3000 + 500) / 12 * 6 = 1750
      expect(r.cts_monto).toBeGreaterThan(1000);
      expect(r.cts_monto).toBeLessThan(3000);
    });

    it('la CTS es ingreso NO afecto', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        5,
        2024,
      );
      expect(r.total_ingresos_no_afectos).toBeGreaterThanOrEqual(r.cts_monto);
    });

    it('CTS proporcional para ingreso a mitad del semestre', () => {
      const completo = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2023-01-01'), // antes del semestre
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        5,
        2024,
      );
      const parcial = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-02-01'), // mitad del semestre
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        5,
        2024,
      );
      expect(parcial.cts_monto).toBeLessThan(completo.cts_monto);
      expect(parcial.cts_monto).toBeGreaterThan(0);
    });
  });

  // =============================================
  // INVARIANTES FINALES
  // =============================================

  describe('invariantes finales con gratificación + CTS', () => {
    it('en julio: total_ingresos incluye gratificación + bonif. ext.', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        7,
        2024,
      );
      expect(r.total_ingresos).toBeGreaterThanOrEqual(
        r.haber_mensual + r.gratificacion_monto + r.bonif_extraordinaria,
      );
    });

    it('en mayo: total_ingresos incluye CTS', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        5,
        2024,
      );
      expect(r.total_ingresos).toBeGreaterThanOrEqual(
        r.haber_mensual + r.cts_monto,
      );
    });

    it('neto_pagar sigue siendo total_ingresos - total_descuentos en meses especiales', () => {
      for (const mes of [5, 7, 11, 12]) {
        const r = calcular(
          crearEmpleado({
            sueldo_base: 5000,
            tareos: crearTareoAsistenciaCompleta(30),
          }),
          mes,
          2024,
        );
        expect(r.neto_pagar).toBeCloseTo(
          r.total_ingresos - r.total_descuentos,
          2,
        );
      }
    });
  });

  // =============================================
  // CESE + BENEFICIOS TRUNCOS
  // =============================================

  describe('cese a mitad de mes (contrato con fecha_fin)', () => {
    function empleadoCesado(diaCese: number, mes: number = 3) {
      return crearEmpleado({
        sueldo_base: 3000,
        fecha_ingreso: new Date('2024-01-01'),
        fecha_cese: new Date(2024, mes - 1, diaCese),
        contratos: [
          {
            id: 1,
            fecha_inicio: new Date('2024-01-01'),
            fecha_fin: new Date(2024, mes - 1, diaCese),
            estado: 'CESADO',
            numero_renovacion: 1,
          },
        ],
        tareos: crearTareoAsistenciaCompleta(diaCese),
      });
    }

    it('detecta días cesados cuando el contrato termina antes del fin del mes', () => {
      // Cese día 15 de marzo → 31-15 = 16 días cesados (marzo tiene 31 días)
      const r = calcular(empleadoCesado(15, 3), 3, 2024);
      expect(r.dias_cesado_no_lab).toBeGreaterThan(0);
    });

    it('el sueldo es proporcional a los días trabajados', () => {
      const completo = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        3,
        2024,
      );
      const parcial = calcular(empleadoCesado(15, 3), 3, 2024);
      expect(parcial.haber_mensual).toBeLessThan(completo.haber_mensual);
    });

    it('calcula CTS trunca para empleado cesado', () => {
      const r = calcular(empleadoCesado(15, 3), 3, 2024);
      expect(r.cts_trunca).toBeGreaterThan(0);
    });

    it('calcula gratificación trunca para empleado cesado', () => {
      const r = calcular(empleadoCesado(15, 3), 3, 2024);
      expect(r.grat_trunca).toBeGreaterThan(0);
    });

    it('calcula vacaciones truncas para empleado cesado', () => {
      const r = calcular(empleadoCesado(15, 3), 3, 2024);
      expect(r.vac_truncas).toBeGreaterThan(0);
    });

    it('total_beneficios_sociales = cts_trunca + grat_trunca + vac_truncas', () => {
      const r = calcular(empleadoCesado(15, 3), 3, 2024);
      expect(r.total_beneficios_sociales).toBeCloseTo(
        r.cts_trunca + r.grat_trunca + r.vac_truncas,
        2,
      );
    });

    it('NO calcula truncas si el empleado NO cesa en el período', () => {
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-01-01'),
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        3,
        2024,
      );
      expect(r.cts_trunca).toBe(0);
      expect(r.grat_trunca).toBe(0);
      expect(r.vac_truncas).toBe(0);
    });

    it('cese en último día del mes NO genera días cesados', () => {
      // Marzo tiene 31 días. Si cesa el 31, no hay días posteriores sin trabajar
      const r = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          fecha_ingreso: new Date('2024-01-01'),
          contratos: [
            {
              id: 1,
              fecha_inicio: new Date('2024-01-01'),
              fecha_fin: new Date(2024, 2, 31), // 31 marzo = último día
              estado: 'CESADO',
              numero_renovacion: 1,
            },
          ],
          tareos: crearTareoAsistenciaCompleta(30),
        }),
        3,
        2024,
      );
      expect(r.dias_cesado_no_lab).toBe(0);
    });
  });

  describe('vacaciones truncas con asignación familiar (D.L. 713)', () => {
    it('incluye asignación familiar en la base de cálculo de vacaciones truncas', () => {
      const sinAsig = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          asignacion_familiar: false,
          fecha_ingreso: new Date('2024-01-01'),
          fecha_cese: new Date(2024, 2, 15),
          contratos: [
            {
              id: 1,
              fecha_inicio: new Date('2024-01-01'),
              fecha_fin: new Date(2024, 2, 15),
              estado: 'CESADO',
              numero_renovacion: 1,
            },
          ],
          tareos: crearTareoAsistenciaCompleta(15),
        }),
        3,
        2024,
      );
      const conAsig = calcular(
        crearEmpleado({
          sueldo_base: 3000,
          asignacion_familiar: true,
          fecha_ingreso: new Date('2024-01-01'),
          fecha_cese: new Date(2024, 2, 15),
          contratos: [
            {
              id: 1,
              fecha_inicio: new Date('2024-01-01'),
              fecha_fin: new Date(2024, 2, 15),
              estado: 'CESADO',
              numero_renovacion: 1,
            },
          ],
          tareos: crearTareoAsistenciaCompleta(15),
        }),
        3,
        2024,
      );
      // Con asig. familiar la base es mayor → vacaciones truncas mayores
      expect(conAsig.vac_truncas).toBeGreaterThan(sinAsig.vac_truncas);
    });
  });
});
