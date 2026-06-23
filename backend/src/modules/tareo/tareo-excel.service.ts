import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { TareoExcelExportService } from './tareo-excel-export.service';

const CODIGO_SIN_CONTRATO = 'SC';

@Injectable()
export class TareoExcelService {
  constructor(
    private prisma: PrismaService,
    private exportService: TareoExcelExportService,
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

  private isDiaEnContrato(
    dia: number,
    mes: number,
    anio: number,
    fechaInicioContrato: Date | null,
    fechaFinContrato: Date | null,
  ): boolean {
    if (!fechaInicioContrato) return false;

    const fechaDia = new Date(anio, mes - 1, dia);
    fechaDia.setHours(0, 0, 0, 0);
    const inicioContrato = new Date(fechaInicioContrato);
    inicioContrato.setHours(0, 0, 0, 0);

    if (fechaDia < inicioContrato) return false;

    if (fechaFinContrato) {
      const finContrato = new Date(fechaFinContrato);
      finContrato.setHours(23, 59, 59, 999);
      if (fechaDia > finContrato) return false;
    }

    return true;
  }

  private isCodigoPermitidoFueraContrato(codigo: string | null): boolean {
    return codigo === null || codigo === CODIGO_SIN_CONTRATO;
  }

  // ========================================
  // EXPORTAR EXCEL PROFESIONAL
  // ========================================
  async exportarExcel(
    periodoId: number,
    empresaId: number,
  ): Promise<ExcelJS.Workbook> {
    return this.exportService.exportarExcel(periodoId, empresaId);
  }

  // ========================================
  // IMPORTAR EXCEL CON ERRORES DETALLADOS
  // ========================================
  async importarExcel(
    periodoId: number,
    empresaId: number,
    buffer: Buffer,
  ): Promise<{
    preview: {
      empleadosEncontrados: number;
      celdasActualizar: number;
      codigosNoReconocidos: string[];
      dnisNoEncontrados: string[];
    };
    cambios: Array<{
      empleado_id: number;
      dni: string;
      nombre: string;
      dia: number;
      codigoActual: string | null;
      codigoNuevo: string | null;
    }>;
    errores: Array<{
      fila: number;
      columna: string;
      dia: number | null;
      tipo:
        | 'DNI_NO_ENCONTRADO'
        | 'CODIGO_NO_RECONOCIDO'
        | 'DIA_FUERA_CONTRATO'
        | 'CELDA_VACIA'
        | 'DNI_INVALIDO';
      valor: string;
      mensaje: string;
      empleado?: string;
    }>;
  }> {
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: periodoId, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new BadRequestException('Periodo no encontrado');
    }

    if (periodo.estado === 'CERRADO') {
      throw new BadRequestException(
        'No se puede importar a un periodo cerrado',
      );
    }

    if (periodo.estado === 'ANULADO') {
      throw new BadRequestException(
        'No se puede importar a un periodo anulado',
      );
    }

    const tiposMarcacion = await this.prisma.tipoMarcacion.findMany({
      where: { activo: true },
    });
    const codigosValidos = new Set(
      tiposMarcacion.map((t) => t.codigo.toUpperCase()),
    );

    const tareosExistentes = await this.prisma.tareo.findMany({
      where: { periodo_id: periodoId },
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
        detalles: {
          include: { tipo_marcacion: { select: { codigo: true } } },
        },
      },
    });

    const tareosPorDni = new Map(
      tareosExistentes.map((t) => [t.empleado.numero_documento, t]),
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException(
        'No se encontró ninguna hoja en el archivo',
      );
    }

    const headerRow = sheet.getRow(1);
    let dniColIndex = -1;
    let primerDiaColIndex = -1;

    headerRow.eachCell((cell, colNumber) => {
      const value = this.cellToString(cell.value)?.toUpperCase().trim();
      if (value === 'DNI' || value === 'DOCUMENTO') {
        dniColIndex = colNumber;
      }
      if (value === '1' && primerDiaColIndex === -1) {
        primerDiaColIndex = colNumber;
      }
    });

