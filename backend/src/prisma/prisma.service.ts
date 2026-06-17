import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma, AccionAuditoria } from '@prisma/client';
import { RequestContextService } from '../common/context/request-context.service';

/**
 * Tablas que NO deben auditarse para evitar loops infinitos o ruido
 */
const TABLAS_EXCLUIDAS = new Set([
  'auditoria', // Evitar loop infinito
  'refresh_tokens', // Tokens de sesión, muy frecuente
  'sesiones', // Si existiera
]);

/**
 * Tablas que solo auditan CREATE y DELETE (no UPDATE)
 * Para reducir ruido en tablas con updates muy frecuentes
 */
const TABLAS_SIN_UPDATE_AUDIT = new Set([
  'tareo_marcaciones', // Muchos updates de sincronización
  // Inventario de alto volumen: solo se audita CREATE/DELETE para evitar el
  // findUnique extra por cada update en operaciones masivas de stock/entregas.
  'movimientos_inventario',
  'items_inventario',
]);

/**
 * Mapeo de nombre de modelo Prisma a nombre de tabla en BD
 */
const MODELO_A_TABLA: Record<string, string> = {
  Auditoria: 'auditoria',
  RefreshToken: 'refresh_tokens',
  User: 'users',
  Empresa: 'empresas',
  Role: 'roles',
  Empleado: 'empleados',
  Contrato: 'contratos',
  Vacante: 'vacantes',
  Postulante: 'postulantes',
  PostulanteEvaluacion: 'postulante_evaluaciones',
  PostulanteDocumento: 'postulante_documentos',
  Vacacion: 'vacaciones',
  PlanillaCabecera: 'planilla_cabecera',
  PlanillaDetalle: 'planilla_detalle',
  TareoMarcacion: 'tareo_marcaciones',
  TareoPeriodo: 'tareo_periodos',
  EmpleadoDocumento: 'empleado_documentos',
  EmpleadoMovimiento: 'empleado_movimientos',
  SolicitudCese: 'solicitudes_cese',
  ItemInventario: 'items_inventario',
  MovimientoInventario: 'movimientos_inventario',
  // Agregar más mapeos según sea necesario
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Ampliar los timeouts de transacción interactiva: el default de 5s aborta
    // las operaciones masivas grandes de inventario (entregas/movimientos).
    super({
      transactionOptions: {
        timeout: 30000,
        maxWait: 10000,
      },
    });
    this.setupAuditMiddleware();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Configura el middleware de auditoría que captura todas las operaciones
   * CREATE, UPDATE y DELETE en la base de datos.
   */
  private setupAuditMiddleware() {
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      const { model, action } = params;

      // Si no hay modelo, continuar sin auditar
      if (!model) {
        return next(params);
      }

      // Obtener nombre de tabla
      const tabla = MODELO_A_TABLA[model] || model.toLowerCase();

      // Verificar si debe auditarse
      if (TABLAS_EXCLUIDAS.has(tabla)) {
        return next(params);
      }

      // Solo auditar operaciones de escritura
      const accionesAuditables = [
        'create',
        'update',
        'delete',
        'createMany',
        'updateMany',
        'deleteMany',
      ];
      if (!accionesAuditables.includes(action)) {
        return next(params);
      }

      // Verificar si es UPDATE en tabla sin auditoría de updates
      if (TABLAS_SIN_UPDATE_AUDIT.has(tabla) && action.startsWith('update')) {
        return next(params);
      }

      // Obtener contexto del request (usuario, empresa, etc.)
      const context = RequestContextService.getContext();

      // Capturar datos anteriores para UPDATE y DELETE
      let datosAnteriores: Record<string, any> | null = null;
      let registroId: number | null = null;

      if ((action === 'update' || action === 'delete') && params.args?.where) {
        try {
          const modelDelegate = (this as any)[
            model.charAt(0).toLowerCase() + model.slice(1)
          ];
          if (modelDelegate?.findUnique) {
            const registro = await modelDelegate.findUnique({
              where: params.args.where,
            });
            if (registro) {
              datosAnteriores = this.sanitizarDatos(registro);
              registroId = registro.id ?? null;
            }
          }
        } catch (error) {
          // Si falla la captura de datos anteriores, continuar sin ellos
          this.logger.debug(
            `No se pudieron capturar datos anteriores: ${error.message}`,
          );
        }
      }

      // Ejecutar la operación original
      const resultado = await next(params);

      // Registrar auditoría de forma asíncrona (no bloquea la respuesta)
      setImmediate(() => {
        this.registrarAuditoria({
          action,
          tabla,
          resultado,
          datosAnteriores,
          registroId,
          datosNuevos: params.args?.data,
          context,
        }).catch((error) => {
          this.logger.error(`Error registrando auditoría: ${error.message}`);
        });
      });

      return resultado;
    });
  }

  /**
   * Registra la auditoría en la base de datos
   */
  private async registrarAuditoria(params: {
    action: string;
    tabla: string;
    resultado: any;
    datosAnteriores: Record<string, any> | null;
    registroId: number | null;
    datosNuevos: Record<string, any> | undefined;
    context: ReturnType<typeof RequestContextService.getContext>;
  }) {
    const {
      action,
      tabla,
      resultado,
      datosAnteriores,
      registroId,
      datosNuevos,
      context,
    } = params;

    // Determinar acción de auditoría
    let accionAuditoria: AccionAuditoria;
    switch (action) {
      case 'create':
      case 'createMany':
        accionAuditoria = 'CREATE';
        break;
      case 'update':
      case 'updateMany':
        accionAuditoria = 'UPDATE';
        break;
      case 'delete':
      case 'deleteMany':
        accionAuditoria = 'DELETE';
        break;
      default:
        return; // No auditar otras acciones
    }

    // Determinar ID del registro
    let finalRegistroId = registroId;
    if (!finalRegistroId && resultado) {
      if (Array.isArray(resultado)) {
        finalRegistroId = resultado[0]?.id ?? null;
      } else {
        finalRegistroId = resultado.id ?? null;
      }
    }

    // Preparar datos nuevos (sanitizados)
    const datosNuevosSanitizados = resultado
      ? this.sanitizarDatos(resultado)
      : datosNuevos
        ? this.sanitizarDatos(datosNuevos)
        : null;

    // Agregar metadatos del request
    const metadatos: Record<string, any> = {};
    if (context?.ipAddress) metadatos._ip = context.ipAddress;
    if (context?.method) metadatos._method = context.method;
    if (context?.path) metadatos._path = context.path;

    const datosNuevosConMeta = datosNuevosSanitizados
      ? { ...datosNuevosSanitizados, ...metadatos }
      : Object.keys(metadatos).length > 0
        ? metadatos
        : null;

    try {
      // Usar $queryRawUnsafe para evitar que el middleware se llame recursivamente
      await this.$executeRaw`
        INSERT INTO auditoria (
          usuario_id,
          usuario_email,
          empresa_id,
          accion,
          tabla_afectada,
          registro_id,
          datos_anteriores,
          datos_nuevos,
          created_at
        ) VALUES (
          ${context?.userId ?? null},
          ${context?.userEmail ?? null},
          ${context?.empresaId ?? null},
          ${accionAuditoria}::"AccionAuditoria",
          ${tabla},
          ${finalRegistroId},
          ${datosAnteriores ? JSON.stringify(datosAnteriores) : null}::jsonb,
          ${datosNuevosConMeta ? JSON.stringify(datosNuevosConMeta) : null}::jsonb,
          NOW()
        )
      `;
    } catch (error) {
      this.logger.error(`Error insertando auditoría: ${error.message}`);
    }
  }

  /**
   * Sanitiza datos para auditoría:
   * - Elimina campos sensibles (passwords, tokens)
   * - Convierte Dates a strings
   * - Limita profundidad de objetos anidados
   */
  private sanitizarDatos(
    datos: any,
    profundidad = 0,
  ): Record<string, any> | null {
    if (!datos || typeof datos !== 'object') {
      return null;
    }

    // Limitar profundidad para evitar objetos muy grandes
    if (profundidad > 2) {
      return { _truncado: true };
    }

    const camposSensibles = new Set([
      'password',
      'password_hash',
      'token',
      'refresh_token',
      'accessToken',
      'refreshToken',
      'secret',
      'api_key',
      'apiKey',
    ]);

    const resultado: Record<string, any> = {};

    for (const [key, value] of Object.entries(datos)) {
      // Omitir campos sensibles
      if (camposSensibles.has(key.toLowerCase())) {
        resultado[key] = '[REDACTED]';
        continue;
      }

      // Convertir Dates
      if (value instanceof Date) {
        resultado[key] = value.toISOString();
        continue;
      }

      // Manejar arrays
      if (Array.isArray(value)) {
        if (value.length > 10) {
          resultado[key] = `[Array de ${value.length} elementos]`;
        } else {
          resultado[key] = value.map((item) =>
            typeof item === 'object'
              ? this.sanitizarDatos(item, profundidad + 1)
              : item,
          );
        }
        continue;
      }

      // Manejar objetos anidados
      if (value && typeof value === 'object') {
        resultado[key] = this.sanitizarDatos(value, profundidad + 1);
        continue;
      }

      // Valores primitivos
      resultado[key] = value;
    }

    return resultado;
  }
}
