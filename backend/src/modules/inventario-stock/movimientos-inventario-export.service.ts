import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { MovimientosInventarioService } from './movimientos-inventario.service';
import { FilterMovimientosDto } from './dto';
import { formatearFechaHoraPeru } from '../../common/utils/datetime.util';
import {
  agregarLogoErmir,
  ponerEncabezadoExcel,
  estilarHeaderExcel,
  estilarStripeExcel,
} from '../../common/utils/excel-export.util';

const TIPO_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  ENTREGA: 'Entrega',
  DEVOLUCION: 'Devolución',
  BAJA: 'Baja',
};

@Injectable()
export class MovimientosInventarioExportService {
  constructor(
    private readonly movimientos: MovimientosInventarioService,
    private readonly prisma: PrismaService,
  ) {}

  private async empresaNombre(empresaId: number): Promise<string> {
    const e = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { razon_social: true, nombre_comercial: true },
    });
    return e?.nombre_comercial || e?.razon_social || 'ERMIR';
  }

  /** Excel del Kardex (movimientos) respetando los filtros de la vista. */
  async excel(
    empresaId: number,
    filters: FilterMovimientosDto,
  ): Promise<ExcelJS.Workbook> {
    const empresa = await this.empresaNombre(empresaId);
    const movs = await this.movimientos.listarParaExport(empresaId, filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = empresa;
    const logo = agregarLogoErmir(wb);

    const ws = wb.addWorksheet('Movimientos');
    ws.columns = [
      { key: 'n', width: 6 },
      { key: 'fecha', width: 18 },
      { key: 'movimiento', width: 14 },
      { key: 'codigo', width: 16 },
      { key: 'prenda', width: 24 },
      { key: 'talla', width: 10 },
      { key: 'detalle', width: 34 },
      { key: 'usuario', width: 26 },
    ];
    ponerEncabezadoExcel(
      ws,
      logo,
      empresa,
      'Movimientos de inventario — Kardex',
    );
    ws.getRow(4).values = [
      'N°',
      'Fecha',
      'Movimiento',
      'Código',
      'Prenda',
      'Talla',
      'Detalle',
      'Usuario',
    ];
    estilarHeaderExcel(ws.getRow(4));

    movs.forEach((m, idx) => {
      const empleado = m.empleado
        ? `${m.empleado.apellido_paterno} ${m.empleado.apellido_materno}, ${m.empleado.nombres}`
        : null;
      const detalle = [empleado, m.motivo].filter(Boolean).join(' · ') || '—';
      const row = ws.addRow({
        n: idx + 1,
        fecha: formatearFechaHoraPeru(m.fecha),
        movimiento: TIPO_LABELS[m.tipo_movimiento] ?? m.tipo_movimiento,
        codigo: m.item.codigo,
        prenda: m.item.tipo_uniforme.nombre,
        talla: m.item.talla,
        detalle,
        usuario: m.usuario.nombre_completo,
      });
      if (idx % 2 === 1) estilarStripeExcel(row);
    });

    return wb;
  }
}
