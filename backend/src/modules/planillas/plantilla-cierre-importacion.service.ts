import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EstadoEmpleado, EstadoPrestamo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import {
  leerPlantillaCierre,
  type DeudaLeida,
  type PlantillaLeida,
} from './plantilla-cierre-lectura';

/**
 * Importación de la plantilla de cierre: convierte el Excel que devuelve el
 * área contable en cambios reales sobre los préstamos y adelantos del período.
 *
 * Flujo en dos pasos, igual que la importación del tareo:
 *  1. PREVIEW — se lee el archivo y se dice exactamente qué se va a hacer, sin
 *     tocar nada. Los errores bloquean; las advertencias solo avisan.
 *  2. APLICAR — se vuelve a subir el ARCHIVO (no el plan) y se recalcula todo
 *     antes de escribir, para que nadie aplique algo distinto de lo revisado.
 *
 * QUÉ APLICA Y QUÉ NO — y por qué:
 *
 *  - Confirmar el saldo real de un préstamo vigente, ajustar su cuota y darlo
 *    por cerrado: SÍ. Es el grueso del trabajo del cierre y no necesita ningún
 *    documento nuevo, solo la confirmación de quien lleva la cuenta.
 *
 *  - Dar de ALTA un préstamo o adelanto nuevo: NO. Descontar de la
 *    remuneración exige la autorización escrita del trabajador
 *    (`PrestamosService.create` la exige y con razón). Una fila de Excel no es
 *    un convenio firmado. Esas filas salen listadas como pendientes de alta,
 *    con todos sus datos, para cargarlas desde el módulo de préstamos
 *    adjuntando el documento.
 *
 *  - Vacaciones, otros conceptos y planilla informal: se INFORMAN. Las
 *    vacaciones se registran marcando los días en el tareo; los otros
 *    conceptos se editan sobre la planilla ya calculada; la planilla informal
 *    no tiene modelo en el sistema.
 *
 * Todo lo que sí se aplica pasa por `PrestamosService`, que es el dueño de las
 * reglas (movimiento de AJUSTE por cada cambio de saldo, motivo obligatorio al
 * renegociar una cuota, cierre automático al llegar a cero). Este servicio
 * decide QUÉ cambiar; nunca CÓMO.
 */

export type AccionDeuda =
  | 'ACTUALIZAR'
  | 'CERRAR'
  | 'ALTA_PENDIENTE'
  | 'SIN_CAMBIOS';

export interface CambioDeuda {
  fila: number;
  documento: string;
  trabajador: string;
  tipo: 'PRESTAMO' | 'ADELANTO_SUELDO';
  accion: AccionDeuda;
  /** Qué va a pasar, en una línea legible para quien aprueba. */
  detalle: string;
  prestamo_id: number | null;
  /** Saldo real (préstamos) o monto a descontar (adelantos). */
  monto: number;
  /** Cuota nueva. NULL cuando la cuota no cambia: no se toca lo pactado. */
  cuota: number | null;
  /** Monto original corregido. NULL cuando no se escribió o no cambia. */
  monto_total: number | null;
  /** PAGADO cuando la deuda se saldó; CANCELADO cuando se dio de baja. */
  cierra_como: EstadoPrestamo | null;
}

export interface CambioEmpleado {
  fila: number;
  documento: string;
  trabajador: string;
  detalle: string;
  empleado_id: number;
}

/** Bloque de filas que se leyeron pero que esta importación no carga. */
export interface BloqueInformativo {
  concepto: string;
  filas: number;
  motivo: string;
  detalle: string[];
}

export interface PreviewCierre {
  periodo: { anio: number; mes: number };
  deudas: CambioDeuda[];
  empleados: CambioEmpleado[];
  soloInformativo: BloqueInformativo[];
  politica: PlantillaLeida['politica'];
  errores: PlantillaLeida['errores'];
  advertencias: PlantillaLeida['advertencias'];
  /** False si hay errores: aplicar queda bloqueado. */
  aplicable: boolean;
  resumen: string;
}

export interface ResultadoCierre {
  saldos_confirmados: number;
  deudas_cerradas: number;
  empleados_reactivados: number;
  /** Altas que quedaron pendientes por falta del convenio firmado. */
  altas_pendientes: number;
}

/** Marcas de la columna "¿Continúa vigente?" que cierran el préstamo. */
const CIERRE_PRESTAMO: Record<string, EstadoPrestamo> = {
  'No - ya pagado': EstadoPrestamo.PAGADO,
  'No - cancelado': EstadoPrestamo.CANCELADO,
};
/** Naturalezas de adelanto que NO generan un cargo en este período. */
const ADELANTO_YA_DESCONTADO = 'Ya se descontó antes';

