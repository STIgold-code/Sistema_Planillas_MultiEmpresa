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
 * Años hacia adelante aceptados para fechas de plazos (contratos).
 */
export const MAX_YEARS_AHEAD = 10;

/**
 * Año máximo admitido para una fecha de contrato. Se calcula en cada llamada
 * para que la ventana acompañe al paso del tiempo sin tocar código.
 */
export function anioMaximoContrato(): number {
  return new Date().getFullYear() + MAX_YEARS_AHEAD;
}

/**
 * Regla única de rango de años para fechas de contrato (inicio, fin y cese).
 * La comparten el decorador de DTO y la importación por Excel para que ambas
 * puertas de entrada rechacen exactamente lo mismo.
 */
export function esAnioContratoValido(anio: number): boolean {
  return (
    Number.isInteger(anio) &&
    anio >= MIN_OPERATIONAL_YEAR &&
    anio <= anioMaximoContrato()
  );
}

/**
 * Variante de IsRealisticDate para fechas de PLAZOS (ej. inicio/fin de
 * contrato): el año debe ser razonable pero SÍ se permiten fechas futuras.
 * Bloquea dedazos tipo "2926-10-18" que @IsDateString acepta como válidos.
 */
export function IsRealisticFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRealisticFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || value.length < 4) return false;
          const yearStr = value.slice(0, 4);
          if (!/^\d{4}$/.test(yearStr)) return false;
          return esAnioContratoValido(parseInt(yearStr, 10));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} tiene un año fuera del rango permitido. El año debe estar entre ${MIN_OPERATIONAL_YEAR} y ${anioMaximoContrato()}.`;
        },
      },
    });
  };
}

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
