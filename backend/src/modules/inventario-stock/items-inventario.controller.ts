import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ItemsInventarioService } from './items-inventario.service';
import { ItemsInventarioExportService } from './items-inventario-export.service';
import { FilterItemsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EXCEL_MIME } from '../../common/utils/excel-export.util';

@Controller('inventario/items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ItemsInventarioController {
  constructor(
    private readonly service: ItemsInventarioService,
    private readonly exportService: ItemsInventarioExportService,
  ) {}

  @Get()
  @RequirePermissions('inventarios:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterItemsDto,
  ) {
    return this.service.findAll(empresaId, filters);
  }

  // Antes de ':id' para que 'export' no se interprete como un id.
  @Get('export/excel')
  @RequirePermissions('inventarios:leer')
  async exportExcel(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterItemsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const wb = await this.exportService.excel(empresaId, filters);
    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type': EXCEL_MIME,
      'Content-Disposition': 'attachment; filename="Stock.xlsx"',
    });
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  @Get('resumen')
  @RequirePermissions('inventarios:leer')
  resumen(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.resumen(empresaId);
  }

  @Get('existencias')
  @RequirePermissions('inventarios:leer')
  existencias(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.existencias(empresaId);
  }

  @Get(':id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }
}