/** Dos importes se consideran iguales si difieren en menos de medio céntimo. */
const MISMO_IMPORTE = (a: number, b: number): boolean =>
  Math.abs(a - b) < 0.005;

const soles = (valor: number): string => `S/ ${valor.toFixed(2)}`;

/** Monto total de una deuda vigente, ya normalizado a numero o null. */
const montoDe = (deuda: { monto_total: unknown }): number | null =>
  deuda.monto_total === null || deuda.monto_total === undefined
    ? null
    : Number(deuda.monto_total);

@Injectable()
export class PlantillaCierreImportacionService {
  private readonly logger = new Logger(PlantillaCierreImportacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prestamos: PrestamosService,
  ) {}

  /** Lee el archivo y arma el plan de cambios sin escribir nada. */
  async preview(
    empresaId: number,
    anio: number,
    mes: number,
    buffer: Buffer,
  ): Promise<PreviewCierre> {
    const leida = await leerPlantillaCierre(buffer);
    const contexto = await this.cargarContexto(empresaId);

    const deudas = this.planificarDeudas(leida, contexto);
    const empleados = this.planificarReingresos(leida, contexto);
    const soloInformativo = this.armarInformativo(leida, deudas);

    const aplicable = leida.errores.length === 0;
    const aAplicar = deudas.filter(
      (d) => d.accion === 'ACTUALIZAR' || d.accion === 'CERRAR',
    ).length;

    return {
      periodo: { anio, mes },
      deudas,
      empleados,
      soloInformativo,
      politica: leida.politica,
      errores: leida.errores,
      advertencias: leida.advertencias,
      aplicable,
      resumen: aplicable
        ? `${aAplicar} cambio(s) en préstamos y adelantos, ${empleados.length} trabajador(es) a reactivar.`
        : `${leida.errores.length} error(es) impiden aplicar la importación.`,
    };
  }

  /**
   * Aplica el plan.
   *
   * NO va en una transacción única a propósito: cada fila pasa por
   * `PrestamosService`, que abre la suya para dejar el movimiento de auditoría
   * junto al cambio. Cada préstamo es independiente del resto, y la operación
   * es idempotente —volver a subir el mismo archivo omite lo ya aplicado—, así
   * que una interrupción se resuelve reintentando, no revirtiendo.
   */
  async aplicar(
    empresaId: number,
    anio: number,
    mes: number,
    buffer: Buffer,
    usuarioId?: number,
  ): Promise<ResultadoCierre & { preview: PreviewCierre }> {
    const preview = await this.preview(empresaId, anio, mes, buffer);
    if (!preview.aplicable) {
      throw new BadRequestException(
        `La plantilla tiene ${preview.errores.length} error(es) y no se puede aplicar. Corrígelos y vuelve a subirla.`,
      );
    }

    const periodo = `${String(mes).padStart(2, '0')}-${anio}`;
    const origen = `Confirmado en la plantilla de cierre ${periodo}.`;
    const resultado: ResultadoCierre = {
      saldos_confirmados: 0,
      deudas_cerradas: 0,
      empleados_reactivados: 0,
      altas_pendientes: preview.deudas.filter(
        (d) => d.accion === 'ALTA_PENDIENTE',
      ).length,
    };

    for (const cambio of preview.deudas) {
      if (!cambio.prestamo_id) continue;

      if (cambio.accion === 'CERRAR') {
        if (cambio.cierra_como === EstadoPrestamo.CANCELADO) {
          await this.prestamos.cancelar(cambio.prestamo_id, empresaId, {
            motivo: origen,
          });
        } else {
          // Saldo cero: `update` lo marca PAGADO y deja el movimiento.
          await this.prestamos.update(cambio.prestamo_id, empresaId, {
            saldo: 0,
            ...(cambio.monto_total !== null
              ? { monto_total: cambio.monto_total }
              : {}),
            observaciones: origen,
          });
        }
        resultado.deudas_cerradas++;
        continue;
      }

      if (cambio.accion === 'ACTUALIZAR') {
        await this.prestamos.update(cambio.prestamo_id, empresaId, {
          saldo: cambio.monto,
          ...(cambio.monto_total !== null
            ? { monto_total: cambio.monto_total }
            : {}),
          ...(cambio.tipo === 'PRESTAMO' && cambio.cuota !== null
            ? { cuota_mensual: cambio.cuota }
            : {}),
          observaciones: origen,
        });
        resultado.saldos_confirmados++;
      }
    }

    for (const e of preview.empleados) {
      await this.prisma.empleado.update({
        where: { id: e.empleado_id },
        data: { estado: EstadoEmpleado.ACTIVO, fecha_cese: null },
      });
      resultado.empleados_reactivados++;
    }

    this.logger.log(
      `Plantilla de cierre ${periodo} aplicada por usuario ${usuarioId ?? '—'}: ${JSON.stringify(resultado)}`,
    );

    return { ...resultado, preview };
  }

