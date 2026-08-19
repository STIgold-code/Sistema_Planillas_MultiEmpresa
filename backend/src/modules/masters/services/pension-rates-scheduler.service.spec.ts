/**
 * Tests del LOTE del scraper de tasas de la SBS.
 *
 * Blindan la propiedad que faltaba y que costó una fila corrupta en producción:
 * una tasa fuera de rango NO se escribe, se loguea como error y el resto del
 * lote sigue actualizándose. Se ejercita `procesarHtmlTasas` con HTML sintético,
 * sin navegador ni base de datos reales.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PensionRatesSchedulerService } from './pension-rates-scheduler.service';
import { PrismaService } from '../../../prisma/prisma.service';

interface ArgsUpsert {
  where: { nombre: string };
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}

function construirServicio() {
  const upsert = jest.fn<Promise<unknown>, [ArgsUpsert]>(() =>
    Promise.resolve({}),
  );
  const prisma = {
    regimenPensionario: { upsert },
  } as unknown as PrismaService;

  const servicio = new PensionRatesSchedulerService(
    prisma,
    {} as ConfigService,
  );

  return { servicio, upsert };
}

/** Fila de la tabla de la SBS: nombre + comisión flujo, comisión saldo, prima. */
const fila = (nombre: string, flujo: string, saldo: string, prima: string) =>
  `<tr><td>${nombre}</td><td>${flujo}</td><td>${saldo}</td><td>${prima}</td></tr>`;

const HTML_SANO = [
  fila('HABITAT', '1.47', '0.71', '1.74'),
  fila('INTEGRA', '1.55', '0.61', '1.74'),
  fila('PRIMA', '1.60', '0.72', '1.74'),
  fila('PROFUTURO', '1.69', '0.77', '1.74'),
].join('');

/** El mismo HTML con la fila de PRIMA corrida, tal como llegó en producción. */
const HTML_PRIMA_CORRUPTA = [
  fila('HABITAT', '1.47', '0.71', '1.74'),
  fila('INTEGRA', '1.55', '0.61', '1.74'),
  fila('PRIMA', '500.50', '0.72', '1.25'),
  fila('PROFUTURO', '1.69', '0.77', '1.74'),
].join('');

/**
 * Solo la PRIMA de una AFP está corrida: cada número, por separado, es
 * plausible. Únicamente el chequeo de coherencia entre filas lo detecta.
 */
const HTML_PRIMA_DISCREPANTE = [
  fila('HABITAT', '1.47', '0.71', '1.74'),
  fila('INTEGRA', '1.55', '0.61', '1.74'),
  fila('PRIMA', '1.60', '0.72', '1.25'),
  fila('PROFUTURO', '1.69', '0.77', '1.74'),
].join('');

const nombresEscritos = (upsert: jest.Mock<Promise<unknown>, [ArgsUpsert]>) =>
  upsert.mock.calls.map(([args]) => args.where.nombre);

describe('PensionRatesSchedulerService.procesarHtmlTasas', () => {
  let logError: jest.SpyInstance;

  /** Concatena el mensaje (primer argumento) de cada llamada a `logger.error`. */
  const mensajesDeError = (): string =>
    (logError.mock.calls as [string][]).map(([mensaje]) => mensaje).join(' ');

  beforeEach(() => {
    // Silenciar el logger de Nest y poder afirmar sobre los rechazos.
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('acepta y escribe las cuatro AFP cuando las tasas son válidas', async () => {
    const { servicio, upsert } = construirServicio();

    const resumen = await servicio.procesarHtmlTasas(HTML_SANO);

    expect(resumen).toEqual({
      actualizadas: 4,
      rechazadas: 0,
      sinDatos: 0,
      errores: 0,
    });
    // Las 4 AFP + la fila de ONP que el job asegura siempre.
    expect(nombresEscritos(upsert)).toEqual([
      'HABITAT',
      'INTEGRA',
      'PRIMA',
      'PROFUTURO',
      'ONP',
    ]);
  });

  it('RECHAZA la AFP con tasas fuera de rango: no la escribe y loguea error', async () => {
    const { servicio, upsert } = construirServicio();

    const resumen = await servicio.procesarHtmlTasas(HTML_PRIMA_CORRUPTA);

    expect(resumen.rechazadas).toBe(1);
    expect(nombresEscritos(upsert)).not.toContain('PRIMA');

    const mensajes = mensajesDeError();
    expect(mensajes).toContain('PRIMA');
    expect(mensajes).toContain('comision_flujo=500.5');
  });

  it('RECHAZA por incoherencia una prima que el rango sí aceptaría', async () => {
    const { servicio, upsert } = construirServicio();

    const resumen = await servicio.procesarHtmlTasas(HTML_PRIMA_DISCREPANTE);

    expect(resumen.rechazadas).toBe(1);
    expect(resumen.actualizadas).toBe(3);
    expect(nombresEscritos(upsert)).not.toContain('PRIMA');
    expect(mensajesDeError()).toContain('discrepa');
  });

  it('un rechazo NO aborta el lote: las demás AFP se actualizan igual', async () => {
    const { servicio, upsert } = construirServicio();

    const resumen = await servicio.procesarHtmlTasas(HTML_PRIMA_CORRUPTA);

    expect(resumen.actualizadas).toBe(3);
    const escritos = nombresEscritos(upsert);
    expect(escritos).toContain('HABITAT');
    expect(escritos).toContain('INTEGRA');
    // PROFUTURO viene DESPUÉS de la AFP rechazada en el recorrido.
    expect(escritos).toContain('PROFUTURO');
    expect(escritos).toContain('ONP');
  });

  it('un fallo de base de datos en una AFP tampoco aborta el lote', async () => {
    const { servicio, upsert } = construirServicio();
    upsert.mockImplementation((args) =>
      args.where.nombre === 'INTEGRA'
        ? Promise.reject(new Error('conexión caída'))
        : Promise.resolve({}),
    );

    const resumen = await servicio.procesarHtmlTasas(HTML_SANO);

    expect(resumen.errores).toBe(1);
    expect(resumen.actualizadas).toBe(3);
    expect(nombresEscritos(upsert)).toContain('PROFUTURO');
  });

  it('escribe la comisión válida sin tocar comision_mixta_flujo', async () => {
    const { servicio, upsert } = construirServicio();

    await servicio.procesarHtmlTasas(HTML_SANO);

    const habitat = upsert.mock.calls.find(
      ([a]) => a.where.nombre === 'HABITAT',
    );
    expect(habitat?.[0].update.comision_flujo).toBe(1.47);
    expect(habitat?.[0].update.prima_seguro).toBe(1.74);
    expect(habitat?.[0].update).not.toHaveProperty('comision_mixta_flujo');
  });

  it('alerta con nivel error cuando el HTML no trae ninguna AFP', async () => {
    const { servicio, upsert } = construirServicio();

    const resumen = await servicio.procesarHtmlTasas('<html>vacío</html>');

    expect(resumen.sinDatos).toBe(4);
    expect(resumen.actualizadas).toBe(0);
    // Solo se escribe la fila de ONP, que no depende del scraping.
    expect(nombresEscritos(upsert)).toEqual(['ONP']);
    expect(logError).toHaveBeenCalled();
  });
});
