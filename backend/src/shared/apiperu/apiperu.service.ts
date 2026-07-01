import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { obtenerMensajeError } from '../../common/utils/error.util';

/** Datos de una empresa devueltos por la consulta de RUC. */
export interface RucConsultaResult {
  ruc: string;
  razon_social: string;
  direccion: string | null;
  estado: string | null;
  condicion: string | null;
}

/** Datos de una persona devueltos por la consulta de DNI. */
export interface DniConsultaResult {
  numero_documento: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

// Forma cruda de la respuesta de apiperu.dev.
interface ApiPeruResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ApiPeruRuc {
  ruc: string;
  nombre_o_razon_social: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  direccion_completa?: string;
}

interface ApiPeruDni {
  numero: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

/**
 * Consulta datos de RUC (SUNAT) y DNI (RENIEC) contra el proveedor
 * apiperu.dev. El token se toma de la variable de entorno APIPERU_TOKEN;
 * si no está configurado, las consultas fallan con un error claro (503)
 * en vez de romper de forma opaca.
 */
@Injectable()
export class ApiPeruService {
  private readonly logger = new Logger(ApiPeruService.name);
  private readonly baseUrl = 'https://apiperu.dev/api';

  constructor(private readonly config: ConfigService) {}

  async consultarRuc(ruc: string): Promise<RucConsultaResult> {
    if (!/^\d{11}$/.test(ruc)) {
      throw new BadRequestException('El RUC debe tener 11 dígitos numéricos');
    }
    const data = await this.consultar<ApiPeruRuc>('ruc', { ruc });
    return {
      ruc: data.ruc,
      razon_social: data.nombre_o_razon_social,
      direccion: data.direccion_completa || data.direccion || null,
      estado: data.estado ?? null,
      condicion: data.condicion ?? null,
    };
  }

  async consultarDni(dni: string): Promise<DniConsultaResult> {
    if (!/^\d{8}$/.test(dni)) {
      throw new BadRequestException('El DNI debe tener 8 dígitos numéricos');
    }
    const data = await this.consultar<ApiPeruDni>('dni', { dni });
    return {
      numero_documento: data.numero,
      nombres: data.nombres,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno,
      nombre_completo: data.nombre_completo,
    };
  }

  private obtenerToken(): string {
    const token = this.config.get<string>('APIPERU_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException(
        'La consulta de documentos no está configurada. Falta APIPERU_TOKEN.',
      );
    }
    return token;
  }

  private async consultar<T>(
    endpoint: 'ruc' | 'dni',
    body: Record<string, string>,
  ): Promise<T> {
    const token = this.obtenerToken();

    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error de conexión con apiperu (${endpoint}): ${obtenerMensajeError(error)}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo conectar con el servicio de consulta.',
      );
    }

    if (respuesta.status === 404 || respuesta.status === 422) {
      throw new NotFoundException(
        'No se encontraron datos para el documento indicado.',
      );
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      this.logger.error(`apiperu rechazó el token (${respuesta.status}).`);
      throw new ServiceUnavailableException(
        'El servicio de consulta rechazó las credenciales.',
      );
    }
    if (!respuesta.ok) {
      this.logger.error(
        `apiperu respondió ${respuesta.status} en ${endpoint}.`,
      );
      throw new ServiceUnavailableException(
        'El servicio de consulta no está disponible en este momento.',
      );
    }

    const json = (await respuesta.json()) as ApiPeruResponse<T>;
    if (!json.success || !json.data) {
      throw new NotFoundException(
        json.message || 'No se encontraron datos para el documento indicado.',
      );
    }
    return json.data;
  }
}
