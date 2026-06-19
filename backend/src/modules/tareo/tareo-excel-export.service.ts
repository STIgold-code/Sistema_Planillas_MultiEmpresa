import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { LOGO_ERMIR_PATH } from '../../common/utils/assets.util';
import { isDiaEnContrato } from './tareo-excel-helpers';
import { appendLeyendaSheet } from './tareo-excel-sheets/leyenda';
import { appendAlertasSheet } from './tareo-excel-sheets/alertas';
import { appendDetalleSheet } from './tareo-excel-sheets/detalle';
import { appendResumenSheet } from './tareo-excel-sheets/resumen';

@Injectable()
export class TareoExcelExportService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // EXPORTAR EXCEL PROFESIONAL
  // ========================================
  async exportarExcel(
    periodoId: number,
    empresaId: number,
  ): Promise<ExcelJS.Workbook> {
    // Obtener empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { razon_social: true, ruc: true },
    });

    // Obtener periodo
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: periodoId, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new BadRequestException('Periodo no encontrado');
    }

    // Obtener tareos con detalles completos
    const tareos = await this.prisma.tareo.findMany({
      where: { periodo_id: periodoId },
      orderBy: [
        { area: { nombre: 'asc' } },
        { sede: { nombre: 'asc' } },
        { empleado: { apellido_paterno: 'asc' } },
      ],
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            apellido_paterno: true,
            apellido_materno: true,
            nombres: true,
          },
        },
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        detalles: {
          orderBy: { dia: 'asc' },
          include: {
            tipo_marcacion: {
              select: {
                id: true,
                codigo: true,
                color: true,
                cuenta_como: true,
                es_feriado_trabajado: true,
              },
            },
          },
        },
      },
    });

    // Obtener contratos vigentes
    const empleadoIds = tareos.map((t) => t.empleado.id);
    const contratos = await this.prisma.contrato.findMany({
      where: {
        empleado_id: { in: empleadoIds },
        estado: 'ACTIVO',
      },
      orderBy: { fecha_inicio: 'desc' },
    });
    const contratosPorEmpleado = new Map<
      number,
      { fecha_inicio: Date; fecha_fin: Date | null }
    >();
    for (const c of contratos) {
      if (!contratosPorEmpleado.has(c.empleado_id)) {
        contratosPorEmpleado.set(c.empleado_id, {
          fecha_inicio: c.fecha_inicio,
          fecha_fin: c.fecha_fin,
        });
      }
    }

    // Obtener tipos de marcación
    const tiposMarcacion = await this.prisma.tipoMarcacion.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
    });

    const diasDelMes = new Date(periodo.anio, periodo.mes, 0).getDate();

    // ========================================
    // CALCULAR ESTADÍSTICAS
    // ========================================
    let totalDM = 0,
      totalLSG = 0,
      totalF = 0,
      totalDT = 0,
      totalFT = 0;
    const statsPorArea = new Map<
      string,
      {
        dm: number;
        lsg: number;
        f: number;
        dt: number;
        ft: number;
        empleados: number;
      }
    >();
    const statsPorSede = new Map<
      string,
      {
        dm: number;
        lsg: number;
        f: number;
        dt: number;
        ft: number;
        empleados: number;
      }
    >();
    const alertasFaltas: Array<{
      nombre: string;
      dni: string;
      area: string;
      faltas: number;
    }> = [];
    const alertasSinMarcacion: Array<{
      nombre: string;
      dni: string;
      diasSinMarcacion: number;
    }> = [];

    // Procesar cada tareo
    const tareosProcesados = tareos.map((tareo) => {
      const contrato = contratosPorEmpleado.get(tareo.empleado.id);
      const nombreCompleto = `${tareo.empleado.apellido_paterno} ${tareo.empleado.apellido_materno}, ${tareo.empleado.nombres}`;
      const areaName = tareo.area?.nombre || 'Sin Área';
      const sedeName = tareo.sede?.nombre || 'Sin Sede';

      // Inicializar stats por área/sede
      if (!statsPorArea.has(areaName)) {
        statsPorArea.set(areaName, {
          dm: 0,
          lsg: 0,
          f: 0,
          dt: 0,
          ft: 0,
          empleados: 0,
        });
      }
      if (!statsPorSede.has(sedeName)) {
        statsPorSede.set(sedeName, {
          dm: 0,
          lsg: 0,
          f: 0,
          dt: 0,
          ft: 0,
          empleados: 0,
        });
      }
      statsPorArea.get(areaName).empleados++;
      statsPorSede.get(sedeName).empleados++;

      // Contadores individuales
      let dm = 0,
        lsg = 0,
        f = 0,
        dt = 0,
        ft = 0;
      let diasSinMarcacion = 0;
      const detallesMap = new Map(tareo.detalles.map((d) => [d.dia, d]));

      for (let dia = 1; dia <= diasDelMes; dia++) {
        const enContrato = isDiaEnContrato(
          dia,
          periodo.mes,
          periodo.anio,
          contrato?.fecha_inicio || null,
          contrato?.fecha_fin || null,
        );
        if (!enContrato) continue;

        const detalle = detallesMap.get(dia);
        if (!detalle?.tipo_marcacion) {
          diasSinMarcacion++;
          continue;
        }

        const codigo = detalle.tipo_marcacion.codigo;
        const esFeriadoTrab = detalle.tipo_marcacion.es_feriado_trabajado;

        if (codigo === 'DM') {
          dm++;
          totalDM++;
          statsPorArea.get(areaName).dm++;
          statsPorSede.get(sedeName).dm++;
        }
        if (codigo === 'LSG') {
          lsg++;
          totalLSG++;
          statsPorArea.get(areaName).lsg++;
          statsPorSede.get(sedeName).lsg++;
        }
        if (codigo === 'F') {
          f++;
          totalF++;
          statsPorArea.get(areaName).f++;
          statsPorSede.get(sedeName).f++;
        }
        if (codigo === 'DT') {
          dt++;
          totalDT++;
          statsPorArea.get(areaName).dt++;
          statsPorSede.get(sedeName).dt++;
        }
        if (esFeriadoTrab) {
          ft++;
          totalFT++;
          statsPorArea.get(areaName).ft++;
          statsPorSede.get(sedeName).ft++;
        }
      }

      // Alertas
      if (f >= 3) {
        alertasFaltas.push({
          nombre: nombreCompleto,
          dni: tareo.empleado.numero_documento,
          area: areaName,
          faltas: f,
        });
      }
      if (diasSinMarcacion > 5) {
        alertasSinMarcacion.push({
          nombre: nombreCompleto,
          dni: tareo.empleado.numero_documento,
          diasSinMarcacion,
        });
      }

      return {
        ...tareo,
        nombreCompleto,
        areaName,
        sedeName,
        contrato,
        totales: { dm, lsg, f, dt, ft },
        detallesMap,
      };
    });

    // Ordenar alertas
    alertasFaltas.sort((a, b) => b.faltas - a.faltas);
    alertasSinMarcacion.sort((a, b) => b.diasSinMarcacion - a.diasSinMarcacion);

    // ========================================
    // CREAR WORKBOOK
    // ========================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema RRHH ERMIR';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ========================================
    // CARGAR LOGO
    // ========================================
    let logoImageId: number | null = null;
    try {
      if (fs.existsSync(LOGO_ERMIR_PATH)) {
        logoImageId = workbook.addImage({
          filename: LOGO_ERMIR_PATH,
          extension: 'png',
        });
      }
    } catch {
      // Si no se puede cargar el logo, continuar sin él
      logoImageId = null;
    }

    // ========================================
    // HOJA 1: RESUMEN EJECUTIVO
    // ========================================
    appendResumenSheet(
      workbook,
      logoImageId,
      empresa,
      periodo,
      tareos.length,
      { totalDM, totalLSG, totalF, totalDT, totalFT },
      statsPorArea,
      statsPorSede,
    );

    // ========================================
    // HOJA 2: TAREO DETALLADO
    // ========================================
    appendDetalleSheet(workbook, periodo, diasDelMes, tareosProcesados);

    // ========================================
    // HOJA 3: ALERTAS - TODOS LOS EMPLEADOS
    // ========================================
    appendAlertasSheet(
      workbook,
      periodo,
      tareosProcesados,
      { totalDM, totalLSG, totalF, totalDT, totalFT },
      alertasFaltas,
    );

    // ========================================
    // HOJA 4: LEYENDA - TODOS LOS TIPOS DE MARCACIÓN
    // ========================================
    appendLeyendaSheet(workbook, periodo, tiposMarcacion);

    return workbook;
  }
}
