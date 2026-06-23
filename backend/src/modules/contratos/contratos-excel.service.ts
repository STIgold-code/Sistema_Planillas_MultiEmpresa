import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { ContratosExcelExportService } from './contratos-excel-export.service';
import { obtenerMensajeError } from '../../common/utils/error.util';

export interface ContratoImportRow {
  dni: string;
  nombre: string;
  tipo_contrato: string;
  modalidad: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  sueldo: number | null;
  area: string;
  sede: string;
  cargo: string;
  fecha_cese: Date | null;
  motivo_cese: string;
}

export interface ImportPreview {
  total_filas: number;
  empleados_encontrados: number;
  empleados_no_encontrados: string[];
  contratos_nuevos: number;
  contratos_actualizar: number;
  errores: string[];
}

export interface ContratoParaImportar {
  empleado_id: number;
  dni: string;
  nombre: string;
  tipo_contrato: string;
  modalidad: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  sueldo: number | null;
  fecha_cese: Date | null;
  motivo_cese: string;
  accion: 'CREAR' | 'ACTUALIZAR';
  contrato_existente_id?: number;
}

@Injectable()
export class ContratosExcelService {
  constructor(
    private prisma: PrismaService,
    private contratosExcelExportService: ContratosExcelExportService,
  ) {}

