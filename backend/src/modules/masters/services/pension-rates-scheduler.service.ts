import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium, Browser } from 'playwright';
import {
  AfpParseada,
  detectarPrimasIncoherentes,
  validarTasasPension,
} from './validar-tasas-pension';

/** Aporte obligatorio al fondo en el SPP: 10 % (D.L. 25897 art. 30). */
const APORTE_OBLIGATORIO_AFP = 10.0;
/** Aporte obligatorio del Sistema Nacional de Pensiones: 13 % (D.L. 19990). */
const APORTE_OBLIGATORIO_ONP = 13.0;

/** Las tres tasas que el parser lee por AFP, ya normalizadas a número. */
interface TasasAfpScrapeadas {
  nombre: string;
  flujo: number;
  saldo: number;
  seguro: number;
}

/** Recuento de lo que hizo una corrida del job. Se loguea al final. */
export interface ResumenActualizacionTasas {
  /** AFP cuyas tasas pasaron la validación y se escribieron. */
  actualizadas: number;
  /** AFP cuyas tasas llegaron fuera de rango: NO se escribieron. */
  rechazadas: number;
  /** AFP que el parser no encontró en el HTML. */
  sinDatos: number;
  /** AFP válidas cuya escritura falló (error de base de datos). */
  errores: number;
}

