/**
 * RED DE EXHAUSTIVIDAD: los conceptos del dominio contra las claves que el
 * mapper sabe persistir.
 *
 * El agujero que este spec cierra: `extraerMontosLoadBearing` conocía 13 de las
 * 24 claves que el dominio sabe emitir y descartaba el resto SIN dejar rastro.
 * Un régimen podía calcular un aporte perfectamente y la planilla guardarlo en
 * cero. No era un bug hipotético: MICROEMPRESA emite `sis_microempresa` en lugar
 * del aporte de EsSalud, así que su boleta se habría persistido con
 * `essalud_empleador = 0` y ninguna huella del aporte real.
 *
 * Este spec recorre las SEIS estrategias con un contexto lo bastante rico como
 * para que cada una emita todos sus conceptos, y exige que:
 *   - todo concepto de un régimen CERTIFICADO esté declarado en el mapper;
 *   - todo régimen que emita conceptos que el mapper no conoce esté BLOQUEADO
 *     por la guardia de certificación, de modo que nunca alcance el mapper.
 *
 * Falla en CI el día que alguien agregue un concepto sin cerrar el ciclo. Es la
 * red primaria; `ConceptoNoMapeadoError` es el backstop en tiempo de ejecución.
 */
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { CalculadoraRegimen } from '../dominio/regimenes/calculadora-regimen.interface';
import { calcularBoleta } from '../dominio/motor/calcular-boleta';
import { ParametrosLegales } from '../dominio/parametros/parametros-legales';
import { stubParametrosRegimenes } from '../dominio/parametros/parametros-legales.stub';
import {
  AfiliacionPensionaria,
  DetalleTareo,
  EntradaCalculo,
  RegimenLaboral,
  SistemaPensionario,
  TramoIR,
} from '../dominio/tipos';
import {
  CLAVES_MAPEADAS,
  CLAVES_NO_LOAD_BEARING,
  detectarConceptosNoMapeados,
  extraerMontosLoadBearing,
} from './mapear-resultado-detalle';
import {
  asegurarRegimenCertificado,
  RegimenNoCertificadoError,
} from './guardia-certificacion';

const params: ParametrosLegales = {
  rmv: () => 1130,
  uit: () => 5500,
  asignacionFamiliar: () => 113,
  essaludTasa: () => 0.09,
  essaludMinimo: () => 101.7,
  sisMicroempresa: () => 15,
  tramosIR: (): TramoIR[] => [{ hasta: Infinity, tasa: 0.08 }],
  sctrSalud: () => 0,
  sctrPension: () => 0,
  vidaLeyTasa: () => 0,
  senatiTasa: () => 0,
  ...stubParametrosRegimenes,
};

const AFILIACION_AFP: AfiliacionPensionaria = {
  sistema: SistemaPensionario.AFP,
  tasas: { aporteObligatorio: 0.1, primaSeguro: 0.0174, comisionFlujo: 0.016 },
};

/**
 * Tareo de 30 días con horas extras y jornada nocturna: fuerza al orquestador a
 * emitir haber, HE 25 %, HE 35 % y bonificación nocturna.
 */
const TAREO: DetalleTareo[] = Array.from({ length: 30 }, (_, i) => ({
  fecha: new Date(Date.UTC(2026, 6, i + 1)),
  horasTrabajadas: 8,
  horasExtras: 3,
  esNocturno: true,
  esFeriado: false,
  asistio: true,
}));

/**
 * Entrada deliberadamente MAXIMALISTA: julio (mes de gratificación), con hijos
 * (asignación familiar) y con días de vacaciones gozados. Cada régimen emite
 * todo lo que sabe emitir.
 */
function entradaMaximalista(
  regimen: RegimenLaboral,
  overrides: Partial<EntradaCalculo> = {},
): EntradaCalculo {
  return {
    regimenLaboral: regimen,
    remuneracionBasica: 3000,
    tieneHijos: true,
    periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-31') },
    tareo: TAREO,
    afiliacion: AFILIACION_AFP,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    trabajadorDomiciliado: true,
    devengados: {
      mesesGratificacion: 6,
      mesesCts: 6,
      diasCts: 180,
      sextoGratificacion: 500,
      diasVacaciones: 5,
      diasNoLaboradosSemestre: 0,
      remuneracionCierreSemestre: 3000,
      fechaCierreSemestre: new Date('2026-06-30'),
      promedioVariablesGratificacion: 0,
    },
    ...overrides,
  };
}

