import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsInventarioService } from './items-inventario.service';
import { FilterItemsDto } from './dto';
import {
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

const CONDICION_ITEM_LABELS: Record<string, string> = {
  NUEVO: 'Nuevo',
  USADO: 'Usado',
};

@Injectable()
export class ItemsInventarioExportService {
  constructor(
    private readonly items: ItemsInventarioService,
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
   * Excel ejecutivo del stock. Respeta los mismos filtros que la vista (estado,
   * tipo, búsqueda por código), exportando todo lo que matchea (sin paginar).
   */
  async excel(
    empresaId: number,
    filters: FilterItemsDto,
  ): Promise<ExcelJS.Workbook> {
    const empresa = await this.empresaNombre(empresaId);
    const items = await this.items.listarParaExport(empresaId, filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = empresa;
    const logo = agregarLogoErmir(wb);

    const ws = wb.addWorksheet('Stock');
    ws.columns = [
      { key: 'n', width: 6 },
      { key: 'codigo', width: 18 },
      { key: 'prenda', width: 28 },
      { key: 'talla', width: 10 },
      { key: 'estado', width: 14 },
      { key: 'condicion', width: 12 },
      { key: 'precio', width: 12 },
      { key: 'proveedor', width: 28 },
      { key: 'asignado', width: 32 },
    ];
    ponerEncabezadoExcel(ws, logo, empresa, 'Inventario de prendas — Stock');
    ws.getRow(4).values = [
      'N°',
      'Código',
      'Prenda',
      'Talla',
      'Estado',
      'Condición',
      'Precio',
      'Proveedor',
      'Asignado a',
    ];
    estilarHeaderExcel(ws.getRow(4));

    items.forEach((item, idx) => {
      const empleado = item.empleado
        ? `${item.empleado.apellido_paterno} ${item.empleado.apellido_materno}, ${item.empleado.nombres}`
        : '—';
      const row = ws.addRow({
        n: idx + 1,
        codigo: item.codigo,
        prenda: item.tipo_uniforme.nombre,
        talla: item.talla,
        estado: ESTADO_ITEM_LABELS[item.estado] ?? item.estado,
        condicion: CONDICION_ITEM_LABELS[item.condicion] ?? item.condicion,
        precio: Number(item.precio),
        proveedor: item.proveedor?.nombre ?? '—',
        asignado: empleado,
      });
      row.getCell('precio').numFmt = '"S/ "#,##0.00';
      if (idx % 2 === 1) estilarStripeExcel(row);
    });

    // Fila de total de unidades.
    const totalRow = ws.addRow({
      n: '',
      codigo: '',
      prenda: 'TOTAL UNIDADES',
      talla: '',
      estado: '',
      precio: items.length,
    });
    totalRow.font = { bold: true };

    return wb;
  }
}
