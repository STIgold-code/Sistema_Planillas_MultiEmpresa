import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { chromium, Browser } from 'playwright';
import { obtenerMensajeError } from '../../../common/utils/error.util';

export interface SbsConsultaResult {
  afp: string | null;
  cuspp: string | null;
  regimen_pensionario_id: number | null;
  mensaje: string;
}

@Injectable()
export class SbsConsultaService {
  private readonly logger = new Logger(SbsConsultaService.name);
  private readonly SBS_URL =
    'https://servicios.sbs.gob.pe/reportesituacionprevisional/afil_consulta.aspx';

  // Selectores de la página SBS (ASP.NET WebForms)
  private readonly SELECTORS = {
    tipoDocumento: '#ctl00_ContentPlaceHolder1_cboTipoDoc',
    numeroDocumento: '#ctl00_ContentPlaceHolder1_txtNumeroDoc',
    apellidoPaterno: '#ctl00_ContentPlaceHolder1_txtAp_pat',
    apellidoMaterno: '#ctl00_ContentPlaceHolder1_txtAp_mat',
    primerNombre: '#ctl00_ContentPlaceHolder1_txtPri_nom',
    segundoNombre: '#ctl00_ContentPlaceHolder1_txtSeg_nom',
    botonBuscar: '#ctl00_ContentPlaceHolder1_btnBuscar',
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Consulta la página de SBS para obtener AFP y CUSPP
   */
  async consultarAfiliacion(
    tipoDocumento: string,
    numeroDocumento: string,
    apellidoPaterno: string,
    apellidoMaterno: string,
    nombres: string,
  ): Promise<SbsConsultaResult> {
    // Validar tipo de documento
    const tiposPermitidos = ['DNI', 'CE'];
    if (!tiposPermitidos.includes(tipoDocumento)) {
      throw new BadRequestException(
        `Tipo de documento no soportado para consulta SBS. Usar: ${tiposPermitidos.join(', ')}`,
      );
    }

    // Validar formato DNI (8 dígitos)
    if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(numeroDocumento)) {
      throw new BadRequestException('DNI debe tener exactamente 8 dígitos');
    }

    let browser: Browser | null = null;

    // Log de todos los datos recibidos
    const nombresParts = nombres.trim().split(/\s+/);
    const primerNombreLog = nombresParts[0] || '';
    const segundoNombreLog = nombresParts.slice(1).join(' ') || '';
    this.logger.log('=== DATOS PARA CONSULTA SBS ===');
    this.logger.log(`Tipo Doc: ${tipoDocumento}`);
    this.logger.log(`Num Doc: ${numeroDocumento}`);
    this.logger.log(
      `Ap. Paterno (normalizado): "${this.normalizarTexto(apellidoPaterno)}"`,
    );
    this.logger.log(
      `Ap. Materno (normalizado): "${this.normalizarTexto(apellidoMaterno)}"`,
    );
    this.logger.log(`Nombres (original): "${nombres}"`);
    this.logger.log(
      `Primer Nombre (normalizado): "${this.normalizarTexto(primerNombreLog)}"`,
    );
    this.logger.log(
      `Segundo Nombre (normalizado): "${this.normalizarTexto(segundoNombreLog)}"`,
    );
    this.logger.log('================================');

    try {
      this.logger.log(
        `Consultando SBS para ${tipoDocumento}: ${numeroDocumento}`,
      );

      // Verificar IP pública del servidor
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = (await ipResponse.json()) as { ip?: string };
        this.logger.log(`IP pública del servidor: ${ipData.ip ?? ''}`);
      } catch {
        this.logger.warn('No se pudo obtener IP pública');
      }

      // Lanzar navegador local con opciones anti-detección
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
      this.logger.debug('✓ Navegador local iniciado');

      this.logger.debug('Creando contexto del navegador...');
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'es-PE',
        timezoneId: 'America/Lima',
        viewport: { width: 1280, height: 720 },
      });
      this.logger.debug('✓ Contexto creado');

      const page = await context.newPage();
      this.logger.debug('✓ Página creada');

      // Navegar a la página
      this.logger.debug(`Navegando a: ${this.SBS_URL}`);
      await page.goto(this.SBS_URL, {
        waitUntil: 'networkidle',
        timeout: 60000, // Aumentado a 60s para conexiones lentas
      });
      this.logger.debug('✓ Página SBS cargada');

      // Esperar que cargue el formulario
      this.logger.debug('Esperando formulario...');
      await page.waitForSelector(this.SELECTORS.tipoDocumento, {
        timeout: 15000,
      });
      this.logger.debug('✓ Formulario visible');

      // Seleccionar tipo de documento (00=DNI, 01=CE)
      this.logger.debug('Llenando formulario...');
      const tipoDocValue = tipoDocumento === 'DNI' ? '00' : '01';
      await page.selectOption(this.SELECTORS.tipoDocumento, tipoDocValue);

      // Llenar campos del formulario
      await page.fill(this.SELECTORS.numeroDocumento, numeroDocumento);
      await page.fill(
        this.SELECTORS.apellidoPaterno,
        this.normalizarTexto(apellidoPaterno),
      );
      await page.fill(
        this.SELECTORS.apellidoMaterno,
        this.normalizarTexto(apellidoMaterno),
      );

      // Extraer primer y segundo nombre
      const nombresParts = nombres.trim().split(/\s+/);
      const primerNombre = nombresParts[0] || '';
      const segundoNombre = nombresParts.slice(1).join(' ') || '';

      await page.fill(
        this.SELECTORS.primerNombre,
        this.normalizarTexto(primerNombre),
      );

      // Llenar segundo nombre si existe
      if (segundoNombre) {
        await page.fill(
          this.SELECTORS.segundoNombre,
          this.normalizarTexto(segundoNombre),
        );
      }
      this.logger.debug('✓ Formulario llenado');

      // Enviar formulario con click en el botón (más natural)
      this.logger.debug('Enviando consulta...');
      await page.waitForTimeout(500 + Math.random() * 500);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
        page.click(this.SELECTORS.botonBuscar),
      ]);
      this.logger.debug('✓ Respuesta recibida');

      // Esperar un poco más para asegurar que el DOM esté listo
      await page.waitForTimeout(3000);

      // Debug: verificar URL actual y contenido
      const currentUrl = page.url();
      this.logger.debug(`URL actual: ${currentUrl}`);

      // HTML para debug
      const html = await page.content();
      const htmlClean = html.replace(/\s+/g, ' ').trim();
      this.logger.debug(
        `HTML SBS (primeros 3000 chars): ${htmlClean.substring(0, 3000)}`,
      );

      // Extraer resultado directamente (sin esperar texto específico)
      this.logger.debug('Extrayendo resultado...');
      const bodyText = await page.evaluate(
        () => document.body?.innerText || '',
      );

      // Buscar mensajes de error o captcha
      const hasError =
        bodyText.toLowerCase().includes('error') ||
        bodyText.toLowerCase().includes('captcha') ||
        bodyText.toLowerCase().includes('validación');
      this.logger.debug(`¿Tiene error/captcha?: ${hasError}`);

      // Log para debugging - ver qué devuelve la SBS (sin saltos de línea)
      const bodyTextClean = bodyText.replace(/\s+/g, ' ').trim();
      this.logger.debug(
        `Contenido SBS (primeros 2000 chars): ${bodyTextClean.substring(0, 2000)}`,
      );

      // Verificar si no se encontraron resultados
      if (bodyText.includes('No se encontraron resultados')) {
        this.logger.log('SBS: No se encontraron resultados');
        return {
          afp: null,
          cuspp: null,
          regimen_pensionario_id: null,
          mensaje: 'No se encontraron resultados en SBS',
        };
      }

      // Buscar AFP: "Actualmente se encuentra afiliado(a) a XXXX"
      let afp: string | null = null;
      const afpMatch = bodyText.match(/afiliado\(a\)\s+a\s+(\w+)/i);
      if (afpMatch) {
        afp = afpMatch[1].trim();
      }

      // Buscar CUSPP: "Su Código de Identificación del SPP es XXXX"
      let cuspp: string | null = null;
      const cusppMatch = bodyText.match(
        /Código de Identificación del SPP es\s+([A-Z0-9]+)/i,
      );
      if (cusppMatch) {
        cuspp = cusppMatch[1].trim();
      }

      this.logger.log(`Resultado SBS: AFP=${afp}, CUSPP=${cuspp}`);

      // Si no encontramos nada
      if (!afp && !cuspp) {
        return {
          afp: null,
          cuspp: null,
          regimen_pensionario_id: null,
          mensaje: 'No se pudo extraer información de la respuesta SBS',
        };
      }

      // Mapear AFP a regimen_pensionario_id
      let regimenId: number | null = null;
      if (afp) {
        const afpNormalizado = this.normalizarNombreAfp(afp);
        const regimen = await this.prisma.regimenPensionario.findFirst({
          where: {
            nombre: { contains: afpNormalizado, mode: 'insensitive' },
            activo: true,
          },
        });
        regimenId = regimen?.id ?? null;

        if (!regimenId) {
          this.logger.warn(`AFP "${afp}" no encontrada en BD`);
        }
      }

      return {
        afp,
        cuspp,
        regimen_pensionario_id: regimenId,
        mensaje: 'Consulta exitosa',
      };
    } catch (error: unknown) {
      const mensaje = obtenerMensajeError(error);
      this.logger.error(`Error consultando SBS: ${mensaje}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Error genérico de conexión/timeout
      return {
        afp: null,
        cuspp: null,
        regimen_pensionario_id: null,
        mensaje: `Error al consultar SBS: ${mensaje}`,
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Normaliza texto para la consulta SBS (sin tildes, mayúsculas)
   */
  private normalizarTexto(texto: string): string {
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
      .trim();
  }

  /**
   * Normaliza el nombre de AFP para buscar en BD
   * Ej: "AFP Integra" -> "INTEGRA"
   */
  private normalizarNombreAfp(afpRaw: string): string {
    return afpRaw
      .toUpperCase()
      .replace(/^AFP\s*/i, '')
      .replace(/\s+/g, '')
      .trim();
  }
}