  /**
   * Convierte el valor de una celda de ExcelJS (CellValue, un union que incluye
   * objetos como fórmulas o hipervínculos) a su representación de texto, sin
   * producir "[object Object]". Equivalente a leer el texto plano de la celda.
   */
  private cellToString(value: ExcelJS.CellValue): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    if (value instanceof Date) return value.toISOString();
    // Objetos de ExcelJS: fórmula (.result), hipervínculo (.text) o richtext.
    if ('result' in value) {
      const { result } = value;
      if (result instanceof Date) return result.toISOString();
      if (
        typeof result === 'string' ||
        typeof result === 'number' ||
        typeof result === 'boolean'
      ) {
        return String(result);
      }
      return undefined;
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }
    if ('richText' in value) {
      return value.richText.map((r) => r.text).join('');
    }
    return undefined;
  }

  private parseExcelDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return value;
    }

    // Si es string con formato DD/MM/YYYY
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }

    // Si es número (serial de Excel)
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + value * 86400000);
    }

    return null;
  }

  async previewImport(
    empresaId: number,
    buffer: Buffer,
  ): Promise<{ preview: ImportPreview; contratos: ContratoParaImportar[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Buscar hoja "Data"
    let sheet = workbook.getWorksheet('Data');
    if (!sheet) {
      // Intentar primera hoja
      sheet = workbook.worksheets[0];
    }

    if (!sheet) {
      throw new BadRequestException(
        'No se encontró ninguna hoja en el archivo',
      );
    }

    // Detectar columnas (headers en fila 1)
    const headerRow = sheet.getRow(1);
    const columnMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      const value = this.cellToString(cell.value)?.toUpperCase().trim() || '';
      if (value.includes('DOCUMENTO') || value === 'DNI') {
        columnMap['DOCUMENTO'] = colNumber;
      } else if (
        value.includes('APELLIDOS') ||
        value.includes('NOMBRES') ||
        value === 'PERSONA'
      ) {
        columnMap['NOMBRE'] = colNumber;
      } else if (value.includes('INICIO') && value.includes('CONTRATO')) {
        columnMap['INICIO'] = colNumber;
      } else if (value.includes('TERMINO') || value.includes('FIN')) {
        columnMap['FIN'] = colNumber;
      } else if (value.includes('TIP') && value.includes('CONTRATO')) {
        columnMap['TIPO'] = colNumber;
      } else if (value === 'MODALIDAD') {
        columnMap['MODALIDAD'] = colNumber;
      } else if (value === 'SUELDO') {
        columnMap['SUELDO'] = colNumber;
      } else if (value === 'AREA') {
        columnMap['AREA'] = colNumber;
      } else if (value === 'SEDE') {
        columnMap['SEDE'] = colNumber;
      } else if (value === 'CARGO') {
        columnMap['CARGO'] = colNumber;
      } else if (value.includes('FECHA') && value.includes('CESE')) {
        columnMap['FECHA_CESE'] = colNumber;
      } else if (value.includes('MOTIVO') && value.includes('CESE')) {
        columnMap['MOTIVO_CESE'] = colNumber;
      } else if (value === 'MOTIVO CESE' || value === 'MOTIVO_CESE') {
        columnMap['MOTIVO_CESE'] = colNumber;
      }
    });

    // Validar columnas requeridas
    if (!columnMap['DOCUMENTO']) {
      throw new BadRequestException('No se encontró la columna DOCUMENTO');
    }
    if (!columnMap['INICIO']) {
      throw new BadRequestException(
        'No se encontró la columna INICIO DE CONTRATO',
      );
    }
    if (!columnMap['FIN']) {
      throw new BadRequestException(
        'No se encontró la columna TERMINO DE CONTRATO',
      );
    }

    // Leer filas de datos
    const rows: ContratoImportRow[] = [];
    const errores: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const dniCell = row.getCell(columnMap['DOCUMENTO']);
      const dni = this.cellToString(dniCell.value)?.trim();

      if (!dni || dni.length < 7) return; // Skip filas sin DNI válido

      const fechaInicio = this.parseExcelDate(
        row.getCell(columnMap['INICIO']).value,
      );
      const fechaFin = this.parseExcelDate(row.getCell(columnMap['FIN']).value);

      if (!fechaInicio) {
        errores.push(`Fila ${rowNumber}: DNI ${dni} - Fecha inicio inválida`);
        return;
      }

      if (!fechaFin) {
        errores.push(`Fila ${rowNumber}: DNI ${dni} - Fecha fin inválida`);
        return;
      }

      const sueldoCell = row.getCell(columnMap['SUELDO'] || 0);
      let sueldo: number | null = null;
      if (sueldoCell.value) {
        const sueldoNum = parseFloat(
          (this.cellToString(sueldoCell.value) ?? '').replace(',', '.'),
        );
        if (!isNaN(sueldoNum)) {
          sueldo = sueldoNum;
        }
      }

      // Parsear fecha de cese si existe
      const fechaCese = columnMap['FECHA_CESE']
        ? this.parseExcelDate(row.getCell(columnMap['FECHA_CESE']).value)
        : null;

      // Leer motivo de cese si existe
      const motivoCese = columnMap['MOTIVO_CESE']
        ? this.cellToString(
            row.getCell(columnMap['MOTIVO_CESE']).value,
          )?.trim() || ''
        : '';

      rows.push({
        dni,
        nombre:
          this.cellToString(
            row.getCell(columnMap['NOMBRE'] || 0).value,
          )?.trim() || '',
        tipo_contrato:
          this.cellToString(
            row.getCell(columnMap['TIPO'] || 0).value,
          )?.trim() || 'PLAZO FIJO',
        modalidad:
          this.cellToString(
            row.getCell(columnMap['MODALIDAD'] || 0).value,
          )?.trim() || 'RENOVACION',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        sueldo,
        area:
          this.cellToString(
            row.getCell(columnMap['AREA'] || 0).value,
          )?.trim() || '',
        sede:
          this.cellToString(
            row.getCell(columnMap['SEDE'] || 0).value,
          )?.trim() || '',
        cargo:
          this.cellToString(
            row.getCell(columnMap['CARGO'] || 0).value,
          )?.trim() || '',
        fecha_cese: fechaCese,
        motivo_cese: motivoCese,
      });
    });

    // Buscar empleados por DNI
    const dnis = [...new Set(rows.map((r) => r.dni))];
    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        numero_documento: { in: dnis },
      },
      select: {
        id: true,
        numero_documento: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        contratos: {
          where: { estado: 'ACTIVO' },
          select: { id: true, fecha_inicio: true, fecha_fin: true },
          orderBy: { fecha_inicio: 'desc' },
          take: 1,
        },
      },
    });

    const empleadoMap = new Map(empleados.map((e) => [e.numero_documento, e]));

    // Preparar contratos para importar
    const contratosParaImportar: ContratoParaImportar[] = [];
    const empleadosNoEncontrados = new Set<string>();
    let contratosNuevos = 0;
    let contratosActualizar = 0;

    for (const row of rows) {
      const empleado = empleadoMap.get(row.dni);

      if (!empleado) {
        empleadosNoEncontrados.add(`${row.dni} - ${row.nombre}`);
        continue;
      }

      const contratoVigente = empleado.contratos[0];
      let accion: 'CREAR' | 'ACTUALIZAR' = 'CREAR';
      let contratoExistenteId: number | undefined;

      if (contratoVigente) {
        // Verificar si las fechas son diferentes
        const inicioIgual =
          contratoVigente.fecha_inicio.getTime() === row.fecha_inicio.getTime();
        const finIgual =
          contratoVigente.fecha_fin?.getTime() === row.fecha_fin.getTime();

        if (inicioIgual && finIgual) {
          // No hay cambios, skip
          continue;
        }

        accion = 'ACTUALIZAR';
        contratoExistenteId = contratoVigente.id;
        contratosActualizar++;
      } else {
        contratosNuevos++;
      }

      contratosParaImportar.push({
        empleado_id: empleado.id,
        dni: row.dni,
        nombre: `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`,
        tipo_contrato: row.tipo_contrato,
        modalidad: row.modalidad,
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        sueldo: row.sueldo,
        fecha_cese: row.fecha_cese,
        motivo_cese: row.motivo_cese,
        accion,
        contrato_existente_id: contratoExistenteId,
      });
    }

    return {
      preview: {
        total_filas: rows.length,
        empleados_encontrados: empleados.length,
        empleados_no_encontrados: Array.from(empleadosNoEncontrados),
        contratos_nuevos: contratosNuevos,
        contratos_actualizar: contratosActualizar,
        errores,
      },
      contratos: contratosParaImportar,
    };
  }

  async aplicarImportacion(
    empresaId: number,
    usuarioId: number,
    contratos: ContratoParaImportar[],
  ): Promise<{ creados: number; actualizados: number; errores: string[] }> {
    let creados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (const contrato of contratos) {
      try {
        // Verificar que el empleado pertenece a la empresa
        const empleado = await this.prisma.empleado.findFirst({
          where: {
            id: contrato.empleado_id,
            empresa_id: empresaId,
          },
        });

        if (!empleado) {
          errores.push(`DNI ${contrato.dni}: Empleado no encontrado`);
          continue;
        }

        // Determinar estado basado en fecha_cese
        const estadoContrato = contrato.fecha_cese ? 'CESADO' : 'ACTIVO';

        if (
          contrato.accion === 'ACTUALIZAR' &&
          contrato.contrato_existente_id
        ) {
          // Actualizar contrato existente
          await this.prisma.contrato.update({
            where: { id: contrato.contrato_existente_id },
            data: {
              tipo_contrato: contrato.tipo_contrato,
              modalidad: contrato.modalidad,
              fecha_inicio: contrato.fecha_inicio,
              fecha_fin: contrato.fecha_fin,
              remuneracion: contrato.sueldo,
              fecha_cese: contrato.fecha_cese,
              motivo_cese: contrato.motivo_cese || null,
              estado: estadoContrato,
            },
          });
          actualizados++;
        } else {
          // Marcar contratos vigentes anteriores como RENOVADO
          await this.prisma.contrato.updateMany({
            where: {
              empleado_id: contrato.empleado_id,
              estado: 'ACTIVO',
            },
            data: {
              estado: 'RENOVADO',
            },
          });

          // Crear nuevo contrato
          await this.prisma.contrato.create({
            data: {
              empleado_id: contrato.empleado_id,
              tipo_contrato: contrato.tipo_contrato,
              modalidad: contrato.modalidad,
              fecha_inicio: contrato.fecha_inicio,
              fecha_fin: contrato.fecha_fin,
              estado: estadoContrato,
              remuneracion: contrato.sueldo,
              fecha_cese: contrato.fecha_cese,
              motivo_cese: contrato.motivo_cese || null,
              usuario_id: usuarioId,
              observaciones: 'Importado desde Excel',
            },
          });
          creados++;
        }
      } catch (error: unknown) {
        const mensaje = obtenerMensajeError(error);
        errores.push(`DNI ${contrato.dni}: ${mensaje}`);
      }
    }

    return { creados, actualizados, errores };
  }

  // Colores corporativos

  // ==================== EXPORT (delega a ContratosExcelExportService) ====================

  async exportarContratos(empresaId: number): Promise<ExcelJS.Workbook> {
    return this.contratosExcelExportService.exportarContratos(empresaId);
  }
}
