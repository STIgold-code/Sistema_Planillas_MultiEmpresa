/**
 * Feature flags del frontend.
 *
 * Lectura centralizada de variables NEXT_PUBLIC_FF_* para no esparcir
 * `process.env` por los componentes. Cada flag es booleano y su default
 * seguro es `false` (oculto) cuando la variable no está definida.
 *
 * Convención espejo del backend (FF_<FLAG>): NEXT_PUBLIC_FF_<FLAG>.
 */

const estaActivo = (valor: string | undefined): boolean => valor === 'true';

export const features = {
  /**
   * Módulo SUCAMEC (control de seguridad privada). Oculto por decisión de
   * producto; se reactiva con NEXT_PUBLIC_FF_SUCAMEC=true.
   */
  sucamec: estaActivo(process.env.NEXT_PUBLIC_FF_SUCAMEC),
} as const;
