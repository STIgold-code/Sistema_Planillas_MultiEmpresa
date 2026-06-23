/**
 * Feature flags del frontend.
 *
 * Lectura centralizada de variables NEXT_PUBLIC_FF_* para no esparcir
 * `process.env` por los componentes. Cada flag es booleano y su default
 * seguro es `false` (oculto) cuando la variable no está definida.
 *
 * Convención espejo del backend (FF_<FLAG>): NEXT_PUBLIC_FF_<FLAG>.
 */

// Helper para futuros flags: const estaActivo = (v?: string) => v === 'true';

// Sin feature flags activos actualmente.
export const features = {} as const;
