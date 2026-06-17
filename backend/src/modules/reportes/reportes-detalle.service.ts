import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FiltrosReporteDto } from './dto/reportes.dto';
import { ColumnConfig } from './reportes.types';
import {
  ahoraPeru,
  fechaHoyPeruDate,
  sumarDiasPeru,
  inicioDelMesPeru,
  finDelMesPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';

/**
 * Servicio dedicado a la obtencion de datos para reportes (12 fetchers).
 * Extraido de ReportesDataService para mantener el archivo principal < 400 LOC.
 *
 * Organizacion: por dominio.
 * - Empleados: getEmpleadosGeneral, getEmpleadosCumpleanos, getEmpleadosAltasBajas
 * - Contratos: getContratosVencer, getContratosVigentes
 * - Vacaciones: getVacacionesSaldos
 * - Tareo: getTareoResumen, getTareoAlertas
 * - Planilla: getPlanillaMensual, getPlanillaAportes, getPlanillaBanco
 * - Descansos medicos: getDescansosMedicos
 */
@Injectable()
export class ReportesDetalleService {
  constructor(private prisma: PrismaService) {}

  async getEmpleadosGeneral(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const where: Prisma.EmpleadoWhereInput = { empresa_id: empresaId };
    if (filtros.area_id) where.area_id = filtros.area_id;
    if (filtros.sede_id) where.sede_id = filtros.sede_id;
    if (filtros.estado)
      where.estado = filtros.estado as Prisma.EnumEstadoEmpleadoFilter;
    if (filtros.fecha_desde)
      where.fecha_ingreso = { gte: new Date(filtros.fecha_desde) };
    if (filtros.fecha_hasta) {
      where.fecha_ingreso = {
        ...(where.fecha_ingreso as Prisma.DateTimeFilter),
        lte: new Date(filtros.fecha_hasta),
      };
    }

    const empleados = await this.prisma.empleado.findMany({
      where,
      include: {
        area: { select: { nombre: true } },
        cargo: { select: { nombre: true } },
        sede: { select: { nombre: true } },
      },
      orderBy: [
        { apellido_paterno: 'asc' },
        { apellido_materno: 'asc' },
        { nombres: 'asc' },
      ],
    });

    const columns: ColumnConfig[] = [
      { key: 'tipo_documento', header: 'Tipo Doc', width: 10 },
      { key: 'numero_documento', header: 'Nro Documento', width: 15 },
      { key: 'apellidos', header: 'Apellidos', width: 25 },
      { key: 'nombres', header: 'Nombres', width: 20 },
      { key: 'email', header: 'Email', width: 30 },
      { key: 'telefono', header: 'Teléfono', width: 15 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'cargo', header: 'Cargo', width: 25 },
      { key: 'sede', header: 'Sede', width: 20 },
      { key: 'fecha_ingreso', header: 'F. Ingreso', width: 12 },
      { key: 'estado', header: 'Estado', width: 12 },
    ];

    const data = empleados.map((emp) => ({
      tipo_documento: emp.tipo_documento,
      numero_documento: emp.numero_documento,
      apellidos: `${emp.apellido_paterno} ${emp.apellido_materno}`,
      nombres: emp.nombres,
      email: emp.email || '',
      telefono: emp.telefono || '',
      area: emp.area?.nombre || '',
      cargo: emp.cargo?.nombre || '',
      sede: emp.sede?.nombre || '',
      fecha_ingreso: emp.fecha_ingreso
        ? this.formatDate(emp.fecha_ingreso)
        : '',
      estado: emp.estado,
    }));

    return { data, columns };
  }

  async getEmpleadosCumpleanos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const mes = filtros.mes || ahoraPeru().month;

    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: 'ACTIVO',
        ...(filtros.area_id && { area_id: filtros.area_id }),
      },
      include: {
        area: { select: { nombre: true } },
        cargo: { select: { nombre: true } },
      },
      orderBy: { fecha_nacimiento: 'asc' },
    });

    const cumpleaneros = empleados.filter((emp) => {
      if (!emp.fecha_nacimiento) return false;
      return emp.fecha_nacimiento.getMonth() + 1 === mes;
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Nombre Completo', width: 35 },
      { key: 'fecha_nacimiento', header: 'Fecha Nacimiento', width: 15 },
      { key: 'dia', header: 'Día', width: 8 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'cargo', header: 'Cargo', width: 25 },
    ];

    const data = cumpleaneros.map((emp) => ({
      numero_documento: emp.numero_documento,
      nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
      fecha_nacimiento: emp.fecha_nacimiento
        ? this.formatDate(emp.fecha_nacimiento)
        : '',
      dia: emp.fecha_nacimiento?.getDate() || '',
      area: emp.area?.nombre || '',
      cargo: emp.cargo?.nombre || '',
    }));

    return { data, columns };
  }

  async getContratosVencer(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const diasVencer = filtros.dias_vencer || 30;
    const hoyPeru = fechaHoyPeruDate();
    const fechaLimite = sumarDiasPeru(hoyPeru, diasVencer);

    const contratos = await this.prisma.contrato.findMany({
      where: {
        empleado: {
          empresa_id: empresaId,
          ...(filtros.area_id && { area_id: filtros.area_id }),
        },
        estado: 'ACTIVO',
        fecha_fin: { gte: hoyPeru, lte: fechaLimite },
      },
      include: {
        empleado: {
          select: {
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            area: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha_fin: 'asc' },
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'cargo', header: 'Cargo', width: 25 },
      { key: 'tipo_contrato', header: 'Tipo Contrato', width: 20 },
      { key: 'fecha_inicio', header: 'F. Inicio', width: 12 },
      { key: 'fecha_fin', header: 'F. Fin', width: 12 },
      { key: 'dias_restantes', header: 'Días Rest.', width: 10 },
    ];

    const data = contratos.map((c) => {
      const diasRestantes = Math.ceil(
        (c.fecha_fin.getTime() - hoyPeru.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        numero_documento: c.empleado.numero_documento,
        nombre_completo: `${c.empleado.apellido_paterno} ${c.empleado.apellido_materno}, ${c.empleado.nombres}`,
        area: c.empleado.area?.nombre || '',
        cargo: c.empleado.cargo?.nombre || '',
        tipo_contrato: c.tipo_contrato,
        fecha_inicio: this.formatDate(c.fecha_inicio),
        fecha_fin: this.formatDate(c.fecha_fin),
        dias_restantes: diasRestantes,
      };
    });

    return { data, columns };
  }

  async getContratosVigentes(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const contratos = await this.prisma.contrato.findMany({
      where: {
        empleado: {
          empresa_id: empresaId,
          ...(filtros.area_id && { area_id: filtros.area_id }),
          ...(filtros.sede_id && { sede_id: filtros.sede_id }),
        },
        estado: 'ACTIVO',
      },
      include: {
        empleado: {
          select: {
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            area: { select: { nombre: true } },
            sede: { select: { nombre: true } },
          },
        },
      },
      orderBy: { empleado: { apellido_paterno: 'asc' } },
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'sede', header: 'Sede', width: 20 },
      { key: 'tipo_contrato', header: 'Tipo Contrato', width: 20 },
      { key: 'fecha_inicio', header: 'F. Inicio', width: 12 },
      { key: 'fecha_fin', header: 'F. Fin', width: 12 },
    ];

    const data = contratos.map((c) => ({
      numero_documento: c.empleado.numero_documento,
      nombre_completo: `${c.empleado.apellido_paterno} ${c.empleado.apellido_materno}, ${c.empleado.nombres}`,
      area: c.empleado.area?.nombre || '',
      sede: c.empleado.sede?.nombre || '',
      tipo_contrato: c.tipo_contrato,
      fecha_inicio: this.formatDate(c.fecha_inicio),
      fecha_fin: this.formatDate(c.fecha_fin),
    }));

    return { data, columns };
  }

  async getVacacionesSaldos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: 'ACTIVO',
        ...(filtros.area_id && { area_id: filtros.area_id }),
        ...(filtros.sede_id && { sede_id: filtros.sede_id }),
      },
      include: {
        area: { select: { nombre: true } },
        cargo: { select: { nombre: true } },
        periodos_vacacionales: {
          where: { estado: { in: ['DISPONIBLE', 'PARCIAL'] } },
          select: { dias_pendientes: true },
        },
      },
      orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }],
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'cargo', header: 'Cargo', width: 25 },
      { key: 'fecha_ingreso', header: 'F. Ingreso', width: 12 },
      { key: 'dias_pendientes', header: 'Días Pend.', width: 12 },
    ];

    const data = empleados.map((emp) => {
      const diasPendientes = emp.periodos_vacacionales.reduce(
        (sum, p) => sum + (p.dias_pendientes || 0),
        0,
      );
      return {
        numero_documento: emp.numero_documento,
        nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
        area: emp.area?.nombre || '',
        cargo: emp.cargo?.nombre || '',
        fecha_ingreso: emp.fecha_ingreso
          ? this.formatDate(emp.fecha_ingreso)
          : '',
        dias_pendientes: diasPendientes,
      };
    });

    return { data, columns };
  }

  async getTareoResumen(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const ahora = ahoraPeru();
    const mes = filtros.mes || ahora.month;
    const anio = filtros.anio || ahora.year;

    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { empresa_id: empresaId, mes, anio },
    });

    if (!periodo) {
      return { data: [], columns: [] };
    }

    // Obtener tareos del período con empleados y detalles
    const tareos = await this.prisma.tareo.findMany({
      where: {
        periodo_id: periodo.id,
        ...(filtros.area_id && { area_id: filtros.area_id }),
        ...(filtros.sede_id && { sede_id: filtros.sede_id }),
      },
      include: {
        empleado: {
          select: {
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        area: { select: { nombre: true } },
        detalles: {
          include: {
            tipo_marcacion: { select: { codigo: true } },
          },
        },
      },
      orderBy: { empleado: { apellido_paterno: 'asc' } },
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'dias_marcados', header: 'Días Marcados', width: 12 },
      { key: 'estado', header: 'Estado', width: 12 },
    ];

    const data = tareos.map((tareo) => {
      const diasMarcados = tareo.detalles.filter(
        (d) => d.tipo_marcacion_id !== null,
      ).length;
      return {
        numero_documento: tareo.empleado.numero_documento,
        nombre_completo: `${tareo.empleado.apellido_paterno} ${tareo.empleado.apellido_materno}, ${tareo.empleado.nombres}`,
        area: tareo.area?.nombre || '',
        dias_marcados: diasMarcados,
        estado: tareo.estado,
      };
    });

    return { data, columns };
  }

  async getPlanillaMensual(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    if (!filtros.mes || !filtros.anio) {
      return { data: [], columns: [] };
    }

    const planilla = await this.prisma.planilla.findFirst({
      where: { empresa_id: empresaId, mes: filtros.mes, anio: filtros.anio },
      include: {
        detalles: {
          include: {
            empleado: {
              select: {
                numero_documento: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
                area: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!planilla) {
      return { data: [], columns: [] };
    }

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'sueldo_base', header: 'Sueldo Base', width: 12 },
      { key: 'total_haberes', header: 'Total Haberes', width: 12 },
      { key: 'total_descuentos', header: 'Total Desc.', width: 12 },
      { key: 'neto_pagar', header: 'Neto a Pagar', width: 12 },
    ];

    const data = planilla.detalles.map((d) => ({
      numero_documento: d.empleado.numero_documento,
      nombre_completo: `${d.empleado.apellido_paterno} ${d.empleado.apellido_materno}, ${d.empleado.nombres}`,
      area: d.empleado.area?.nombre || '',
      sueldo_base: d.rem_basica?.toNumber() || 0,
      total_haberes: d.total_haberes?.toNumber() || 0,
      total_descuentos: d.total_descuentos?.toNumber() || 0,
      neto_pagar: d.neto_pagar?.toNumber() || 0,
    }));

    return { data, columns };
  }

  /**
   * Reporte de Aportes del Empleador (EsSalud, SCTR, Vida Ley)
   */
  async getPlanillaAportes(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    if (!filtros.mes || !filtros.anio) {
      throw new BadRequestException(
        'Debe especificar mes y año para el reporte de aportes',
      );
    }

    const planilla = await this.prisma.planilla.findFirst({
      where: { empresa_id: empresaId, mes: filtros.mes, anio: filtros.anio },
      include: {
        detalles: {
          include: {
            empleado: {
              select: {
                numero_documento: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
                area: { select: { nombre: true } },
                sctr: true,
              },
            },
          },
          orderBy: { empleado: { apellido_paterno: 'asc' } },
        },
      },
    });

    if (!planilla) {
      return { data: [], columns: [] };
    }

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'essalud', header: 'EsSalud', width: 12 },
      { key: 'sctr_salud', header: 'SCTR Salud', width: 12 },
      { key: 'sctr_pension', header: 'SCTR Pensión', width: 12 },
      { key: 'vida_ley', header: 'Vida Ley', width: 12 },
      { key: 'total_aportes', header: 'Total Aportes', width: 14 },
    ];

    const data = planilla.detalles.map((d) => {
      const essalud = d.essalud_empleador?.toNumber() || 0;
      const sctrSalud = d.sctr_salud_empleador?.toNumber() || 0;
      const sctrPension = d.sctr_pension_empleador?.toNumber() || 0;
      const vidaLey = d.vida_ley_empleador?.toNumber() || 0;
      const totalAportes = essalud + sctrSalud + sctrPension + vidaLey;

      return {
        numero_documento: d.empleado.numero_documento,
        nombre_completo: `${d.empleado.apellido_paterno} ${d.empleado.apellido_materno}, ${d.empleado.nombres}`,
        area: d.empleado.area?.nombre || '',
        essalud,
        sctr_salud: sctrSalud,
        sctr_pension: sctrPension,
        vida_ley: vidaLey,
        total_aportes: totalAportes,
      };
    });

    return { data, columns };
  }

  /**
   * Reporte Archivo Bancario para pago masivo
   */
  async getPlanillaBanco(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    if (!filtros.mes || !filtros.anio) {
      throw new BadRequestException(
        'Debe especificar mes y año para el archivo bancario',
      );
    }

    const planilla = await this.prisma.planilla.findFirst({
      where: { empresa_id: empresaId, mes: filtros.mes, anio: filtros.anio },
      include: {
        detalles: {
          include: {
            empleado: {
              select: {
                numero_documento: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
                banco_haberes: { select: { nombre: true } },
                nro_cuenta_haberes: true,
                cci_haberes: true,
              },
            },
          },
          orderBy: { empleado: { apellido_paterno: 'asc' } },
        },
      },
    });

    if (!planilla) {
      return { data: [], columns: [] };
    }

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'banco', header: 'Banco', width: 20 },
      { key: 'cuenta', header: 'N° Cuenta', width: 20 },
      { key: 'cci', header: 'CCI', width: 25 },
      { key: 'neto_pagar', header: 'Neto a Pagar', width: 14 },
    ];

    // Solo incluir empleados con cuenta bancaria y neto > 0
    const data = planilla.detalles
      .filter((d) => d.neto_pagar?.toNumber() > 0)
      .map((d) => ({
        numero_documento: d.empleado.numero_documento,
        nombre_completo: `${d.empleado.apellido_paterno} ${d.empleado.apellido_materno}, ${d.empleado.nombres}`,
        banco: d.empleado.banco_haberes?.nombre || d.banco_nombre || '',
        cuenta: d.empleado.nro_cuenta_haberes || d.cuenta_numero || '',
        cci: d.empleado.cci_haberes || d.cci || '',
        neto_pagar: d.neto_pagar?.toNumber() || 0,
      }));

    return { data, columns };
  }

  /**
   * Reporte de Alertas de Tareo - Empleados con 3+ faltas injustificadas
   */

  async getTareoAlertas(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    if (!filtros.mes || !filtros.anio) {
      throw new BadRequestException(
        'Debe especificar mes y año para el reporte de alertas',
      );
    }

    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { empresa_id: empresaId, mes: filtros.mes, anio: filtros.anio },
    });

    if (!periodo) {
      return { data: [], columns: [] };
    }

    // Obtener tareos con detalles y justificaciones
    const tareos = await this.prisma.tareo.findMany({
      where: {
        periodo_id: periodo.id,
      },
      include: {
        empleado: {
          select: {
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        area: { select: { nombre: true } },
        detalles: {
          where: {
            // Días sin marcación (posibles faltas)
            tipo_marcacion_id: null,
          },
          select: {
            dia: true,
          },
        },
        justificaciones: {
          select: {
            dia_inicio: true,
            dia_fin: true,
          },
        },
      },
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'faltas_sin_justificar', header: 'Faltas S/Just.', width: 14 },
      { key: 'dias_falta', header: 'Días de Falta', width: 30 },
      { key: 'alerta', header: 'Alerta', width: 15 },
    ];

    const data = tareos
      .map((tareo) => {
        // Obtener días justificados
        const diasJustificados = new Set<number>();
        tareo.justificaciones.forEach((j) => {
          for (let d = j.dia_inicio; d <= j.dia_fin; d++) {
            diasJustificados.add(d);
          }
        });

        // Filtrar faltas sin justificar
        const faltasSinJustificar = tareo.detalles
          .filter((d) => !diasJustificados.has(d.dia))
          .map((d) => d.dia);

        const cantidadFaltas = faltasSinJustificar.length;

        return {
          numero_documento: tareo.empleado.numero_documento,
          nombre_completo: `${tareo.empleado.apellido_paterno} ${tareo.empleado.apellido_materno}, ${tareo.empleado.nombres}`,
          area: tareo.area?.nombre || '',
          faltas_sin_justificar: cantidadFaltas,
          dias_falta:
            faltasSinJustificar.slice(0, 10).join(', ') +
            (faltasSinJustificar.length > 10 ? '...' : ''),
          alerta:
            cantidadFaltas >= 3
              ? 'CRÍTICO'
              : cantidadFaltas >= 2
                ? 'ADVERTENCIA'
                : 'NORMAL',
        };
      })
      // Solo mostrar empleados con 3+ faltas (alertas críticas)
      .filter((item) => item.faltas_sin_justificar >= 3)
      .sort((a, b) => b.faltas_sin_justificar - a.faltas_sin_justificar);

    return { data, columns };
  }

  /**
   * Reporte de Altas y Bajas - Movimientos de personal
   */

  async getEmpleadosAltasBajas(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const whereBase: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
      ...(filtros.area_id && { area_id: filtros.area_id }),
    };

    // Altas: empleados con fecha_ingreso en rango
    const whereAltas: Prisma.EmpleadoWhereInput = { ...whereBase };
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      whereAltas.fecha_ingreso = {};
      if (filtros.fecha_desde) {
        whereAltas.fecha_ingreso.gte = parsearFechaISOenPeru(
          filtros.fecha_desde,
        );
      }
      if (filtros.fecha_hasta) {
        whereAltas.fecha_ingreso.lte = parsearFechaISOenPeru(
          filtros.fecha_hasta + 'T23:59:59',
        );
      }
    } else {
      // Si no hay filtro de fecha, usar el mes actual en zona horaria Perú
      whereAltas.fecha_ingreso = {
        gte: inicioDelMesPeru(),
        lte: finDelMesPeru(),
      };
    }

    // Bajas: empleados con fecha_cese en rango
    const whereBajas: Prisma.EmpleadoWhereInput = { ...whereBase };
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      whereBajas.fecha_cese = {};
      if (filtros.fecha_desde) {
        whereBajas.fecha_cese.gte = parsearFechaISOenPeru(filtros.fecha_desde);
      }
      if (filtros.fecha_hasta) {
        whereBajas.fecha_cese.lte = parsearFechaISOenPeru(
          filtros.fecha_hasta + 'T23:59:59',
        );
      }
    } else {
      whereBajas.fecha_cese = { gte: inicioDelMesPeru(), lte: finDelMesPeru() };
    }

    const [altas, bajas] = await Promise.all([
      this.prisma.empleado.findMany({
        where: whereAltas,
        include: {
          area: { select: { nombre: true } },
          cargo: { select: { nombre: true } },
        },
        orderBy: { fecha_ingreso: 'desc' },
      }),
      this.prisma.empleado.findMany({
        where: whereBajas,
        include: {
          area: { select: { nombre: true } },
          cargo: { select: { nombre: true } },
        },
        orderBy: { fecha_cese: 'desc' },
      }),
    ]);

    const columns: ColumnConfig[] = [
      { key: 'tipo', header: 'Tipo', width: 10 },
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'cargo', header: 'Cargo', width: 25 },
      { key: 'fecha', header: 'Fecha', width: 12 },
      { key: 'motivo', header: 'Motivo', width: 25 },
    ];

    const dataAltas = altas.map((emp) => ({
      tipo: 'ALTA',
      numero_documento: emp.numero_documento,
      nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
      area: emp.area?.nombre || '',
      cargo: emp.cargo?.nombre || '',
      fecha: emp.fecha_ingreso ? this.formatDate(emp.fecha_ingreso) : '',
      motivo: 'Nuevo Ingreso',
    }));

    const dataBajas = bajas.map((emp) => ({
      tipo: 'CESADO',
      numero_documento: emp.numero_documento,
      nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
      area: emp.area?.nombre || '',
      cargo: emp.cargo?.nombre || '',
      fecha: emp.fecha_cese ? this.formatDate(emp.fecha_cese) : '',
      motivo: 'Cese',
    }));

    // Combinar y ordenar por fecha descendente
    const data = [...dataAltas, ...dataBajas].sort((a, b) => {
      const dateA = a.fecha
        ? new Date(a.fecha.split('/').reverse().join('-'))
        : new Date(0);
      const dateB = b.fecha
        ? new Date(b.fecha.split('/').reverse().join('-'))
        : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return { data, columns };
  }

  async getDescansosMedicos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    const where: Prisma.TareoJustificacionWhereInput = {
      tareo: { periodo: { empresa_id: empresaId } },
      tipo: { in: ['DESCANSO_MEDICO', 'CERTIFICADO_MEDICO'] },
    };

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      if (filtros.fecha_desde) {
        where.created_at = { gte: new Date(filtros.fecha_desde) };
      }
      if (filtros.fecha_hasta) {
        where.created_at = {
          ...(where.created_at as Prisma.DateTimeFilter),
          lte: new Date(filtros.fecha_hasta + 'T23:59:59'),
        };
      }
    }

    if (filtros.area_id) {
      where.tareo = {
        ...(where.tareo as Prisma.TareoWhereInput),
        area_id: filtros.area_id,
      };
    }
    if (filtros.sede_id) {
      where.tareo = {
        ...(where.tareo as Prisma.TareoWhereInput),
        sede_id: filtros.sede_id,
      };
    }

    const justificaciones = await this.prisma.tareoJustificacion.findMany({
      where,
      include: {
        tareo: {
          include: {
            empleado: {
              select: {
                numero_documento: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
              },
            },
            area: { select: { nombre: true } },
            sede: { select: { nombre: true } },
            periodo: { select: { mes: true, anio: true } },
          },
        },
        archivos: { select: { archivo_nombre: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const columns: ColumnConfig[] = [
      { key: 'numero_documento', header: 'DNI', width: 12 },
      { key: 'nombre_completo', header: 'Empleado', width: 35 },
      { key: 'area', header: 'Área', width: 20 },
      { key: 'sede', header: 'Sede', width: 20 },
      { key: 'tipo', header: 'Tipo', width: 18 },
      { key: 'periodo', header: 'Periodo', width: 12 },
      { key: 'dia_inicio', header: 'Día Inicio', width: 10 },
      { key: 'dia_fin', header: 'Día Fin', width: 10 },
      { key: 'dias_total', header: 'Días Total', width: 10 },
      { key: 'descripcion', header: 'Descripción', width: 40 },
      { key: 'tiene_archivo', header: 'Archivo', width: 10 },
      { key: 'fecha_registro', header: 'F. Registro', width: 12 },
    ];

    const tipoLabels: Record<string, string> = {
      DESCANSO_MEDICO: 'Descanso Médico',
      CERTIFICADO_MEDICO: 'Certificado Médico',
    };

    const data = justificaciones.map((j) => {
      const diasTotal = j.dia_fin - j.dia_inicio + 1;
      return {
        numero_documento: j.tareo.empleado.numero_documento,
        nombre_completo: `${j.tareo.empleado.apellido_paterno} ${j.tareo.empleado.apellido_materno}, ${j.tareo.empleado.nombres}`,
        area: j.tareo.area?.nombre || '',
        sede: j.tareo.sede?.nombre || '',
        tipo: tipoLabels[j.tipo] || j.tipo,
        periodo: `${j.tareo.periodo.mes.toString().padStart(2, '0')}/${j.tareo.periodo.anio}`,
        dia_inicio: j.dia_inicio,
        dia_fin: j.dia_fin,
        dias_total: diasTotal,
        descripcion: j.descripcion || '',
        tiene_archivo: j.archivos.length > 0 ? 'Sí' : 'No',
        fecha_registro: this.formatDate(j.created_at),
      };
    });

    return { data, columns };
  }

  // ==================== UTILIDADES ====================

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