  // ---------------------------------------------------------------------------
  // Contexto y planificación
  // ---------------------------------------------------------------------------

  /**
   * Empleados de la empresa indexados por documento y sus deudas vigentes.
   * Es lo que permite distinguir una confirmación de saldo de un alta nueva.
   */
  private async cargarContexto(empresaId: number) {
    const [empleados, prestamos] = await Promise.all([
      this.prisma.empleado.findMany({
        where: { empresa_id: empresaId },
        select: {
          id: true,
          numero_documento: true,
          apellido_paterno: true,
          apellido_materno: true,
          nombres: true,
          estado: true,
          fecha_cese: true,
        },
      }),
      this.prisma.prestamo.findMany({
        where: { empresa_id: empresaId, estado: EstadoPrestamo.ACTIVO },
        select: {
          id: true,
          empleado_id: true,
          tipo: true,
          cuota_mensual: true,
          saldo: true,
          monto_total: true,
        },
        orderBy: [{ empleado_id: 'asc' }, { fecha_otorgado: 'asc' }],
      }),
    ]);

    const porDocumento = new Map(empleados.map((e) => [e.numero_documento, e]));
    // Un trabajador puede tener varias deudas del mismo tipo: se emparejan por
    // orden de aparición, el mismo con el que se generó la plantilla.
    const vigentes = new Map<string, typeof prestamos>();
    for (const p of prestamos) {
      const clave = `${p.empleado_id}|${p.tipo}`;
      vigentes.set(clave, [...(vigentes.get(clave) ?? []), p]);
    }
    return { porDocumento, vigentes };
  }

  private nombre(e: {
    apellido_paterno: string;
    apellido_materno: string;
    nombres: string;
  }): string {
    return `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`;
  }

  private planificarDeudas(
    leida: PlantillaLeida,
    contexto: Awaited<ReturnType<typeof this.cargarContexto>>,
  ): CambioDeuda[] {
    const cambios: CambioDeuda[] = [];
    // Cuántas deudas vigentes de cada empleado/tipo ya se emparejaron.
    const emparejadas = new Map<string, number>();

    for (const fila of [...leida.prestamos, ...leida.adelantos]) {
      const hoja = fila.tipo === 'PRESTAMO' ? 'Prestamos' : 'Adelantos';
      const empleado = contexto.porDocumento.get(fila.documento);
      if (!empleado) {
        leida.errores.push({
          hoja,
          fila: fila.fila,
          motivo: `El documento ${fila.documento} no pertenece a esta empresa.`,
        });
        continue;
      }

      const clave = `${empleado.id}|${fila.tipo}`;
      const candidatas = contexto.vigentes.get(clave) ?? [];
      const indice = emparejadas.get(clave) ?? 0;
      const vigente = candidatas[indice] ?? null;
      if (vigente) emparejadas.set(clave, indice + 1);

      // Una celda en cero o vacia no es un monto otorgado: no se escribio.
      const montoEscrito =
        fila.monto_total !== null && fila.monto_total > 0
          ? fila.monto_total
          : null;

      const base = {
        fila: fila.fila,
        documento: fila.documento,
        trabajador: this.nombre(empleado),
        tipo: fila.tipo,
        prestamo_id: vigente?.id ?? null,
        monto: fila.monto_confirmado,
        // Se resuelven en `planificarActualizacion`; en un alta van los de la fila.
        cuota: vigente ? null : fila.cuota,
        monto_total: vigente ? null : montoEscrito,
      };

      const cierre = this.resolverCierre(fila);
      if (cierre) {
        // Cerrar no es motivo para tirar el monto otorgado: si la contadora lo
        // escribio, queda registrado igual. Ignorarlo en silencio seria perder
        // el unico dato que el sistema nunca tuvo.
        const montoAlCerrar =
          vigente && montoEscrito !== null && montoEscrito !== montoDe(vigente)
            ? montoEscrito
            : null;
        cambios.push({
          ...base,
          monto_total: montoAlCerrar,
          accion: vigente ? 'CERRAR' : 'SIN_CAMBIOS',
          cierra_como: vigente ? cierre.estado : null,
          detalle: vigente
            ? `Se cierra como ${cierre.estado}: ${cierre.motivo}`
            : `Marcado como cerrado y no hay deuda vigente en el sistema: no se hace nada.`,
        });
        continue;
      }

      if (!vigente) {
        cambios.push({
          ...base,
          accion: 'ALTA_PENDIENTE',
          cierra_como: null,
          detalle:
            fila.tipo === 'PRESTAMO'
              ? `Préstamo nuevo por ${soles(fila.monto_confirmado)} (cuota ${soles(fila.cuota ?? 0)}). Cárgalo desde Préstamos adjuntando el convenio firmado: descontar de la remuneración exige autorización escrita.`
              : `Adelanto nuevo por ${soles(fila.monto_confirmado)}. Cárgalo desde Préstamos adjuntando el vale de entrega firmado.`,
        });
        continue;
      }

      const problemaTope = this.validarContraMontoTotal(
        fila,
        montoEscrito,
        vigente,
      );
      if (problemaTope) {
        leida.errores.push({ hoja, fila: fila.fila, motivo: problemaTope });
        continue;
      }

      cambios.push(
        this.planificarActualizacion(base, fila, montoEscrito, vigente),
      );
    }

    return cambios;
  }