@Injectable()
export class PensionRatesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PensionRatesSchedulerService.name);
  private readonly SBS_URL =
    'https://www.sbs.gob.pe/app/spp/empleadores/comisiones_spp/paginas/comision_prima.aspx';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Se ejecuta automáticamente cuando el módulo se inicia (al levantar el servidor).
   */
  onModuleInit(): void {
    this.logger.log('Iniciando servicio de tasas de pensiones (Playwright)...');
    // Ejecutamos de forma asíncrona para no bloquear el inicio del servidor
    this.actualizarTasas().catch((err) =>
      this.logger.error('Error en actualización inicial', err),
    );
  }

  /**
   * Se ejecuta automáticamente todos los días a las 03:00 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log('Ejecutando actualización programada de tasas AFP...');
    await this.actualizarTasas();
  }

  /**
   * Lógica principal: Navegación Real (Headless Chrome) -> Parse -> Update DB
   */
  async actualizarTasas() {
    let browser: Browser | null = null;
    try {
      this.logger.debug('Iniciando navegador oculto...');

      // 1. Lanzar navegador local con opciones anti-detección
      this.logger.debug('Lanzando navegador local...');
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      this.logger.debug(`Navegando a: ${this.SBS_URL}`);

      // 2. Ir a la página y esperar que cargue la red
      await page.goto(this.SBS_URL, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // 3. Extraer el HTML renderizado
      const html = await page.content();
      this.logger.debug(
        `HTML obtenido. Tamaño: ${html.length} caracteres. Procesando...`,
      );

      // 4. Procesar HTML con Regex
      await this.procesarHtmlTasas(html);
    } catch (error) {
      this.logger.error('Error crítico en scraping con Playwright:', error);
    } finally {
      // 5. Cerrar navegador siempre (Limpieza de recursos)
      if (browser) {
        await browser.close();
        this.logger.debug('Navegador cerrado correctamente.');
      }
    }
  }

  /**
   * OJO — `comision_mixta_flujo` (componente sobre flujo de la comisión mixta,
   * Ley 29903) NO se scrapea todavía: este parser lee tres números por AFP y la
   * tabla de la SBS publica cuatro. La columna se carga por migración con las
   * tasas vigentes y se corrige a mano desde maestros; el upsert de abajo no la
   * toca, así que el valor cargado NUNCA se pisa con un scraping parcial. Al
   * ampliar las regex hay que incorporarla aquí para cerrar el ciclo.
   *
   * DOS GUARDIAS, ninguna tasa llega a la base sin pasar por las dos:
   *   1. RANGO por AFP (`validarTasasPension`): el parser lee posiciones, no
   *      encabezados, así que un reordenamiento de columnas en la web de la SBS
   *      produce números perfectamente parseables pero absurdos. Ya ocurrió:
   *      500.5 % de comisión sobre flujo en la fila de PRIMA.
   *   2. COHERENCIA entre AFP (`detectarPrimasIncoherentes`): la prima del
   *      seguro es única para todo el SPP, así que una fila con prima distinta
   *      de sus pares está leyendo otra columna. Atrapa lo que el rango no
   *      puede: en el mismo incidente la prima quedó en 1.25 —un valor
   *      plausible por sí solo— mientras las otras tres reportaban 1.74.
   *
   * Una AFP rechazada NO interrumpe el lote: las demás se actualizan igual,
   * porque el objetivo es maximizar los datos buenos, no abortar por un dato malo.
   *
   * Público a propósito: permite testear el lote completo sin levantar Chromium.
   */
  async procesarHtmlTasas(html: string): Promise<ResumenActualizacionTasas> {
    const afpMap = [
      {
        nombre: 'HABITAT',
        regex:
          /HABITAT[\s\S]{1,500}?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)/i,
      },
      {
        nombre: 'INTEGRA',
        regex:
          /INTEGRA[\s\S]{1,500}?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)/i,
      },
      {
        nombre: 'PRIMA',
        regex:
          /PRIMA[\s\S]{1,500}?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)/i,
      },
      {
        nombre: 'PROFUTURO',
        regex:
          /PROFUTURO[\s\S]{1,500}?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)[\s\S]*?(\d+[.,]\d+)/i,
      },
    ];

    const resumen: ResumenActualizacionTasas = {
      actualizadas: 0,
      rechazadas: 0,
      sinDatos: 0,
      errores: 0,
    };

    // 1. PARSEAR. Ninguna escritura todavía: el chequeo de coherencia necesita
    //    ver el lote completo antes de decidir qué fila es la que miente.
    const parseadas: TasasAfpScrapeadas[] = [];
    for (const item of afpMap) {
      const match = html.match(item.regex);

      if (!match) {
        resumen.sinDatos++;
        this.logger.warn(`No se encontraron datos para ${item.nombre}`);
        continue;
      }

      // Normalizar decimales (coma a punto)
      parseadas.push({
        nombre: item.nombre,
        flujo: parseFloat(match[1].replace(',', '.')),
        saldo: parseFloat(match[2].replace(',', '.')),
        seguro: parseFloat(match[3].replace(',', '.')),
      });
    }

    // 2. VALIDAR RANGO por AFP y COHERENCIA entre AFP. Los motivos se acumulan
    //    por nombre para que el log del rechazo diga todo de una vez.
    const paraValidar: AfpParseada[] = parseadas.map((a) => ({
      nombre: a.nombre,
      tasas: {
        aporteObligatorio: APORTE_OBLIGATORIO_AFP,
        comisionFlujo: a.flujo,
        comisionSaldo: a.saldo,
        primaSeguro: a.seguro,
      },
    }));

    const motivosPorAfp = new Map<string, string[]>();
    for (const afp of paraValidar) {
      const validacion = validarTasasPension(afp.tasas);
      if (!validacion.valido) {
        motivosPorAfp.set(afp.nombre, [...validacion.motivos]);
      }
    }
    for (const incoherente of detectarPrimasIncoherentes(paraValidar)) {
      const previos = motivosPorAfp.get(incoherente.nombre) ?? [];
      motivosPorAfp.set(incoherente.nombre, [...previos, incoherente.motivo]);
    }

    // 3. PERSISTIR solo lo que sobrevivió. La escritura de cada AFP se aísla:
    //    ni un rechazo ni un fallo de base de datos en una impiden que las
    //    demás se actualicen.
    for (const afp of parseadas) {
      const motivos = motivosPorAfp.get(afp.nombre);
      if (motivos) {
        resumen.rechazadas++;
        this.logger.error(
          `Tasas RECHAZADAS para ${afp.nombre}: ${motivos.join(' | ')}. ` +
            `No se escribió nada: la fila conserva su valor anterior. ` +
            `Revisar si la SBS cambió la estructura de la tabla.`,
        );
        continue;
      }

      const { flujo, saldo, seguro } = afp;

      try {
        await this.prisma.regimenPensionario.upsert({
          where: { nombre: afp.nombre },
          update: {
            comision_flujo: flujo,
            comision_saldo: saldo,
            prima_seguro: seguro,
            aporte_obligatorio: APORTE_OBLIGATORIO_AFP,
            updated_at: new Date(),
          },
          create: {
            nombre: afp.nombre,
            tipo: 'AFP',
            comision_flujo: flujo,
            comision_saldo: saldo,
            prima_seguro: seguro,
            aporte_obligatorio: APORTE_OBLIGATORIO_AFP,
            remuneracion_maxima: 12209.11, // Valor inicial referencial
            activo: true,
          },
        });

        resumen.actualizadas++;
        this.logger.log(
          `${afp.nombre} actualizada: Flujo=${flujo}%, Saldo=${saldo}%, Seguro=${seguro}%`,
        );
      } catch (error) {
        resumen.errores++;
        this.logger.error(
          `Error escribiendo las tasas de ${afp.nombre}; el lote continúa`,
          error,
        );
      }
    }

    // Asegurar ONP. No pasa por `validarTasasPension` a propósito: sus valores
    // no se scrapean, son constantes de ley (13 % de aporte y CERO comisión), y
    // la regla "la comisión sobre flujo es mayor que cero" solo aplica a las AFP.
    try {
      await this.prisma.regimenPensionario.upsert({
        where: { nombre: 'ONP' },
        update: {
          aporte_obligatorio: APORTE_OBLIGATORIO_ONP,
          comision_flujo: 0,
          comision_saldo: 0,
          prima_seguro: 0,
        },
        create: {
          nombre: 'ONP',
          tipo: 'ONP',
          aporte_obligatorio: APORTE_OBLIGATORIO_ONP,
          comision_flujo: 0,
          comision_saldo: 0,
          prima_seguro: 0,
          remuneracion_maxima: 0,
        },
      });
      this.logger.log(`ONP verificada (${APORTE_OBLIGATORIO_ONP}%)`);
    } catch (error) {
      resumen.errores++;
      this.logger.error('Error verificando la fila de ONP', error);
    }

    this.logger.log(
      `Resumen actualización de tasas AFP: ${resumen.actualizadas} actualizadas, ` +
        `${resumen.rechazadas} rechazadas por validación, ${resumen.sinDatos} sin datos en el HTML, ` +
        `${resumen.errores} con error de escritura.`,
    );

    if (resumen.actualizadas === 0) {
      this.logger.error(
        'ALERTA: ninguna AFP se actualizó en esta corrida. Posible cambio en la ' +
          'estructura HTML de la SBS o tasas fuera de rango de forma sistemática.',
      );
    }

    return resumen;
  }
}
