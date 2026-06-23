import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FilterMovimientosDto,
  TipoMovimiento,
  EstadoEmpleadoFiltro,
} from './dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { ahoraPeru } from '../../common/utils/datetime.util';

export interface MovimientoPersonal {
  id: number;
  tipo: 'INGRESO' | 'CESE' | 'VENCIMIENTO';
  empleado_id: number;
  numero_documento: string;
  nombre_completo: string;
  area?: string;
  sede?: string;
  cargo?: string;
  cliente?: string;
  fecha_movimiento: string;
  motivo?: string;
  dias_restantes?: number;
  estado_empleado: string;
}

export interface MovimientosResumen {
  ingresos: number;
  ceses: number;
  vencimientos: number;
}

export interface UltimosPeriodosConDatos {
  ultimoCese?: { mes: number; anio: number };
  ultimoIngreso?: { mes: number; anio: number };
  ultimoVencimiento?: { mes: number; anio: number };
}

export interface Tendencia {
  ingresos: number; // diferencia vs mes anterior
  ceses: number;
  vencimientos: number;
}

export interface DatoHistorico {
  mes: number;
  anio: number;
  label: string;
  ingresos: number;
  ceses: number;
  vencimientos: number;
}

@Injectable()
export class MovimientosPersonalService {
  private readonly logger = new Logger(MovimientosPersonalService.name);

  constructor(private prisma: PrismaService) {}

  private getFechasDelPeriodo(filters: FilterMovimientosDto): {
    fechaDesde: Date;
    fechaHasta: Date;
  } {
    if (filters.fecha_desde && filters.fecha_hasta) {
      return {
        fechaDesde: new Date(filters.fecha_desde),
        fechaHasta: new Date(filters.fecha_hasta + 'T23:59:59.999Z'),
      };
    }

    const ahora = ahoraPeru();
    const mes = filters.mes ?? ahora.month;
    const anio = filters.anio ?? ahora.year;

    const fechaDesde = new Date(anio, mes - 1, 1);
    const fechaHasta = new Date(anio, mes, 0, 23, 59, 59, 999);

    return { fechaDesde, fechaHasta };
  }

  async getResumen(
    empresaId: number,
    filters: FilterMovimientosDto,
  ): Promise<MovimientosResumen> {
    const { fechaDesde, fechaHasta } = this.getFechasDelPeriodo(filters);

    const whereBase: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
      ...(filters.cliente_id && {
        sede: { cliente_id: filters.cliente_id },
      }),
      ...(filters.sede_id && { sede_id: filters.sede_id }),
      ...(filters.area_id && { area_id: filters.area_id }),
    };

    const [ingresos, ceses, vencimientos] = await Promise.all([
      // Ingresos: empleados con fecha_ingreso en el período
      this.prisma.empleado.count({
        where: {
          ...whereBase,
          fecha_ingreso: {
            gte: fechaDesde,
            lte: fechaHasta,
          },
        },
      }),
      // Ceses: empleados con fecha_cese en el período
      this.prisma.empleado.count({
        where: {
          ...whereBase,
          fecha_cese: {
            gte: fechaDesde,
            lte: fechaHasta,
          },
        },
      }),
      // Vencimientos: contratos activos cuya fecha_fin está en el período
      this.prisma.contrato.count({
        where: {
          empleado: {
            empresa_id: empresaId,
            ...(filters.cliente_id && {
              sede: { cliente_id: filters.cliente_id },
            }),
            ...(filters.sede_id && { sede_id: filters.sede_id }),
            ...(filters.area_id && { area_id: filters.area_id }),
          },
          estado: 'ACTIVO',
          fecha_fin: {
            gte: fechaDesde,
            lte: fechaHasta,
          },
        },
      }),
    ]);

