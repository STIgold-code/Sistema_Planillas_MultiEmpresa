import { type KeyboardEvent } from 'react';

/**
 * Handlers de teclado para inputs `type="number"`. Aunque el tipo numérico
 * rechaza la mayoría de letras, el navegador igual permite `e`, `E`, `+` y `-`
 * (notación científica y signos). Estos handlers bloquean esas teclas para
 * forzar una entrada estrictamente numérica.
 */

/** Entrada de enteros: bloquea notación científica, signos y separadores decimales. */
export const bloquearTeclasEntero = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
};

/** Entrada de decimales: bloquea notación científica y signos (permite el punto). */
export const bloquearTeclasDecimal = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};
