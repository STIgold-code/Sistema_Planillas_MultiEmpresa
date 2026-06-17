import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { IngresosInventarioService } from './ingresos-inventario.service';
import { formatearFechaPeru } from '../../common/utils/datetime.util';
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
export class IngresosInventarioExportService {
  constructor(
    private readonly ingresos: IngresosInventarioService,
    private readonly prisma: PrismaService,
  ) {}

  private async empresaNombre(empresaId: number): Promise<string> {
    const e = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { razon_social: true, nombre_comercial: true },
    });
    return e?.nombre_comercial || e?.razon_social || 'ERMIR';
  }

  /** Excel con el detalle de un ingreso: cabecera + prendas que ingresaron. */
  async excelDetalle(id: number, empresaId: number): Promise<ExcelJS.Workbook> {
    const empresa = await this.empresaNombre(empresaId);
    const ingreso = await this.ingresos.findOne(id, empresaId);

    const wb = new ExcelJS.Workbook();
    wb.creator = empresa;
    const logo = agregarLogoErmir(wb);

    const ws = wb.addWorksheet('Ingreso');
    ws.columns = [
      { key: 'n', width: 6 },
      { key: 'codigo', width: 18 },
      { key: 'prenda', width: 30 },
      { key: 'talla', width: 12 },
      { key: 'precio', width: 12 },
      { key: 'estado', width: 14 },
    ];
    ponerEncabezadoExcel(
      ws,
      logo,
      empresa,
      `Ingreso de prendas #${ingreso.id}`,
    );

    const infos: [string, string][] = [
      ['Fecha', formatearFechaPeru(ingreso.fecha_ingreso)],
      ['N° Documento', ingreso.numero_documento ?? '—'],
      ['Proveedor', ingreso.proveedor.nombre],
      ['Registrado por', ingreso.usuario.nombre_completo],
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
      'Precio',
      'Estado',
    ];
    estilarHeaderExcel(ws.getRow(filaHeader));

    ingreso.items.forEach((item, idx) => {
      const row = ws.addRow({
        n: idx + 1,
        codigo: item.codigo,
        prenda: item.tipo_uniforme.nombre,
        talla: item.talla,
        precio: Number(item.precio),
        estado: ESTADO_ITEM_LABELS[item.estado] ?? item.estado,
      });
      row.getCell('precio').numFmt = '"S/ "#,##0.00';
      if (idx % 2 === 1) estilarStripeExcel(row);
    });

    const total = ingreso.items.reduce((acc, i) => acc + Number(i.precio), 0);
    const totalRow = ws.addRow({
      n: '',
      codigo: '',
      prenda: 'TOTAL',
      talla: '',
      precio: total,
      estado: '',
    });
    totalRow.font = { bold: true };
    totalRow.getCell('precio').numFmt = '"S/ "#,##0.00';

    return wb;
  }
}
