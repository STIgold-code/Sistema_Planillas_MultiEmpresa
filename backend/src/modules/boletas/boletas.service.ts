import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterBoletaDto, GenerarBoletasDto } from './dto';
import { Prisma, EstadoBoleta } from '@prisma/client';
import { EmailService } from '../../common/services/email.service';
import { BoletasPdfService } from './boletas-pdf.service';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { asegurarEmpleadoCertificado } from '../planillas/aplicacion/asegurar-empleado-certificado';
import { RegimenNoCertificadoError } from '../planillas/aplicacion/guardia-certificacion';

@Injectable()
export class BoletasService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private boletasPdfService: BoletasPdfService,
  ) {}

  async findAll(empresaId: number, filters: FilterBoletaDto) {
    const {
      anio,
      mes,
      empleado_id,
      estado,
      buscar,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.BoletaWhereInput = {
      empresa_id: empresaId,
    };

    if (anio) where.anio = anio;
    if (mes) where.mes = mes;
    if (empleado_id) where.empleado_id = empleado_id;
    if (estado) where.estado = estado;

    if (buscar) {
      where.empleado = {
        OR: [
          { nombres: { contains: buscar, mode: 'insensitive' } },
          { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
          { apellido_materno: { contains: buscar, mode: 'insensitive' } },
          { numero_documento: { contains: buscar, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.boleta.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { id: 'desc' }],
        include: {
          empleado: {
            select: {
              id: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              area: { select: { nombre: true } },
              cargo: { select: { nombre: true } },
            },
          },
          planilla_detalle: {
            select: {
              neto_pagar: true,
              total_ingresos: true,
              total_descuentos: true,
              regimen_laboral: true,
            },
          },
          generador: {
            select: { id: true, nombre_completo: true },
          },
        },
      }),
      this.prisma.boleta.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, empresaId: number) {
    const boleta = await this.prisma.boleta.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        empleado: {
          include: {
            area: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
            regimen_pensionario: { select: { nombre: true, tipo: true } },
            banco_haberes: { select: { nombre: true } },
          },
        },
        planilla_detalle: {
          include: {
            planilla: {
              select: { anio: true, mes: true, estado: true },
            },
          },
        },
        empresa: {
          select: {
            razon_social: true,
            ruc: true,
            direccion: true,
          },
        },
        generador: {
          select: { id: true, nombre_completo: true },
        },
      },
    });

    if (!boleta) {
      throw new NotFoundException('Boleta no encontrada');
    }

    return boleta;
  }

  async findByEmpleado(
    empleadoId: number,
    empresaId: number,
    filters: FilterBoletaDto,
  ) {
    const { anio, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.BoletaWhereInput = {
      empresa_id: empresaId,
      empleado_id: empleadoId,
    };

    if (anio) where.anio = anio;

    const [data, total] = await Promise.all([
      this.prisma.boleta.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        include: {
          planilla_detalle: {
            select: {
              neto_pagar: true,
              total_ingresos: true,
              total_descuentos: true,
              regimen_laboral: true,
            },
          },
        },
      }),
      this.prisma.boleta.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async generarBoletas(
    dto: GenerarBoletasDto,
    empresaId: number,
    usuarioId: number,
  ) {
    // SEGURIDAD: Usar transacción para prevenir race conditions y boletas duplicadas
    return this.prisma.$transaction(async (tx) => {
      const planilla = await tx.planilla.findFirst({
        where: { id: dto.planilla_id, empresa_id: empresaId },
        include: {
          detalles: {
            include: {
              empleado: {
                include: {
                  empresa: { select: { regimen_laboral_default: true } },
                  contratos: {
                    where: {
                      estado: {
                        in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'],
                      },
                    },
                    orderBy: { fecha_inicio: 'desc' },
                    take: 1,
                    select: { regimen_laboral: true },
                  },
                },
              },
              boleta: true,
            },
          },
        },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'PAGADA' && planilla.estado !== 'APROBADA') {
        throw new BadRequestException(
          'Solo se pueden generar boletas de planillas aprobadas o pagadas',
        );
      }

      // Filtrar detalles que no tienen boleta
      const detallesSinBoleta = planilla.detalles.filter((d) => !d.boleta);

      if (detallesSinBoleta.length === 0) {
        throw new BadRequestException(
          'Todas las boletas ya han sido generadas para esta planilla',
        );
      }

      // Guardia de certificación: la boleta es el documento legal. Antes de
      // promover cualquier detalle a boleta, re-validar que el régimen laboral
      // de cada empleado esté certificado para producción. Si alguno no lo está,
      // abortar la transacción nombrándolo: no se crea NINGUNA boleta.
      for (const detalle of detallesSinBoleta) {
        try {
          asegurarEmpleadoCertificado({
            contratos: detalle.empleado.contratos,
            empresa: detalle.empleado.empresa,
          });
        } catch (error) {
          if (error instanceof RegimenNoCertificadoError) {
            const nombre = `${detalle.empleado.nombres} ${detalle.empleado.apellido_paterno}`;
            throw new BadRequestException(
              `No se pueden generar boletas: el empleado ${nombre} pertenece a un régimen no certificado para producción. ${error.message}`,
            );
          }
          throw error;
        }
      }

      // Crear boletas en batch
      const boletasData = detallesSinBoleta.map((detalle) => ({
        empresa_id: empresaId,
        planilla_detalle_id: detalle.id,
        empleado_id: detalle.empleado_id,
        anio: planilla.anio,
        mes: planilla.mes,
        generado_por: usuarioId,
      }));

      await tx.boleta.createMany({
        data: boletasData,
      });

      return {
        mensaje: `Se generaron ${boletasData.length} boletas correctamente`,
        cantidad: boletasData.length,
      };
    });
  }

  /**
   * Genera PDF de boleta en formato A4 horizontal (2 boletas por página)
   * Boleta izquierda: Empleador | Boleta derecha: Empleado
   */

  // ==================== PDF (delega a BoletasPdfService) ====================

  async generarPdf(id: number, empresaId: number): Promise<Buffer> {
    return this.boletasPdfService.generarPdf(id, empresaId);
  }

  async descargarPdf(
    id: number,
    empresaId: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return this.boletasPdfService.descargarPdf(id, empresaId);
  }

  async generarPdfMasivo(
    planillaId: number,
    empresaId: number,
  ): Promise<{ buffer: Buffer; filename: string; cantidad: number }> {
    return this.boletasPdfService.generarPdfMasivo(planillaId, empresaId);
  }

  async getEstadisticas(empresaId: number, anio?: number) {
    const currentYear = anio || ahoraPeru().year;

    const [total, porEstado, porMes] = await Promise.all([
      // Total del año
      this.prisma.boleta.count({
        where: { empresa_id: empresaId, anio: currentYear },
      }),

      // Por estado
      this.prisma.boleta.groupBy({
        by: ['estado'],
        where: { empresa_id: empresaId, anio: currentYear },
        _count: true,
      }),

      // Por mes
      this.prisma.boleta.groupBy({
        by: ['mes'],
        where: { empresa_id: empresaId, anio: currentYear },
        _count: true,
        orderBy: { mes: 'asc' },
      }),
    ]);

    return {
      anio: currentYear,
      total,
      porEstado: porEstado.reduce(
        (acc, item) => {
          acc[item.estado] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      porMes: porMes.map((item) => ({
        mes: item.mes,
        cantidad: item._count,
      })),
    };
  }

  async getPendientesEnvio(empresaId: number, planillaId?: number) {
    const where: Prisma.BoletaWhereInput = {
      empresa_id: empresaId,
      estado: EstadoBoleta.GENERADA,
      fecha_envio_email: null,
    };

    if (planillaId) {
      where.planilla_detalle = {
        planilla_id: planillaId,
      };
    }

    return this.prisma.boleta.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            email: true,
          },
        },
      },
    });
  }

  async marcarEnviada(id: number, empresaId: number, email: string) {
    const boleta = await this.findOne(id, empresaId);

    return this.prisma.boleta.update({
      where: { id: boleta.id },
      data: {
        estado: EstadoBoleta.ENVIADA,
        fecha_envio_email: ahoraPeru().toJSDate(),
        email_enviado_a: email,
      },
    });
  }

  /**
   * Envía una boleta por email al empleado
   */
  async enviarPorEmail(id: number, empresaId: number, emailDestino?: string) {
    const boleta = await this.findOne(id, empresaId);
    const empleado = boleta.empleado;

    const email = emailDestino || empleado.email;
    if (!email) {
      throw new BadRequestException(
        'El empleado no tiene email registrado. Proporcione un email destino.',
      );
    }

    if (!this.emailService.isConfigured()) {
      throw new BadRequestException(
        'El servicio de email no está configurado. Configure las variables SMTP en el servidor.',
      );
    }

    // Generar PDF
    const pdfBuffer = await this.generarPdf(id, empresaId);

    // Nombre del empleado
    const nombreCompleto = `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`;

    // Mes en texto
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Enviar email
    const enviado = await this.emailService.sendBoletaEmail(
      email,
      nombreCompleto,
      meses[boleta.mes - 1],
      boleta.anio,
      pdfBuffer,
    );

    if (!enviado) {
      throw new BadRequestException(
        'Error al enviar el email. Intente nuevamente.',
      );
    }

    // Actualizar estado de la boleta
    return this.prisma.boleta.update({
      where: { id: boleta.id },
      data: {
        estado: EstadoBoleta.ENVIADA,
        fecha_envio_email: ahoraPeru().toJSDate(),
        email_enviado_a: email,
      },
    });
  }

  /**
   * Envía múltiples boletas por email
   */
  async enviarBoletasMasivo(
    boletaIds: number[],
    empresaId: number,
  ): Promise<{ enviadas: number; fallidas: number; errores: string[] }> {
    const resultados = { enviadas: 0, fallidas: 0, errores: [] as string[] };

    for (const id of boletaIds) {
      try {
        await this.enviarPorEmail(id, empresaId);
        resultados.enviadas++;
      } catch (error) {
        resultados.fallidas++;
        const mensaje = error instanceof Error ? error.message : String(error);
        resultados.errores.push(`Boleta ${id}: ${mensaje}`);
      }
    }

    return resultados;
  }
}
