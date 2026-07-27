/**
 * Prisma-backed adapter for the `ParametrosLegales` port.
 *
 * Reemplaza al adapter in-memory en producción: resuelve las claves ESCALARES
 * desde las filas de la tabla `parametros_legales` (clave/valor/vigencia),
 * versionadas por fecha. Las claves ESTRUCTURADAS (tramosIR, agrario,
 * construccionCivil) no caben en una sola columna Decimal, así que se DELEGAN a
 * un `ParametrosLegales` de respaldo (el in-memory) hasta que aterrice un schema
 * estructurado. El puerto del dominio queda intacto (DIP): el dominio sigue
 * viendo solo la interfaz `ParametrosLegales`.
 *
 * Capa: infraestructura (adapter). Recibe un snapshot ya cargado de filas — la
 * consulta Prisma vive en el borde de aplicación (servicio), de modo que esta
 * clase es pura y testeable sin BD.
 */
import {
  ParametrosLegales,
  ParametrosAgrario,
  ParametrosConstruccionCivil,
  ParametroLegalNoVigenteError,
} from '../dominio/parametros/parametros-legales';
import { CategoriaConstruccion, TramoIR } from '../dominio/tipos';

/** Fila de la tabla `parametros_legales` (valor escalar versionado). */
export interface FilaParametroLegal {
  clave: string;
  /** Decimal de Prisma o número ya convertido. */
  valor: unknown;
  vigencia_desde: Date;
  vigencia_hasta: Date | null;
}

/** Claves escalares que el adapter Prisma resuelve desde la tabla. */
export type ClaveEscalar =
  | 'rmv'
  | 'uit'
  | 'asignacionFamiliar'
  | 'essaludTasa'
  | 'essaludMinimo'
  | 'sisMicroempresa'
  | 'sctrSalud'
  | 'sctrPension'
  | 'vidaLeyTasa'
  | 'senatiTasa';

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

export class ParametrosLegalesPrisma implements ParametrosLegales {
  private readonly porClave = new Map<string, FilaParametroLegal[]>();
  private readonly porClaveEmpresa = new Map<string, FilaParametroLegal[]>();

  /**
   * @param filas Snapshot de `parametros_legales` (valores NACIONALES).
   * @param fallback Adapter de respaldo para las claves estructuradas.
   * @param filasEmpresa Overrides de la EMPRESA activa (`parametros_empresa`),
   *   versionados por vigencia igual que los nacionales. Resolución en cascada:
   *   valor propio vigente → nacional vigente → fallback (donde aplique).
   */
  constructor(
    filas: FilaParametroLegal[],
    private readonly fallback: ParametrosLegales,
    filasEmpresa: FilaParametroLegal[] = [],
  ) {
    for (const fila of filas) {
      const lista = this.porClave.get(fila.clave) ?? [];
      lista.push(fila);
      this.porClave.set(fila.clave, lista);
    }
    for (const fila of filasEmpresa) {
      const lista = this.porClaveEmpresa.get(fila.clave) ?? [];
      lista.push(fila);
      this.porClaveEmpresa.set(fila.clave, lista);
    }
  }

  rmv(fecha: Date): number {
    return this.escalar('rmv', fecha);
  }
  uit(fecha: Date): number {
    return this.escalar('uit', fecha);
  }
  asignacionFamiliar(fecha: Date): number {
    return this.escalar('asignacionFamiliar', fecha);
  }
  essaludTasa(fecha: Date): number {
    return this.escalar('essaludTasa', fecha);
  }
  essaludMinimo(fecha: Date): number {
    return this.escalar('essaludMinimo', fecha);
  }
  sisMicroempresa(fecha: Date): number {
    return this.escalar('sisMicroempresa', fecha);
  }
  sctrSalud(fecha: Date): number {
    return this.escalar('sctrSalud', fecha);
  }
  sctrPension(fecha: Date): number {
    return this.escalar('sctrPension', fecha);
  }

  // Tasas seedeadas recientemente: si la tabla del entorno todavía no tiene la
  // fila (seed no corrido), caen al fallback in-memory en vez de reventar.
  vidaLeyTasa(fecha: Date): number {
    return this.escalarConFallback('vidaLeyTasa', fecha, () =>
      this.fallback.vidaLeyTasa(fecha),
    );
  }
  senatiTasa(fecha: Date): number {
    return this.escalarConFallback('senatiTasa', fecha, () =>
      this.fallback.senatiTasa(fecha),
    );
  }

  // --- Claves estructuradas: delegadas al fallback (DIP intacto) ---
  tramosIR(fecha: Date): TramoIR[] {
    return this.fallback.tramosIR(fecha);
  }
  agrario(fecha: Date): ParametrosAgrario {
    return this.fallback.agrario(fecha);
  }
  construccionCivil(
    fecha: Date,
    categoria: CategoriaConstruccion,
  ): ParametrosConstruccionCivil {
    return this.fallback.construccionCivil(fecha, categoria);
  }

  private escalarConFallback(
    clave: ClaveEscalar,
    fecha: Date,
    respaldo: () => number,
  ): number {
    try {
      return this.escalar(clave, fecha);
    } catch (error) {
      if (error instanceof ParametroLegalNoVigenteError) return respaldo();
      throw error;
    }
  }

  /** Fila vigente para la fecha en una lista (vigencia_desde más reciente gana). */
  private vigenteEn(
    filas: FilaParametroLegal[],
    fecha: Date,
  ): FilaParametroLegal | undefined {
    return filas
      .filter(
        (f) =>
          fecha >= f.vigencia_desde &&
          (f.vigencia_hasta === null || fecha <= f.vigencia_hasta),
      )
      .sort(
        (a, b) => b.vigencia_desde.getTime() - a.vigencia_desde.getTime(),
      )[0];
  }

  private escalar(clave: ClaveEscalar, fecha: Date): number {
    // Cascada: override de la EMPRESA vigente → valor NACIONAL vigente.
    // Un override fuera de su vigencia (póliza vencida) NO aplica: cae al
    // nacional; y recalcular un período pasado usa la fila que regía entonces.
    const propio = this.vigenteEn(this.porClaveEmpresa.get(clave) ?? [], fecha);
    if (propio) return aNumero(propio.valor);

    // Resolución determinista ante vigencias solapadas: la fila vigente con
    // `vigencia_desde` MÁS RECIENTE gana. Empate imposible: la BD impone
    // UNIQUE(clave, vigencia_desde).
    const vigente = this.vigenteEn(this.porClave.get(clave) ?? [], fecha);
    if (!vigente) throw new ParametroLegalNoVigenteError(clave, fecha);
    return aNumero(vigente.valor);
  }
}
