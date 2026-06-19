import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium, Browser } from 'playwright';

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
  async onModuleInit() {
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
      await this.procesarHTML(html);
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

  private async procesarHTML(html: string) {
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

    let encontrados = 0;

    for (const item of afpMap) {
      const match = html.match(item.regex);

      if (match) {
        // Normalizar decimales (coma a punto)
        const flujo = parseFloat(match[1].replace(',', '.'));
        const saldo = parseFloat(match[2].replace(',', '.'));
        const seguro = parseFloat(match[3].replace(',', '.'));

        await this.prisma.regimenPensionario.upsert({
          where: { nombre: item.nombre },
          update: {
            comision_flujo: flujo,
            comision_saldo: saldo,
            prima_seguro: seguro,
            aporte_obligatorio: 10.0,
            updated_at: new Date(),
          },
          create: {
            nombre: item.nombre,
            tipo: 'AFP',
            comision_flujo: flujo,
            comision_saldo: saldo,
            prima_seguro: seguro,
            aporte_obligatorio: 10.0,
            remuneracion_maxima: 12209.11, // Valor inicial referencial
            activo: true,
          },
        });

        this.logger.log(
          `✅ ${item.nombre} actualizada: Flujo=${flujo}%, Saldo=${saldo}%, Seguro=${seguro}%`,
        );
        encontrados++;
      } else {
        this.logger.warn(`⚠️ No se encontraron datos para ${item.nombre}`);
      }
    }

    // Asegurar ONP
    await this.prisma.regimenPensionario.upsert({
      where: { nombre: 'ONP' },
      update: {
        aporte_obligatorio: 13.0,
        comision_flujo: 0,
        comision_saldo: 0,
        prima_seguro: 0,
      },
      create: {
        nombre: 'ONP',
        tipo: 'ONP',
        aporte_obligatorio: 13.0,
        comision_flujo: 0,
        comision_saldo: 0,
        prima_seguro: 0,
        remuneracion_maxima: 0,
      },
    });
    this.logger.log('✅ ONP verificada (13%)');

    if (encontrados === 0) {
      this.logger.warn(
        '⚠️ ALERTA: No se extrajo ninguna AFP. Posible cambio en la estructura HTML de la SBS.',
      );
    }
  }
}
