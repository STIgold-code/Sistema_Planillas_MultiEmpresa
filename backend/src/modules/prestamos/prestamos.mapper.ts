import { TipoPrestamo } from '@prisma/client';
import {
  PrestamoVigente,
  TipoPrestamoCalculo,
} from './dominio/descuentos-prestamos';

/** Fila Prisma mínima que el dominio necesita para descontar y amortizar. */
export interface FilaPrestamoActivo {
  id: number;
  empleado_id: number;
  tipo: TipoPrestamo;
  cuota_mensual: unknown;
  saldo: unknown;
}

const aNumero = (valor: unknown): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

/**
 * Borde de aplicación: traduce la fila Prisma (Decimal) a las primitivas del
 * dominio. El enum Prisma comparte miembros con el tipo del dominio (mapeo 1:1
 * por contrato de diseño), por eso el `tipo` es directamente asignable.
 */
export function aPrestamoVigente(fila: FilaPrestamoActivo): PrestamoVigente {
  return {
    id: fila.id,
    empleadoId: fila.empleado_id,
    tipo: fila.tipo as TipoPrestamoCalculo,
    cuotaMensual: aNumero(fila.cuota_mensual),
    saldo:
      fila.saldo === null || fila.saldo === undefined
        ? null
        : aNumero(fila.saldo),
  };
}

/** Campos que se leen de `prestamos` para alimentar el cálculo. */
export const SELECT_PRESTAMO_ACTIVO = {
  id: true,
  empleado_id: true,
  tipo: true,
  cuota_mensual: true,
  saldo: true,
} as const;

/**
 * Orden determinista de amortización: el préstamo más antiguo se paga primero.
 * Fija el reparto cuando un trabajador tiene varias deudas del mismo tipo.
 */
export const ORDEN_AMORTIZACION = [
  { fecha_otorgado: 'asc' },
  { id: 'asc' },
] as const;
