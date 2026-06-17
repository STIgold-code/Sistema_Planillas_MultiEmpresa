import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Rango aceptable de años para fechas operativas del sistema.
 * Bloquea data corrupta tipo "0026-01-29" que se cuela cuando un
 * operador tipea "26-01-29" en un input date sin validación.
 */
export const MIN_OPERATIONAL_YEAR = 2020;
export const MAX_OPERATIONAL_YEAR = 2100;

/**
 * Valida que un string fecha (ISO YYYY-MM-DD o ISO completo) tenga un año
 * dentro del rango operativo. Diseñado para complementar @IsDateString,
 * que solo valida sintaxis pero acepta "0026-01-29" como válido.
 */
export function IsRealisticDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRealisticDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || value.length < 4) return false;
          const yearStr = value.slice(0, 4);
          if (!/^\d{4}$/.test(yearStr)) return false;
          const year = parseInt(yearStr, 10);
          if (year < MIN_OPERATIONAL_YEAR || year > MAX_OPERATIONAL_YEAR) {
            return false;
          }
          // No se aceptan fechas futuras: compras, entregas y requerimientos son
          // de hoy o del pasado. Comparación de strings ISO en hora de Perú.
          const hoyPeru = new Date().toLocaleDateString('en-CA', {
            timeZone: 'America/Lima',
          });
          return value.slice(0, 10) <= hoyPeru;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} no puede ser una fecha futura ni estar fuera del rango ${MIN_OPERATIONAL_YEAR}-${MAX_OPERATIONAL_YEAR}`;
        },
      },
    });
  };
}
