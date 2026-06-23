import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Filtro global que traduce los errores conocidos de Prisma a respuestas HTTP
 * consistentes. Evita que se filtre el mensaje interno de Prisma al cliente
 * (que puede exponer nombres de tablas, columnas o detalles del esquema).
 *
 * Mapeo de codigos:
 * - P2002 -> 409: violacion de restriccion de unicidad
 * - P2025 / P2001 -> 404: registro no encontrado
 * - P2003 -> 409: violacion de llave foranea (registro referenciado)
 * - resto -> 500: error generico sin exponer el detalle interno
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.mapError(exception);

    // Registrar el detalle interno solo en logs del servidor, nunca al cliente.
    this.logger.error(
      `Prisma ${exception.code} en ${request.method} ${request.url}: ${exception.message}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      error: this.errorName(status),
    });
  }

  private mapError(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'El registro ya existe o viola una restricción de unicidad.',
        };
      case 'P2025':
      case 'P2001':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Registro no encontrado.',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message:
            'No se puede completar la operación: el registro está referenciado por otros datos.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ocurrió un error al procesar la solicitud.',
        };
    }
  }

  private errorName(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      default:
        return 'Internal Server Error';
    }
  }
}