/** Todas las claves que un régimen sabe emitir, en todas sus variantes. */
function clavesEmitidas(regimen: RegimenLaboral): Set<string> {
  const calculadora: CalculadoraRegimen = crearCalculadoraRegimen(regimen);
  const variantes: EntradaCalculo[] = [entradaMaximalista(regimen)];

  // El agrario tiene DOS modos excluyentes: separado y prorrateo. Hay que
  // recorrer los dos o la mitad de sus conceptos quedaría sin enumerar.
  if (regimen === RegimenLaboral.AGRARIO) {
    variantes.push(
      entradaMaximalista(regimen, { usaProrrateoAgrario: true }),
      // Mes de depósito de CTS, por si el modo separado varía con el mes.
      entradaMaximalista(regimen, {
        periodo: { anio: 2026, mes: 5, fecha: new Date('2026-05-31') },
      }),
    );
  } else {
    variantes.push(
      entradaMaximalista(regimen, {
        periodo: { anio: 2026, mes: 5, fecha: new Date('2026-05-31') },
      }),
      entradaMaximalista(regimen, {
        periodo: { anio: 2026, mes: 11, fecha: new Date('2026-11-30') },
      }),
    );
  }

  const claves = new Set<string>();
  for (const entrada of variantes) {
    for (const concepto of calcularBoleta(entrada, calculadora, params)
      .conceptos) {
      claves.add(concepto.clave);
    }
  }
  return claves;
}

const TODOS_LOS_REGIMENES = Object.values(RegimenLaboral);

const conocidaPorElMapper = (clave: string): boolean =>
  CLAVES_MAPEADAS.has(clave) || CLAVES_NO_LOAD_BEARING.has(clave);

const estaCertificado = (regimen: RegimenLaboral): boolean =>
  crearCalculadoraRegimen(regimen).certificadoProduccion;

describe('conceptos del dominio vs. claves conocidas por el mapper', () => {
  it('el set de régimenes recorridos es el completo (6 régimenes peruanos)', () => {
    expect(TODOS_LOS_REGIMENES).toHaveLength(6);
  });

  describe.each(TODOS_LOS_REGIMENES)('%s', (regimen) => {
    it('o todos sus conceptos son conocidos por el mapper, o la guardia lo bloquea', () => {
      const desconocidas = [...clavesEmitidas(regimen)].filter(
        (c) => !conocidaPorElMapper(c),
      );

      if (desconocidas.length === 0) return;

      // Emite conceptos sin columna → NO puede estar certificado, o la planilla
      // los perdería en silencio.
      const calculadora = crearCalculadoraRegimen(regimen);
      expect(calculadora.certificadoProduccion).toBe(false);
      expect(() => asegurarRegimenCertificado(calculadora)).toThrow(
        RegimenNoCertificadoError,
      );
    });

    it('si está CERTIFICADO, su boleta completa pasa por el mapper sin excepción', () => {
      if (!estaCertificado(regimen)) return;

      const calculadora = crearCalculadoraRegimen(regimen);
      const boleta = calcularBoleta(
        entradaMaximalista(regimen),
        calculadora,
        params,
      );

      expect(detectarConceptosNoMapeados(boleta)).toEqual([]);
      expect(() => extraerMontosLoadBearing(boleta)).not.toThrow();
    });
  });

  it('MICROEMPRESA emite sis_microempresa, que no tiene columna: por eso está bloqueada', () => {
    const claves = clavesEmitidas(RegimenLaboral.MICROEMPRESA);
    expect(claves).toContain('sis_microempresa');
    expect(conocidaPorElMapper('sis_microempresa')).toBe(false);
    expect(estaCertificado(RegimenLaboral.MICROEMPRESA)).toBe(false);
  });

  it('los régimenes certificados hoy son GENERAL, PEQUENA_EMPRESA y HOGAR', () => {
    const certificados = TODOS_LOS_REGIMENES.filter(estaCertificado).sort();
    expect(certificados).toEqual([
      RegimenLaboral.GENERAL,
      RegimenLaboral.HOGAR,
      RegimenLaboral.PEQUENA_EMPRESA,
    ]);
  });
});