  /** Traduce la decisión escrita en la plantilla a un cierre de deuda. */
  private resolverCierre(
    fila: DeudaLeida,
  ): { estado: EstadoPrestamo; motivo: string } | null {
    if (fila.tipo === 'ADELANTO_SUELDO') {
      if (fila.decision === ADELANTO_YA_DESCONTADO) {
        return {
          estado: EstadoPrestamo.PAGADO,
          motivo: 'el adelanto ya se descontó en un período anterior.',
        };
      }
      // Un adelanto confirmado en cero no descuenta nada: es una deuda saldada.
      if (fila.monto_confirmado === 0) {
        return {
          estado: EstadoPrestamo.PAGADO,
          motivo: 'el monto confirmado quedó en cero.',
        };
      }
      return null;
    }

    const estado = CIERRE_PRESTAMO[fila.decision];
    return estado ? { estado, motivo: fila.decision.toLowerCase() } : null;
  }

  /**
   * `PrestamosService.update` rechaza un saldo mayor al monto total pactado.
   * Vale más decirlo en el preview que dejar que reviente al aplicar.
   */
  private validarContraMontoTotal(
    fila: DeudaLeida,
    montoEscrito: number | null,
    vigente: { monto_total: unknown },
  ): string | null {
    // Si la plantilla trae el monto corregido, la vara es ESE monto.
    const total = montoEscrito ?? montoDe(vigente);
    if (total === null || fila.monto_confirmado <= total) return null;
    return `El saldo confirmado (${soles(fila.monto_confirmado)}) supera el monto total pactado (${soles(total)}). Corrige uno de los dos antes de importar.`;
  }