    if (dniColIndex === -1) {
      throw new BadRequestException('No se encontró la columna DNI');
    }
    if (primerDiaColIndex === -1) {
      throw new BadRequestException('No se encontraron las columnas de días');
    }

    const diasDelMes = new Date(periodo.anio, periodo.mes, 0).getDate();

    const cambios: Array<{
      empleado_id: number;
      dni: string;
      nombre: string;
      dia: number;
      codigoActual: string | null;
      codigoNuevo: string | null;
    }> = [];
    const errores: Array<{
      fila: number;
      columna: string;
      dia: number | null;
      tipo:
        | 'DNI_NO_ENCONTRADO'
        | 'CODIGO_NO_RECONOCIDO'
        | 'DIA_FUERA_CONTRATO'
        | 'CELDA_VACIA'
        | 'DNI_INVALIDO';
      valor: string;
      mensaje: string;
      empleado?: string;
    }> = [];
    const codigosNoReconocidos = new Set<string>();
    const dnisNoEncontrados = new Set<string>();
    const empleadosEncontrados = new Set<string>();

    // Obtener contratos para validar días fuera de contrato
    const empleadoIds = Array.from(tareosPorDni.values()).map(
      (t) => t.empleado.id,
    );
    const contratos = await this.prisma.contrato.findMany({
      where: { empleado_id: { in: empleadoIds }, estado: 'ACTIVO' },
      orderBy: { fecha_inicio: 'desc' },
    });
    const empleadoToContrato = new Map<
      number,
      { fecha_inicio: Date; fecha_fin: Date | null }
    >();
    for (const contrato of contratos) {
      if (!empleadoToContrato.has(contrato.empleado_id)) {
        empleadoToContrato.set(contrato.empleado_id, {
          fecha_inicio: contrato.fecha_inicio,
          fecha_fin: contrato.fecha_fin,
        });
      }
    }

    // Helper para obtener letra de columna
    const getColumnLetter = (colIndex: number): string => {
      let letter = '';
      let temp = colIndex;
      while (temp > 0) {
        const mod = (temp - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        temp = Math.floor((temp - 1) / 26);
      }
      return letter;
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const dniCell = row.getCell(dniColIndex);
      const dni = this.cellToString(dniCell.value)?.trim();
      const dniColumna = getColumnLetter(dniColIndex);

      // Validar DNI vacío o inválido
      if (!dni) {
        errores.push({
          fila: rowNumber,
          columna: dniColumna,
          dia: null,
          tipo: 'DNI_INVALIDO',
          valor: '',
          mensaje: 'Celda de DNI vacía',
        });
        return;
      }

      if (dni.length < 8) {
        errores.push({
          fila: rowNumber,
          columna: dniColumna,
          dia: null,
          tipo: 'DNI_INVALIDO',
          valor: dni,
          mensaje: `DNI "${dni}" tiene menos de 8 caracteres`,
        });
        return;
      }

      const tareo = tareosPorDni.get(dni);
      if (!tareo) {
        dnisNoEncontrados.add(dni);
        errores.push({
          fila: rowNumber,
          columna: dniColumna,
          dia: null,
          tipo: 'DNI_NO_ENCONTRADO',
          valor: dni,
          mensaje: `Empleado con DNI "${dni}" no existe en el sistema o no tiene tareo en este período`,
        });
        return;
      }

      empleadosEncontrados.add(dni);
      const nombreEmpleado = `${tareo.empleado.apellido_paterno} ${tareo.empleado.apellido_materno}, ${tareo.empleado.nombres}`;
      const detallesMap = new Map(tareo.detalles.map((d) => [d.dia, d]));
      const contrato = empleadoToContrato.get(tareo.empleado.id);

      for (let dia = 1; dia <= diasDelMes; dia++) {
        const colIndex = primerDiaColIndex + dia - 1;
        const cell = row.getCell(colIndex);
        const columna = getColumnLetter(colIndex);
        let codigoNuevo =
          this.cellToString(cell.value)?.trim().toUpperCase() || null;
        const valorOriginal = this.cellToString(cell.value)?.trim() || '';

        // Validar si el día está fuera del contrato
        const diaEnContrato = this.isDiaEnContrato(
          dia,
          periodo.mes,
          periodo.anio,
          contrato?.fecha_inicio || null,
          contrato?.fecha_fin || null,
        );

        if (
          !diaEnContrato &&
          codigoNuevo &&
          !this.isCodigoPermitidoFueraContrato(codigoNuevo)
        ) {
          errores.push({
            fila: rowNumber,
            columna,
            dia,
            tipo: 'DIA_FUERA_CONTRATO',
            valor: valorOriginal,
            mensaje: `Día ${dia} está fuera del contrato. Solo se permite vacío o "SC"`,
            empleado: nombreEmpleado,
          });
          codigoNuevo = null; // No aplicar este cambio
          continue;
        }

        // Validar código no reconocido
        if (codigoNuevo && !codigosValidos.has(codigoNuevo)) {
          codigosNoReconocidos.add(codigoNuevo);
          errores.push({
            fila: rowNumber,
            columna,
            dia,
            tipo: 'CODIGO_NO_RECONOCIDO',
            valor: valorOriginal,
            mensaje: `Código "${valorOriginal}" no es válido. Códigos permitidos: ${Array.from(codigosValidos).join(', ')}`,
            empleado: nombreEmpleado,
          });
          codigoNuevo = null; // No aplicar este cambio
          continue;
        }

        const detalleActual = detallesMap.get(dia);
        const codigoActual = detalleActual?.tipo_marcacion?.codigo || null;

        if (codigoNuevo !== codigoActual) {
          cambios.push({
            empleado_id: tareo.empleado.id,
            dni: tareo.empleado.numero_documento,
            nombre: nombreEmpleado,
            dia,
            codigoActual,
            codigoNuevo,
          });
        }
      }
    });

