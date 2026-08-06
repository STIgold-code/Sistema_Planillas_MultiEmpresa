import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ahoraPeru,
  sumarDiasPeru,
  finDelDiaPeru,
  leerFechaPrisma,
  fechaHoyPeru,
} from '../../common/utils/datetime.util';
import {
  diaDeFecha,
  fechaCalendarioLocal,
  ventanaDePeriodo,
} from '../tareo/ventana-periodo';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(empresaId: number) {
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const en30Dias = finDelDiaPeru(sumarDiasPeru(hoy, 30));

    // Ejecutar TODAS las queries en paralelo para máximo rendimiento
    const [
      totalEmpleados,
      empleadosCesados,
      empleadosPendientes,
      contratosPorVencer,
      contratosVencidos,
      ausencias,
      solicitudesCesePendientes,
      ultimaPlanilla,
    ] = await Promise.all([
      // Conteos de empleados por estado
      this.prisma.empleado.count({
        where: { estado: 'ACTIVO', empresa_id: empresaId },
      }),
      this.prisma.empleado.count({
        where: { estado: 'CESADO', empresa_id: empresaId },
      }),
      this.prisma.empleado.count({
        where: { estado: 'PENDIENTE', empresa_id: empresaId },
      }),
      // Contratos por vencer en los próximos 30 días
      this.prisma.contrato.count({
        where: {
          estado: 'ACTIVO',
          fecha_fin: { gte: hoy, lte: en30Dias },
          empleado: { empresa_id: empresaId },
        },
      }),
      // Contratos vencidos
      this.prisma.contrato.count({
        where: {
          estado: 'PENDIENTE',
          empleado: { empresa_id: empresaId, estado: { not: 'CESADO' } },
        },
      }),
      // Ausencias del día y del período de tareo vigente
      this.calcularAusencias(empresaId),
      // Solicitudes de cese pendientes
      this.prisma.solicitudCese.count({
        where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      }),
      // Última planilla generada (no borrador) para mostrar su total neto
      this.prisma.planilla.findFirst({
        where: { empresa_id: empresaId, estado: { not: 'BORRADOR' } },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        select: { total_neto: true, anio: true, mes: true },
      }),
    ]);

    // Etiqueta con el período REAL de la planilla mostrada (puede no ser el mes
    // corriente si aún no se generó la del mes).
    const planillaPeriodo = ultimaPlanilla
      ? new Date(ultimaPlanilla.anio, ultimaPlanilla.mes - 1, 1).toLocaleString(
          'es-PE',
          { month: 'long', year: 'numeric' },
        )
      : null;

    return {
      planillaPeriodo,
      totalEmpleados,
      empleadosCesados,
      empleadosPendientes,
      contratosPorVencer,
      contratosVencidos,
      ausenciasHoy: ausencias.ausenciasHoy,
      ausenciasMes: ausencias.ausenciasMes,
      planillaMes: ultimaPlanilla ? ultimaPlanilla.total_neto.toNumber() : null,
      solicitudesCesePendientes,
      mesActual: hoy.toLocaleString('es-PE', {
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  /**
   * Calcula las ausencias (faltas) del día actual y del período vigente según el
   * tareo.
   *
   * El período se ubica por RANGO (fecha_inicio <= hoy <= fecha_fin), no por
   * anio/mes: con día de corte, el período "de julio" puede ir del 26 de junio
   * al 25 de julio. El día que se cuenta es el ORDINAL de hoy dentro de esa
   * ventana. Si hoy no cae en ningún período, se devuelven ceros.
   */
  private async calcularAusencias(
    empresaId: number,
  ): Promise<{ ausenciasHoy: number; ausenciasMes: number }> {
    // Las columnas fecha_inicio/fecha_fin son @db.Date (medianoche UTC): se
    // compara contra la fecha de hoy en Perú normalizada al mismo formato.
    const hoyFecha = leerFechaPrisma(fechaHoyPeru()).toJSDate();

    const periodoActual = await this.prisma.periodoTareo.findFirst({
      where: {
        estado: { in: ['EN_PROCESO', 'CERRADO'] },
        empresa_id: empresaId,
        fecha_inicio: { lte: hoyFecha },
        fecha_fin: { gte: hoyFecha },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });

    if (!periodoActual) {
      return { ausenciasHoy: 0, ausenciasMes: 0 };
    }

    const ventana = ventanaDePeriodo(periodoActual);
    const dia = diaDeFecha(
      ventana.fechaInicio,
      ventana.fechaFin,
      fechaCalendarioLocal(hoyFecha),
    );

    if (dia === null) {
      return { ausenciasHoy: 0, ausenciasMes: 0 };
    }

    // Contar marcaciones con código 'F' (Falta) - hoy y todo el período
    const [ausenciasHoy, ausenciasMes] = await Promise.all([
      this.prisma.tareoDetalle.count({
        where: {
          tareo: {
            periodo_id: periodoActual.id,
          },
          dia,
          tipo_marcacion: {
            codigo: 'F',
          },
        },
      }),
      this.prisma.tareoDetalle.count({
        where: {
          tareo: {
            periodo_id: periodoActual.id,
          },
          tipo_marcacion: {
            codigo: 'F',
          },
        },
      }),
    ]);

    return { ausenciasHoy, ausenciasMes };
  }

  async getContratosPorVencer(empresaId: number, dias: number = 30) {
    const hoyStr = fechaHoyPeru();
    const hoyUtc = leerFechaPrisma(hoyStr);
    const hoy = hoyUtc.toJSDate();
    const fechaLimite = finDelDiaPeru(sumarDiasPeru(hoy, dias));

    const contratos = await this.prisma.contrato.findMany({
      where: {
        estado: 'ACTIVO',
        fecha_fin: {
          gte: hoy,
          lte: fechaLimite,
        },
        empleado: { empresa_id: empresaId },
      },
      select: {
        id: true,
        tipo_contrato: true,
        modalidad: true,
        fecha_inicio: true,
        fecha_fin: true,
        remuneracion: true,
        cliente_id: true,
        lugar_trabajo: true,
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            sueldo_base: true,
            cargo: {
              select: { id: true, nombre: true },
            },
            area: {
              select: { nombre: true },
            },
            sede: {
              select: {
                id: true,
                nombre: true,
                cliente_id: true,
              },
            },
          },
        },
        cliente: {
          select: {
            id: true,
            razon_social: true,
          },
        },
      },
      orderBy: {
        fecha_fin: 'asc',
      },
    });

    return contratos.map((c) => {
      const diasRestantes = Math.round(
        leerFechaPrisma(c.fecha_fin).diff(hoyUtc, 'days').days,
      );
      return {
        ...c,
        diasRestantes,
        nombreCompleto: `${c.empleado.apellido_paterno} ${c.empleado.apellido_materno}, ${c.empleado.nombres}`,
      };
    });
  }

  async getEmpleadosPendientes(empresaId: number) {
    const hoyStr = fechaHoyPeru();
    const hoyUtc = leerFechaPrisma(hoyStr);

    const contratos = await this.prisma.contrato.findMany({
      where: {
        estado: 'PENDIENTE',
        empleado: { empresa_id: empresaId, estado: { not: 'CESADO' } },
      },
      select: {
        id: true,
        tipo_contrato: true,
        modalidad: true,
        fecha_inicio: true,
        fecha_fin: true,
        remuneracion: true,
        cliente_id: true,
        lugar_trabajo: true,
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            sueldo_base: true,
            cargo: {
              select: { id: true, nombre: true },
            },
            area: {
              select: { nombre: true },
            },
            sede: {
              select: {
                id: true,
                nombre: true,
                cliente_id: true,
              },
            },
          },
        },
        cliente: {
          select: {
            id: true,
            razon_social: true,
          },
        },
      },
      orderBy: {
        fecha_fin: 'asc',
      },
      take: 50,
    });

    return contratos.map((c) => {
      const diasPendiente = Math.round(
        hoyUtc.diff(leerFechaPrisma(c.fecha_fin), 'days').days,
      );
      return {
        ...c,
        diasPendiente,
        nombreCompleto: `${c.empleado.apellido_paterno} ${c.empleado.apellido_materno}, ${c.empleado.nombres}`,
      };
    });
  }

  async getSolicitudesCesePendientes(empresaId: number) {
    return this.prisma.solicitudCese.findMany({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      include: {
        archivos: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
            archivo_tipo: true,
            archivo_tamano: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            cargo: { select: { nombre: true } },
          },
        },
        tipo_cese: { select: { id: true, nombre: true } },
        solicitado_por: {
          select: { id: true, nombre_completo: true, email: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async getSolicitudesAnulacionPendientes(empresaId: number) {
    return this.prisma.solicitudAnulacionContrato.findMany({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      include: {
        archivos: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
            archivo_tipo: true,
            archivo_tamano: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            cargo: { select: { nombre: true } },
          },
        },
        contrato: {
          select: {
            id: true,
            tipo_contrato: true,
            fecha_inicio: true,
            fecha_fin: true,
            estado: true,
            numero_renovacion: true,
          },
        },
        solicitado_por: {
          select: { id: true, nombre_completo: true, email: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async getEmpleadosCesados(empresaId: number) {
    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: 'CESADO',
      },
      select: {
        id: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        numero_documento: true,
        fecha_cese: true,
        cargo: {
          select: { nombre: true },
        },
        sede: {
          select: { nombre: true },
        },
      },
      orderBy: {
        fecha_cese: 'desc',
      },
      take: 50,
    });

    return empleados.map((e) => ({
      ...e,
      nombreCompleto: `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
    }));
  }
}