  private planificarActualizacion(
    base: Omit<CambioDeuda, 'accion' | 'detalle' | 'cierra_como'>,
    fila: DeudaLeida,
    montoEscrito: number | null,
    vigente: { saldo: unknown; cuota_mensual: unknown; monto_total: unknown },
  ): CambioDeuda {
    const saldoActual =
      vigente.saldo === null || vigente.saldo === undefined
        ? null
        : Number(vigente.saldo);
    const cuotaActual = Number(vigente.cuota_mensual ?? 0);
    const montoActual = montoDe(vigente);
    // El monto otorgado solo viaja si la contadora escribio uno distinto.
    const montoTotal =
      montoEscrito !== null &&
      (montoActual === null || !MISMO_IMPORTE(montoEscrito, montoActual))
        ? montoEscrito
        : null;

    const cambiaCuota =
      fila.tipo === 'PRESTAMO' &&
      fila.cuota !== null &&
      !MISMO_IMPORTE(cuotaActual, fila.cuota);
    // Renegociar la cuota es cambiar lo pactado con el trabajador: solo viaja
    // si el contador de verdad escribió otra.
    const cuota = cambiaCuota ? fila.cuota : null;

    // Sin saldo, la cuota sale todos los meses para siempre. Definirlo es el
    // cambio más valioso de todo el cierre, y hay que decirlo así.
    if (saldoActual === null) {
      return {
        ...base,
        cuota,
        monto_total: montoTotal,
        accion: 'ACTUALIZAR',
        cierra_como: null,
        detalle:
          `Hoy es un descuento recurrente SIN saldo: la cuota de ${soles(cuotaActual)} sale cada mes indefinidamente. ` +
          `Se le define un saldo de ${soles(fila.monto_confirmado)}, y el préstamo se cerrará solo al llegar a cero.` +
          (montoTotal !== null
            ? ` Se registra el monto otorgado: ${soles(montoTotal)}.`
            : '') +
          (cambiaCuota ? ` La cuota pasa a ${soles(fila.cuota ?? 0)}.` : ''),
      };
    }

    const cambiaSaldo = !MISMO_IMPORTE(saldoActual, fila.monto_confirmado);
    if (!cambiaSaldo && !cambiaCuota && montoTotal === null) {
      return {
        ...base,
        cuota,
        monto_total: null,
        accion: 'SIN_CAMBIOS',
        cierra_como: null,
        detalle: 'El saldo confirmado coincide con el del sistema.',
      };
    }

    const partes: string[] = [];
    if (cambiaSaldo) {
      partes.push(
        `saldo ${soles(saldoActual)} → ${soles(fila.monto_confirmado)}`,
      );
    }
    if (cambiaCuota) {
      partes.push(`cuota ${soles(cuotaActual)} → ${soles(fila.cuota ?? 0)}`);
    }
    if (montoTotal !== null) {
      partes.push(
        montoActual === null
          ? `monto otorgado ${soles(montoTotal)}`
          : `monto otorgado ${soles(montoActual)} → ${soles(montoTotal)}`,
      );
    }
    return {
      ...base,
      cuota,
      monto_total: montoTotal,
      accion: 'ACTUALIZAR',
      cierra_como: null,
      detalle: partes.join(', '),
    };
  }

  private planificarReingresos(
    leida: PlantillaLeida,
    contexto: Awaited<ReturnType<typeof this.cargarContexto>>,
  ): CambioEmpleado[] {
    const cambios: CambioEmpleado[] = [];
    for (const r of leida.reingresos) {
      const empleado = contexto.porDocumento.get(r.documento);
      if (!empleado) continue;
      if (!r.marca.startsWith('Reingres')) continue;
      if (empleado.estado === EstadoEmpleado.ACTIVO) continue;

      const desde =
        empleado.fecha_cese?.toISOString().slice(0, 10) ?? 'sin fecha';
      cambios.push({
        fila: r.fila,
        documento: r.documento,
        trabajador: this.nombre(empleado),
        empleado_id: empleado.id,
        detalle: `Figura ${empleado.estado} desde ${desde}: se reactiva para que entre a la planilla.${r.observacion ? ` ${r.observacion}` : ''}`,
      });
    }
    return cambios;
  }

  /** Lo que se leyó pero esta importación no carga, con su motivo. */
  private armarInformativo(
    leida: PlantillaLeida,
    deudas: CambioDeuda[],
  ): BloqueInformativo[] {
    const altas = deudas.filter((d) => d.accion === 'ALTA_PENDIENTE');

    return [
      {
        concepto: 'Préstamos y adelantos nuevos',
        filas: altas.length,
        motivo:
          'Descontar de la remuneración exige autorización escrita del trabajador: hay que darlos de alta desde Préstamos adjuntando el documento firmado.',
        detalle: altas.map(
          (a) => `Fila ${a.fila} · ${a.trabajador} · ${a.detalle}`,
        ),
      },
      {
        concepto: 'Vacaciones y descansos médicos',
        filas: leida.vacaciones.length,
        motivo:
          'Se registran marcando los días en el tareo del período, no como cargo de planilla.',
        detalle: leida.vacaciones.map(
          (v) => `Fila ${v.fila} · ${v.documento} · ${v.detalle}`,
        ),
      },
      {
        concepto: 'Otros ingresos y descuentos',
        filas: leida.otrosConceptos.length,
        motivo:
          'Se cargan sobre la planilla ya calculada, en el detalle de cada trabajador.',
        detalle: leida.otrosConceptos.map(
          (o) => `Fila ${o.fila} · ${o.documento} · ${o.detalle}`,
        ),
      },
      {
        concepto: 'Planilla informal',
        filas: leida.planillaInformal.length,
        motivo:
          'Esas personas no están dadas de alta en el sistema: hay que crearlas antes.',
        detalle: leida.planillaInformal.map(
          (i) => `Fila ${i.fila} · ${i.documento} · ${i.detalle}`,
        ),
      },
    ].filter((b) => b.filas > 0);
  }
}
