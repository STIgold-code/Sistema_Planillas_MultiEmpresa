import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { InventarioEntregasService } from './inventario-entregas.service';
import {
  formatearFechaPeru,
  formatearFechaHoraPeru,
} from '../../common/utils/datetime.util';
import {
  EXCEL_COLORS,
  agregarLogoErmir,
  ponerEncabezadoExcel,
  estilarHeaderExcel,
  estilarStripeExcel,
} from '../../common/utils/excel-export.util';

const ESTADO_ITEM_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  ENTREGADO: 'Entregado',
  BAJA: 'Baja',
};

@Injectable()
export class InventarioEntregasExportService {
  constructor(
    private readonly entregas: InventarioEntregasService,
    private readonly prisma: PrismaService,
  ) {}

  private async empresaNombre(empresaId: number): Promise<string> {
    const e = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { razon_social: true, nombre_comercial: true },
    });
    return e?.nombre_comercial || e?.razon_social || 'ERMIR';
  }

  /**
   * Excel con la lista completa de entregas de la empresa.
   */
  async excelLista(empresaId: number): Promise<ExcelJS.Workbook> {
    const empresa = await this.empresaNombre(empresaId);
    const entregas = await this.prisma.entregaUniforme.findMany({
      where: { empresa_id: empresaId },
      include: {
        empleado: {
          select: {
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
          },
        },
        entregado_por: { select: { nombre_completo: true } },
        _count: { select: { items: true } },
      },
      orderBy: { fecha_entrega: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = empresa;
    const logo = agregarLogoErmir(wb);

    const ws = wb.addWorksheet('Entregas');
    ws.columns = [
      { key: 'n', width: 6 },
      { key: 'fecha', width: 14 },
      { key: 'hora', width: 18 },
      { key: 'empleado', width: 36 },
      { key: 'dni', width: 14 },
      { key: 'items', width: 10 },
      { key: 'entregado_por', width: 28 },
    ];
    ponerEncabezadoExcel(ws, logo, empresa, 'Entregas de uniformes — Listado');
    ws.getRow(4).values = [
      'N°',
      'Fecha',
      'Hora de registro',
      'Empleado',
      'DNI',
      'Items',
      'Entregado por',
    ];
    estilarHeaderExcel(ws.getRow(4));

    entregas.forEach((e, idx) => {
      const row = ws.addRow({
        n: idx + 1,
        fecha: formatearFechaPeru(e.fecha_entrega),
        hora: formatearFechaHoraPeru(e.created_at),
        empleado: `${e.empleado.apellido_paterno} ${e.empleado.apellido_materno}, ${e.empleado.nombres}`,
        dni: e.empleado.numero_documento,
        items: e._count.items,
        entregado_por: e.entregado_por.nombre_completo,
      });
      if (idx % 2 === 1) estilarStripeExcel(row);
    });

    return wb;
  }

  /**
   * Excel con el detalle de una entrega: datos de cabecera + prendas entregadas.
   */
  async excelDetalle(id: number, empresaId: number): Promise<ExcelJS.Workbook> {
    const empresa = await this.empresaNombre(empresaId);
    const entrega = await this.entregas.findOne(id, empresaId);
    const nombreEmpleado = `${entrega.empleado.apellido_paterno} ${entrega.empleado.apellido_materno}, ${entrega.empleado.nombres}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = empresa;
    const logo = agregarLogoErmir(wb);

    const ws = wb.addWorksheet('Entrega');
    ws.columns = [
      { key: 'n', width: 6 },
      { key: 'codigo', width: 18 },
      { key: 'prenda', width: 30 },
      { key: 'talla', width: 12 },
      { key: 'estado', width: 14 },
      { key: 'precio', width: 12 },
    ];
    ponerEncabezadoExcel(
      ws,
      logo,
      empresa,
      `Entrega de uniformes #${entrega.id}`,
    );

    // Bloque de datos de cabecera.
    const infos: [string, string][] = [
      ['Empleado', nombreEmpleado],
      ['DNI', entrega.empleado.numero_documento],
      ['Fecha de entrega', formatearFechaPeru(entrega.fecha_entrega)],
      ['Hora de registro', formatearFechaHoraPeru(entrega.created_at)],
      ['Entregado por', entrega.entregado_por.nombre_completo],
      ['Observaciones', entrega.observaciones ?? '—'],
    ];
    let fila = 4;
    for (const [etiqueta, valor] of infos) {
      const c = ws.getCell(`A${fila}`);
      c.value = etiqueta;
      c.font = { bold: true, color: { argb: EXCEL_COLORS.PRIMARY } };
      ws.mergeCells(`B${fila}:F${fila}`);
      ws.getCell(`B${fila}`).value = valor;
      fila++;
    }

    const filaHeader = fila + 1;
    ws.getRow(filaHeader).values = [
      'N°',
      'Código',
      'Prenda',
      'Talla',
      'Estado',
      'Precio',
    ];
    estilarHeaderExcel(ws.getRow(filaHeader));

    entrega.items.forEach((item, idx) => {
      const row = ws.addRow({
        n: idx + 1,
        codigo: item.codigo,
        prenda: item.tipo_uniforme.nombre,
        talla: item.talla,
        estado: ESTADO_ITEM_LABELS[item.estado] ?? item.estado,
        precio: Number(item.precio),
      });
      row.getCell('precio').numFmt = '"S/ "#,##0.00';
      if (idx % 2 === 1) estilarStripeExcel(row);
    });

    return wb;
  }
}
