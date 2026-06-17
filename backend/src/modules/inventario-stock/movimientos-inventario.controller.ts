import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { MovimientosInventarioService } from './movimientos-inventario.service';
import { MovimientosInventarioExportService } from './movimientos-inventario-export.service';
import { FilterMovimientosDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EXCEL_MIME } from '../../common/utils/excel-export.util';

@Controller('inventario/movimientos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MovimientosInventarioController {
  constructor(
    private readonly service: MovimientosInventarioService,
    private readonly exportService: MovimientosInventarioExportService,
  ) {}

  @Get()
  @RequirePermissions('inventarios:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterMovimientosDto,
  ) {
    return this.service.findAll(empresaId, filters);
  }

  @Get('resumen')
  @RequirePermissions('inventarios:leer')
  resumen(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterMovimientosDto,
  ) {
    return this.service.resumen(empresaId, filters);
  }

  @Get('export/excel')
  @RequirePermissions('inventarios:leer')
  async exportExcel(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterMovimientosDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const wb = await this.exportService.excel(empresaId, filters);
    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type': EXCEL_MIME,
      'Content-Disposition': 'attachment; filename="Movimientos.xlsx"',
    });
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }
}
