import { Prisma } from '@prisma/client';

/**
 * Tipos de documento "del sistema" que se crean automaticamente cuando
 * un flujo lo requiere (cese, anulacion de contrato, etc.). Si no existen
 * en la empresa, se crean on-demand.
 */
export const SYSTEM_TIPO_DOCUMENTO = {
  CARTA_RENUNCIA: {
    codigo: 'CARTA_RENUNCIA',
    nombre: 'Carta de Renuncia',
    descripcion:
      'Documento adjunto a una solicitud de cese o anulacion de contrato aprobada',
  },
} as const;

type SystemTipoCodigo = keyof typeof SYSTEM_TIPO_DOCUMENTO;

/**
 * Encuentra el tipo de documento del sistema en la empresa, creandolo
 * on-demand si no existe. Devuelve el id.
 */
async function ensureTipoDocumentoSistema(
  tx: Prisma.TransactionClient,
  empresaId: number,
  codigo: SystemTipoCodigo,
): Promise<number> {
  const meta = SYSTEM_TIPO_DOCUMENTO[codigo];
  const existente = await tx.tipoDocumentoEmpleado.findFirst({
    where: { empresa_id: empresaId, codigo: meta.codigo },
    select: { id: true },
  });
  if (existente) return existente.id;

  const creado = await tx.tipoDocumentoEmpleado.create({
    data: {
      codigo: meta.codigo,
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      empresa_id: empresaId,
      es_obligatorio: false,
      aplica_rrhh: true,
      aplica_seleccion: false,
      activo: true,
    },
    select: { id: true },
  });
  return creado.id;
}

export interface ArchivoParaBanco {
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string | null;
  archivo_tamano?: number | null;
}

export interface ArchivarEnBancoParams {
  empleadoId: number;
  empresaId: number;
  tipoCodigo: SystemTipoCodigo;
  archivos: ArchivoParaBanco[];
  subidoPorUsuarioId: number;
  descripcion?: string;
}

/**
 * Copia una lista de archivos como documentos del banco del empleado.
 * El storage no se duplica — se reutiliza la misma archivo_url. Solo se
 * crean filas nuevas en EmpleadoDocumento apuntando al mismo storage.
 *
 * Esto preserva la trazabilidad: los archivos quedan visibles en el tab
 * "Documentos" del empleado para auditoria, sin gastar storage adicional.
 *
 * Devuelve la cantidad de documentos creados (0 si archivos vacio).
 */
export async function archivarArchivosEnBancoEmpleado(
  tx: Prisma.TransactionClient,
  params: ArchivarEnBancoParams,
): Promise<number> {
  if (!params.archivos || params.archivos.length === 0) return 0;

  const tipoId = await ensureTipoDocumentoSistema(
    tx,
    params.empresaId,
    params.tipoCodigo,
  );

  await tx.empleadoDocumento.createMany({
    data: params.archivos.map((a) => ({
      empleado_id: params.empleadoId,
      tipo_documento_empleado_id: tipoId,
      descripcion: params.descripcion ?? null,
      archivo_url: a.archivo_url,
      archivo_nombre: a.archivo_nombre,
      origen: 'RRHH' as const,
      subido_por_id: params.subidoPorUsuarioId,
    })),
  });

  return params.archivos.length;
}