    return {
      preview: {
        empleadosEncontrados: empleadosEncontrados.size,
        celdasActualizar: cambios.length,
        codigosNoReconocidos: Array.from(codigosNoReconocidos),
        dnisNoEncontrados: Array.from(dnisNoEncontrados),
      },
      cambios,
      errores,
    };
  }

  async aplicarImportacion(
    periodoId: number,
    empresaId: number,
    usuarioId: number,
    cambios: Array<{ empleado_id: number; dia: number; codigo: string | null }>,
    ipAddress?: string,
  ): Promise<{ total: number; aplicados: number; errores: number }> {
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: periodoId, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new BadRequestException('Periodo no encontrado');
    }

    if (periodo.estado === 'CERRADO') {
      throw new BadRequestException(
        'No se puede importar a un periodo cerrado',
      );
    }

    if (periodo.estado === 'ANULADO') {
      throw new BadRequestException(
        'No se puede importar a un periodo anulado',
      );
    }

    const tiposMarcacion = await this.prisma.tipoMarcacion.findMany();
    const codigoToId = new Map(
      tiposMarcacion.map((t) => [t.codigo.toUpperCase(), t.id]),
    );
    const codigoToTipo = new Map(
      tiposMarcacion.map((t) => [t.codigo.toUpperCase(), t]),
    );

    const empleadoIds = [...new Set(cambios.map((c) => c.empleado_id))];
    const empleadosValidos = await this.prisma.empleado.findMany({
      where: { id: { in: empleadoIds }, empresa_id: empresaId },
      select: { id: true },
    });
    const empleadoIdsValidos = new Set(empleadosValidos.map((e) => e.id));

    const empleadoIdsSeguro = empleadoIds.filter((id) =>
      empleadoIdsValidos.has(id),
    );
    const contratos = await this.prisma.contrato.findMany({
      where: { empleado_id: { in: empleadoIdsSeguro }, estado: 'ACTIVO' },
      orderBy: { fecha_inicio: 'desc' },
    });
    const empleadoToContrato = new Map<
      number,
      { fecha_inicio: Date; fecha_fin: Date | null }
    >();
    for (const contrato of contratos) {
      if (!empleadoToContrato.has(contrato.empleado_id)) {
        empleadoToContrato.set(contrato.empleado_id, {
          fecha_inicio: contrato.fecha_inicio,
          fecha_fin: contrato.fecha_fin,
        });
      }
    }

    const tareos = await this.prisma.tareo.findMany({
      where: { periodo_id: periodoId, empleado_id: { in: empleadoIdsSeguro } },
      select: { id: true, empleado_id: true },
    });
    const empleadoToTareo = new Map(tareos.map((t) => [t.empleado_id, t.id]));

    const tareoIds = tareos.map((t) => t.id);
    const diasRequeridos = [...new Set(cambios.map((c) => c.dia))];
    const detalles = await this.prisma.tareoDetalle.findMany({
      where: { tareo_id: { in: tareoIds }, dia: { in: diasRequeridos } },
      select: { id: true, tareo_id: true, dia: true, tipo_marcacion_id: true },
    });

    const idToCodigo = new Map(tiposMarcacion.map((t) => [t.id, t.codigo]));
    const detalleMap = new Map(
      detalles.map((d) => [`${d.tareo_id}-${d.dia}`, d]),
    );

    const updates: Array<{
      id: number;
      tipo_marcacion_id: number | null;
      horas?: number;
    }> = [];
    const audits: Array<{
      tareo_detalle_id: number;
      valor_anterior: string | null;
      valor_nuevo: string | null;
      usuario_id: number;
      ip_address: string | null;
    }> = [];
    let errores = 0;

    for (const cambio of cambios) {
      if (!empleadoIdsValidos.has(cambio.empleado_id)) {
        errores++;
        continue;
      }

      const tareoId = empleadoToTareo.get(cambio.empleado_id);
      if (!tareoId) {
        errores++;
        continue;
      }

      const detalle = detalleMap.get(`${tareoId}-${cambio.dia}`);
      if (!detalle) {
        errores++;
        continue;
      }

      const contrato = empleadoToContrato.get(cambio.empleado_id);
      const diaEnContrato = this.isDiaEnContrato(
        cambio.dia,
        periodo.mes,
        periodo.anio,
        contrato?.fecha_inicio || null,
        contrato?.fecha_fin || null,
      );

      if (
        !diaEnContrato &&
        !this.isCodigoPermitidoFueraContrato(
          cambio.codigo?.toUpperCase() || null,
        )
      ) {
        errores++;
        continue;
      }

      const tipoMarcacionId = cambio.codigo
        ? codigoToId.get(cambio.codigo.toUpperCase()) || null
        : null;
      const valorAnterior = detalle.tipo_marcacion_id
        ? idToCodigo.get(detalle.tipo_marcacion_id) || null
        : null;

      const tipo = cambio.codigo
        ? codigoToTipo.get(cambio.codigo.toUpperCase())
        : null;
      const horasCalc = tipo?.requiere_calculo
        ? (tipo.horas_diurnas ?? 0) + (tipo.horas_nocturnas ?? 0)
        : undefined;

      updates.push({
        id: detalle.id,
        tipo_marcacion_id: tipoMarcacionId,
        horas: horasCalc,
      });
      audits.push({
        tareo_detalle_id: detalle.id,
        valor_anterior: valorAnterior,
        valor_nuevo: cambio.codigo || null,
        usuario_id: usuarioId,
        ip_address: ipAddress || null,
      });
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(
        async (tx) => {
          for (const update of updates) {
            await tx.tareoDetalle.update({
              where: { id: update.id },
              data: {
                tipo_marcacion_id: update.tipo_marcacion_id,
                horas: update.horas,
              },
            });
          }
          await tx.tareoDetalleAudit.createMany({ data: audits });
        },
        { maxWait: 10000, timeout: 60000 },
      );
    }

    return { total: cambios.length, aplicados: updates.length, errores };
  }
}
