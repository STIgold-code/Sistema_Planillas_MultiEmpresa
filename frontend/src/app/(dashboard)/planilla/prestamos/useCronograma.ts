'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Cronograma proyectado por el SERVIDOR.
 *
 * Antes esta proyección vivía replicada en el cliente y divergió: no conocía el
 * día de corte de la empresa, así que un préstamo otorgado después del corte
 * mostraba la primera cuota un mes antes de lo que el motor descuenta — y ese
 * calendario se imprime y se firma. Ahora la regla vive una sola vez, en
 * `backend/.../dominio/cronograma-prestamo.ts`, y el cliente solo la consulta.
 */

export interface FilaCronograma {
  numero: number;
  /** Período de planilla en formato AAAA-MM. */
  periodo: string;
  anio: number;
  mes: number;
  saldoInicial: number;
  cuota: number;
  saldoFinal: number;
}

export interface ProyeccionCronograma {
  filas: FilaCronograma[];
  /** True si se cortó la proyección antes de cancelar el saldo. */
  truncado: boolean;
  totalProgramado: number;
  /** Último período con cuota, en formato AAAA-MM. Null si no hay filas. */
  periodoFinal: string | null;
}

export interface ParametrosCronograma {
  tipo: string;
  /** Null = sin monto definido: no hay nada que proyectar. */
  montoTotal: number | null;
  cuotaMensual: number;
  /** Fecha de otorgamiento en formato AAAA-MM-DD. */
  fechaOtorgado: string;
}

/** El usuario está tipeando montos: se espera a que suelte el teclado. */
const DEBOUNCE_MS = 300;

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function proyectable(p: ParametrosCronograma): boolean {
  return (
    p.montoTotal !== null &&
    p.montoTotal > 0 &&
    p.cuotaMensual > 0 &&
    FECHA_ISO.test(p.fechaOtorgado)
  );
}

/**
 * Pide la proyección al backend cada vez que cambian los parámetros, con
 * debounce. Devuelve null mientras no haya nada proyectable.
 */
export function useCronograma(parametros: ParametrosCronograma): {
  proyeccion: ProyeccionCronograma | null;
  cargando: boolean;
} {
  const [proyeccion, setProyeccion] = useState<ProyeccionCronograma | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  // Descarta respuestas viejas que llegan después de una consulta más nueva.
  const consultaVigente = useRef(0);

  const { tipo, montoTotal, cuotaMensual, fechaOtorgado } = parametros;

  useEffect(() => {
    const numero = ++consultaVigente.current;

    if (!proyectable({ tipo, montoTotal, cuotaMensual, fechaOtorgado })) {
      setProyeccion(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    const temporizador = setTimeout(() => {
      void (async () => {
        try {
          const respuesta = await api.post<ProyeccionCronograma | null>(
            '/prestamos/cronograma',
            {
              tipo,
              monto_total: montoTotal,
              cuota_mensual: cuotaMensual,
              fecha_otorgado: fechaOtorgado,
            },
          );
          if (consultaVigente.current === numero) setProyeccion(respuesta);
        } catch {
          // La proyección es informativa: si falla, no se muestra y listo.
          if (consultaVigente.current === numero) setProyeccion(null);
        } finally {
          if (consultaVigente.current === numero) setCargando(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(temporizador);
  }, [tipo, montoTotal, cuotaMensual, fechaOtorgado]);

  return { proyeccion, cargando };
}

/**
 * Ayudas de captura del formulario. Son aritmética de UI, no reglas del motor:
 * el cronograma que vale es siempre el que devuelve el servidor.
 *
 * El redondeo hacia ARRIBA replica el del backend a propósito: con redondeo
 * normal, 1000 en 3 cuotas da 333.33 y el motor descontaría un cuarto mes de
 * 0.01. Hacia arriba, la deuda cierra en las cuotas pactadas.
 */
export function cuotaDesdeNumeroCuotas(
  montoTotal: number,
  numeroCuotas: number,
): number {
  if (!(montoTotal > 0) || !(numeroCuotas > 0)) return 0;
  return Math.ceil((montoTotal / numeroCuotas) * 100) / 100;
}

/** Cuántas cuotas hacen falta para cancelar el monto con la cuota indicada. */
export function numeroCuotasDesdeCuota(
  montoTotal: number,
  cuotaMensual: number,
): number {
  if (!(montoTotal > 0) || !(cuotaMensual > 0)) return 0;
  const redondear2 = (v: number) => Math.round(v * 100) / 100;
  return Math.ceil(redondear2(montoTotal) / redondear2(cuotaMensual));
}