    return { ingresos, ceses, vencimientos };
  }

  async getTendencia(
    empresaId: number,
    filters: FilterMovimientosDto,
  ): Promise<Tendencia> {
    const { fechaDesde } = this.getFechasDelPeriodo(filters);

    // Calcular período anterior
    const mesAnteriorDesde = new Date(fechaDesde);
    mesAnteriorDesde.setMonth(mesAnteriorDesde.getMonth() - 1);
    const mesAnteriorHasta = new Date(fechaDesde);
    mesAnteriorHasta.setDate(0); // Último día del mes anterior
    mesAnteriorHasta.setHours(23, 59, 59, 999);

    const filtersAnterior: FilterMovimientosDto = {
      ...filters,
      mes: mesAnteriorDesde.getMonth() + 1,
      anio: mesAnteriorDesde.getFullYear(),
      fecha_desde: undefined,
      fecha_hasta: undefined,
    };

    const [actual, anterior] = await Promise.all([
      this.getResumen(empresaId, filters),
      this.getResumen(empresaId, filtersAnterior),
    ]);

    return {
      ingresos: actual.ingresos - anterior.ingresos,
      ceses: actual.ceses - anterior.ceses,
      vencimientos: actual.vencimientos - anterior.vencimientos,
    };
  }

  async getHistorico(
    empresaId: number,
    meses: number = 6,
  ): Promise<DatoHistorico[]> {
    const resultado: DatoHistorico[] = [];
    const ahora = ahoraPeru();
    const nombresMeses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    for (let i = meses - 1; i >= 0; i--) {
      const fecha = ahora.minus({ months: i });
      const mes = fecha.month;
      const anio = fecha.year;

      const resumen = await this.getResumen(empresaId, { mes, anio });

      resultado.push({
        mes,
        anio,
        label: `${nombresMeses[mes - 1]} ${anio.toString().slice(-2)}`,
        ingresos: resumen.ingresos,
        ceses: resumen.ceses,
        vencimientos: resumen.vencimientos,
      });
    }

    return resultado;
  }

  async findAll(empresaId: number, filters: FilterMovimientosDto) {
    try {
      const { fechaDesde, fechaHasta } = this.getFechasDelPeriodo(filters);
      const tipo = filters.tipo ?? TipoMovimiento.TODOS;
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      const movimientos: MovimientoPersonal[] = [];
      const hoy = ahoraPeru().startOf('day').toJSDate();

      this.logger.debug(
        `Buscando movimientos: empresa=${empresaId}, periodo=${fechaDesde.toISOString()} - ${fechaHasta.toISOString()}, tipo=${tipo}`,
      );

      // Filtro de estado del empleado (si no es TODOS o no está definido, no filtrar)
      const estadoFiltro =
        filters.estado && filters.estado !== EstadoEmpleadoFiltro.TODOS
          ? filters.estado
          : undefined;

      const whereEmpleadoBase: Prisma.EmpleadoWhereInput = {
        empresa_id: empresaId,
        ...(estadoFiltro && { estado: estadoFiltro }),
        ...(filters.cliente_id && {
          sede: { cliente_id: filters.cliente_id },
        }),
        ...(filters.sede_id && { sede_id: filters.sede_id }),
        ...(filters.area_id && { area_id: filters.area_id }),
        ...(filters.buscar && {
          OR: [
            {
              numero_documento: {
                contains: filters.buscar,
                mode: 'insensitive',
              },
            },
            { nombres: { contains: filters.buscar, mode: 'insensitive' } },
            {
              apellido_paterno: {
                contains: filters.buscar,
                mode: 'insensitive',
              },
            },
            {
              apellido_materno: {
                contains: filters.buscar,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      // Obtener INGRESOS
      if (tipo === TipoMovimiento.TODOS || tipo === TipoMovimiento.INGRESOS) {
        const ingresos = await this.prisma.empleado.findMany({
          where: {
            ...whereEmpleadoBase,
            fecha_ingreso: {
              gte: fechaDesde,
              lte: fechaHasta,
            },
          },
          include: {
            area: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
            sede: {
              select: {
                nombre: true,
                cliente: {
                  select: { razon_social: true, nombre_comercial: true },
                },
              },
            },
          },
          orderBy: { fecha_ingreso: 'desc' },
        });

        for (const emp of ingresos) {
          movimientos.push({
            id: emp.id,
            tipo: 'INGRESO',
            empleado_id: emp.id,
            numero_documento: emp.numero_documento,
            nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
            area: emp.area?.nombre,
            sede: emp.sede?.nombre,
            cargo: emp.cargo?.nombre,
            cliente:
              emp.sede?.cliente?.nombre_comercial ||
              emp.sede?.cliente?.razon_social,
            fecha_movimiento: emp.fecha_ingreso.toISOString(),
            estado_empleado: emp.estado,
          });
        }
      }

      // Obtener CESES
      if (tipo === TipoMovimiento.TODOS || tipo === TipoMovimiento.CESES) {
        const ceses = await this.prisma.empleado.findMany({
          where: {
            ...whereEmpleadoBase,
            fecha_cese: {
              gte: fechaDesde,
              lte: fechaHasta,
            },
          },
          include: {
            area: { select: { nombre: true } },
            cargo: { select: { nombre: true } },
            sede: {
              select: {
                nombre: true,
                cliente: {
                  select: { razon_social: true, nombre_comercial: true },
                },
              },
            },
            movimientos: {
              where: { tipo_movimiento: { in: ['BAJA', 'RENUNCIA'] } },
              orderBy: { fecha_movimiento: 'desc' },
              take: 1,
              select: { motivo: true },
            },
          },
          orderBy: { fecha_cese: 'desc' },
        });

        for (const emp of ceses) {
          movimientos.push({
            id: emp.id,
            tipo: 'CESE',
            empleado_id: emp.id,
            numero_documento: emp.numero_documento,
            nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
            area: emp.area?.nombre,
            sede: emp.sede?.nombre,
            cargo: emp.cargo?.nombre,
            cliente:
              emp.sede?.cliente?.nombre_comercial ||
              emp.sede?.cliente?.razon_social,
            fecha_movimiento: emp.fecha_cese.toISOString(),
            motivo: emp.movimientos?.[0]?.motivo || undefined,
            estado_empleado: emp.estado,
          });
        }
      }

      // Obtener VENCIMIENTOS
      if (
        tipo === TipoMovimiento.TODOS ||
        tipo === TipoMovimiento.VENCIMIENTOS
      ) {
        const vencimientos = await this.prisma.contrato.findMany({
          where: {
            empleado: {
              empresa_id: empresaId,
              ...(estadoFiltro && { estado: estadoFiltro }),
              ...(filters.cliente_id && {
                sede: { cliente_id: filters.cliente_id },
              }),
              ...(filters.sede_id && { sede_id: filters.sede_id }),
              ...(filters.area_id && { area_id: filters.area_id }),
              ...(filters.buscar && {
                OR: [
                  {
                    numero_documento: {
                      contains: filters.buscar,
                      mode: 'insensitive',
                    },
                  },
                  {
                    nombres: { contains: filters.buscar, mode: 'insensitive' },
                  },
                  {
                    apellido_paterno: {
                      contains: filters.buscar,
                      mode: 'insensitive',
                    },
                  },
                  {
                    apellido_materno: {
                      contains: filters.buscar,
                      mode: 'insensitive',
                    },
                  },
                ],
              }),
            },
            estado: 'ACTIVO',
            fecha_fin: {
              gte: fechaDesde,
              lte: fechaHasta,
            },
          },
          include: {
            empleado: {
              include: {
                area: { select: { nombre: true } },
                cargo: { select: { nombre: true } },
                sede: {
                  select: {
                    nombre: true,
                    cliente: {
                      select: { razon_social: true, nombre_comercial: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { fecha_fin: 'asc' },
        });

        for (const contrato of vencimientos) {
          const emp = contrato.empleado;
          const fechaFin = contrato.fecha_fin;
          const diasRestantes = Math.ceil(
            (fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
          );

          movimientos.push({
            id: contrato.id,
            tipo: 'VENCIMIENTO',
            empleado_id: emp.id,
            numero_documento: emp.numero_documento,
            nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
            area: emp.area?.nombre,
            sede: emp.sede?.nombre,
            cargo: emp.cargo?.nombre,
            cliente:
              emp.sede?.cliente?.nombre_comercial ||
              emp.sede?.cliente?.razon_social,
            fecha_movimiento: fechaFin.toISOString(),
            dias_restantes: diasRestantes,
            estado_empleado: emp.estado,
          });
        }
      }

      // Ordenar por fecha (más reciente primero para ingresos/ceses, más próximo primero para vencimientos)
      movimientos.sort((a, b) => {
        if (a.tipo === 'VENCIMIENTO' && b.tipo === 'VENCIMIENTO') {
          return (
            new Date(a.fecha_movimiento).getTime() -
            new Date(b.fecha_movimiento).getTime()
          );
        }
        return (
          new Date(b.fecha_movimiento).getTime() -
          new Date(a.fecha_movimiento).getTime()
        );
      });

      const total = movimientos.length;
      const paginatedData = movimientos.slice(skip, skip + limit);

      const [resumen, tendencia, historico] = await Promise.all([
        this.getResumen(empresaId, filters),
        this.getTendencia(empresaId, filters),
        this.getHistorico(empresaId, 6),
      ]);

      // Si no hay movimientos, obtener información de los últimos períodos con datos
      let ultimosPeriodos: UltimosPeriodosConDatos | undefined;
      if (total === 0) {
        ultimosPeriodos = await this.getUltimosPeriodosConDatos(empresaId);
      }

      return {
        resumen,
        tendencia,
        historico,
        data: paginatedData,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        ultimosPeriodos,
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error en findAll: ${mensaje}`, stack);
      throw error;
    }
  }

  async getUltimosPeriodosConDatos(
    empresaId: number,
  ): Promise<UltimosPeriodosConDatos> {
    const [ultimoCese, ultimoIngreso, ultimoVencimiento] = await Promise.all([
      // Último cese
      this.prisma.empleado.findFirst({
        where: {
          empresa_id: empresaId,
          fecha_cese: { not: null },
        },
        orderBy: { fecha_cese: 'desc' },
        select: { fecha_cese: true },
      }),
      // Último ingreso
      this.prisma.empleado.findFirst({
        where: {
          empresa_id: empresaId,
          fecha_ingreso: { not: null },
        },
        orderBy: { fecha_ingreso: 'desc' },
        select: { fecha_ingreso: true },
      }),
      // Último vencimiento de contrato activo
      this.prisma.contrato.findFirst({
        where: {
          empleado: { empresa_id: empresaId },
          estado: 'ACTIVO',
          fecha_fin: { not: null },
        },
        orderBy: { fecha_fin: 'desc' },
        select: { fecha_fin: true },
      }),
    ]);

    const result: UltimosPeriodosConDatos = {};

    if (ultimoCese?.fecha_cese) {
      const fecha = new Date(ultimoCese.fecha_cese);
      result.ultimoCese = {
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
      };
    }

    if (ultimoIngreso?.fecha_ingreso) {
      const fecha = new Date(ultimoIngreso.fecha_ingreso);
      result.ultimoIngreso = {
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
      };
    }

    if (ultimoVencimiento?.fecha_fin) {
      const fecha = new Date(ultimoVencimiento.fecha_fin);
      result.ultimoVencimiento = {
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
      };
    }

    return result;
  }

  async exportarExcel(
    empresaId: number,
    filters: FilterMovimientosDto,
  ): Promise<ExcelJS.Workbook> {
    const { fechaDesde, fechaHasta } = this.getFechasDelPeriodo(filters);

    // Obtener todos los datos sin paginación
    const filtersNoPaging = { ...filters, page: 1, limit: 10000 };
    const { data: movimientos, resumen } = await this.findAll(
      empresaId,
      filtersNoPaging,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERMIR RRHH';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Movimientos de Personal');

    // Título
    const periodoText =
      filters.mes && filters.anio
        ? `${filters.mes.toString().padStart(2, '0')}/${filters.anio}`
        : `${fechaDesde.toLocaleDateString('es-PE')} - ${fechaHasta.toLocaleDateString('es-PE')}`;

    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `MOVIMIENTOS DE PERSONAL - ${periodoText}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Resumen
    worksheet.getCell('A3').value = 'Resumen:';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('B3').value = `Ingresos: ${resumen.ingresos}`;
    worksheet.getCell('C3').value = `Ceses: ${resumen.ceses}`;
    worksheet.getCell('D3').value = `Vencimientos: ${resumen.vencimientos}`;

    // Headers
    const headerRow = worksheet.getRow(5);
    const headers = [
      'Tipo',
      'DNI',
      'Nombre Completo',
      'Cargo',
      'Área',
      'Sede',
      'Cliente',
      'Fecha',
      'Días Rest.',
      'Motivo',
      'Estado',
    ];

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Datos
    movimientos.forEach((mov, index) => {
      const row = worksheet.getRow(6 + index);

      const tipoLabel =
        mov.tipo === 'INGRESO'
          ? 'INGRESO'
          : mov.tipo === 'CESE'
            ? 'CESE'
            : 'VENCIMIENTO';

      const fechaFormatted = new Date(mov.fecha_movimiento).toLocaleDateString(
        'es-PE',
      );

      row.getCell(1).value = tipoLabel;
      row.getCell(2).value = mov.numero_documento;
      row.getCell(3).value = mov.nombre_completo;
      row.getCell(4).value = mov.cargo || '-';
      row.getCell(5).value = mov.area || '-';
      row.getCell(6).value = mov.sede || '-';
      row.getCell(7).value = mov.cliente || '-';
      row.getCell(8).value = fechaFormatted;
      row.getCell(9).value =
        mov.dias_restantes !== undefined ? `${mov.dias_restantes} días` : '-';
      row.getCell(10).value = mov.motivo || '-';
      row.getCell(11).value = mov.estado_empleado;

      // Color por tipo
      const fillColor =
        mov.tipo === 'INGRESO'
          ? 'C6EFCE'
          : mov.tipo === 'CESE'
            ? 'FFC7CE'
            : 'FFEB9C';

      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Ajustar anchos de columna
    worksheet.columns = [
      { width: 15 }, // Tipo
      { width: 12 }, // DNI
      { width: 35 }, // Nombre
      { width: 20 }, // Cargo
      { width: 15 }, // Área
      { width: 20 }, // Sede
      { width: 25 }, // Cliente
      { width: 12 }, // Fecha
      { width: 12 }, // Días Rest.
      { width: 20 }, // Motivo
      { width: 12 }, // Estado
    ];

    return workbook;
  }
}
