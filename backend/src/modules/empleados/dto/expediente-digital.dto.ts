import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// Categorías de documentos en el expediente
export enum CategoriaExpediente {
  IDENTIDAD = 'IDENTIDAD', // DNI, pasaporte, carnet extranjería
  FORMACION = 'FORMACION', // CV, títulos, certificados
  LABORAL = 'LABORAL', // Contratos, adendas, memorandums
  FINANCIERO = 'FINANCIERO', // Boletas, liquidaciones
  MEDICO = 'MEDICO', // Certificados médicos, exámenes
  LEGAL = 'LEGAL', // Antecedentes, declaraciones juradas
  OTRO = 'OTRO',
}

// Origen del documento
export enum OrigenDocumento {
  SUBIDO = 'SUBIDO', // Subido manualmente
  GENERADO = 'GENERADO', // Generado desde plantilla
  BOLETA = 'BOLETA', // Boleta de pago
  SELECCION = 'SELECCION', // Migrado desde proceso de selección
}

// Estado del documento
export enum EstadoDocumentoExpediente {
  VIGENTE = 'ACTIVO',
  VENCIDO = 'PENDIENTE',
  POR_VENCER = 'POR_VENCER',
  PENDIENTE_FIRMA = 'PENDIENTE_FIRMA',
  FIRMADO = 'FIRMADO',
  SIN_VENCIMIENTO = 'SIN_VENCIMIENTO',
}

// DTO para filtrar el expediente digital
export class FilterExpedienteDto {
  @IsOptional()
  @IsEnum(CategoriaExpediente)
  categoria?: CategoriaExpediente;

  @IsOptional()
  @IsEnum(OrigenDocumento)
  origen?: OrigenDocumento;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  anio?: number;

  @IsOptional()
  @IsString()
  buscar?: string;
}

// Documento unificado en el expediente
export interface DocumentoExpediente {
  id: string; // Prefijo + ID para identificar origen (DOC_123, GEN_456, BOL_789)
  tipo: string; // Nombre del tipo de documento
  categoria: CategoriaExpediente;
  origen: OrigenDocumento;
  descripcion: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  fecha_documento: Date | null; // Fecha de emisión o generación
  fecha_vencimiento: Date | null;
  estado: EstadoDocumentoExpediente;
  metadata: {
    // Datos adicionales según el origen
    plantilla?: string; // Para documentos generados
    periodo?: string; // Para boletas (ej: "Enero 2024")
    firmado?: boolean;
    [key: string]: unknown;
  };
}

// Respuesta del expediente digital
export interface ExpedienteDigitalResponse {
  empleado: {
    id: number;
    numero_documento: string;
    nombre_completo: string;
    cargo: string | null;
    area: string | null;
    fecha_ingreso: Date | null;
    estado: string;
  };
  resumen: {
    total_documentos: number;
    por_categoria: Record<CategoriaExpediente, number>;
    por_origen: Record<OrigenDocumento, number>;
    documentos_vencidos: number;
    documentos_por_vencer: number;
    ultimo_documento: Date | null;
  };
  documentos: DocumentoExpediente[];
}
