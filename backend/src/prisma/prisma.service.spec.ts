import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MODELOS_AUDITORIA_CRITICA, PrismaService } from './prisma.service';

/**
 * Forma privada del servicio que ejercitan estos tests. El middleware de
 * auditoría es interno, pero es justamente donde vive la decisión
 * "síncrono vs. diferido" que hay que blindar.
 */
interface ServicioAuditable {
  procesarMiddlewareAuditoria(
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
  ): Promise<unknown>;
  registrarAuditoria(params: unknown): Promise<void>;
  logger: Logger;
}

/**
 * Instancia el servicio sin ejecutar su constructor: `new PrismaService()`
 * levantaría un PrismaClient real y estos tests solo validan la ruta de
 * decisión del middleware, sin tocar la base de datos.
 */
function crearServicioSinConectar(): ServicioAuditable {
  const servicio = Object.create(PrismaService.prototype) as ServicioAuditable;
  servicio.logger = new Logger('PrismaServiceSpec');
  return servicio;
}

function paramsDeCreacion(model: string): Prisma.MiddlewareParams {
  return {
    model: model as Prisma.ModelName,
    action: 'create',
    args: { data: { nombre: 'prueba' } },
    dataPath: [],
    runInTransaction: false,
  };
}

/** Deja correr la cola de macrotareas para que dispare `setImmediate`. */
function siguienteCiclo(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('PrismaService — auditoría de modelos críticos', () => {
  const siguiente = jest.fn().mockResolvedValue({ id: 1 });

  afterEach(() => {
    jest.restoreAllMocks();
    siguiente.mockClear();
  });

  it('espera el registro de auditoría antes de responder en un modelo crítico', async () => {
    const servicio = crearServicioSinConectar();

    let liberarAuditoria: () => void = () => undefined;
    const auditoriaPendiente = new Promise<void>((resolve) => {
      liberarAuditoria = resolve;
    });
    const registrar = jest
      .spyOn(servicio, 'registrarAuditoria')
      .mockReturnValue(auditoriaPendiente);

    let resuelto = false;
    const enCurso = servicio
      .procesarMiddlewareAuditoria(paramsDeCreacion('Planilla'), siguiente)
      .then((resultado) => {
        resuelto = true;
        return resultado;
      });

    await siguienteCiclo();

    // La operación ya corrió, pero la respuesta sigue bloqueada por la
    // auditoría: eso es lo que garantiza que el evento no se pierda.
    expect(siguiente).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(resuelto).toBe(false);

    liberarAuditoria();
    await expect(enCurso).resolves.toEqual({ id: 1 });
    expect(resuelto).toBe(true);
  });

  it('no bloquea la respuesta en un modelo no crítico', async () => {
    const servicio = crearServicioSinConectar();
    const registrar = jest
      .spyOn(servicio, 'registrarAuditoria')
      .mockResolvedValue(undefined);

    const resultado = await servicio.procesarMiddlewareAuditoria(
      paramsDeCreacion('Area'),
      siguiente,
    );

    // Responde sin haber registrado todavía: el registro queda diferido.
    expect(resultado).toEqual({ id: 1 });
    expect(registrar).not.toHaveBeenCalled();

    await siguienteCiclo();
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('no deja fallar la operación si la auditoría crítica revienta', async () => {
    const servicio = crearServicioSinConectar();
    jest
      .spyOn(servicio, 'registrarAuditoria')
      .mockRejectedValue(new Error('base caída'));
    const logError = jest
      .spyOn(servicio.logger, 'error')
      .mockImplementation(() => undefined);

    await expect(
      servicio.procesarMiddlewareAuditoria(
        paramsDeCreacion('Boleta'),
        siguiente,
      ),
    ).resolves.toEqual({ id: 1 });
    expect(logError).toHaveBeenCalled();
  });

  it('declara solo modelos que existen en el schema de Prisma', () => {
    // Un nombre mal escrito nunca dispara el filtro y deja el fix decorativo.
    const schema = readFileSync(
      join(__dirname, '..', '..', 'prisma', 'schema.prisma'),
      'utf8',
    );
    const modelosDeclarados = new Set(
      Array.from(schema.matchAll(/^model\s+(\w+)\s*\{/gm)).map(
        (coincidencia) => coincidencia[1],
      ),
    );

    const inexistentes = Array.from(MODELOS_AUDITORIA_CRITICA).filter(
      (modelo) => !modelosDeclarados.has(modelo),
    );

    expect(inexistentes).toEqual([]);
  });

  it('cubre los modelos con impacto económico o legal directo', () => {
    const imprescindibles = [
      'Planilla',
      'PlanillaDetalle',
      'Boleta',
      'Prestamo',
      'PrestamoMovimiento',
      'ParametroLegal',
      'Contrato',
      'Empleado',
      'SolicitudCorreccionFecha',
      'SolicitudCese',
      'SolicitudAnulacionContrato',
    ];

    for (const modelo of imprescindibles) {
      expect(MODELOS_AUDITORIA_CRITICA.has(modelo)).toBe(true);
    }
  });
});
