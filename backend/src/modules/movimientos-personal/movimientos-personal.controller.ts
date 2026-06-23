import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MovimientosPersonalService } from './movimientos-personal.service';
import { FilterMovimientosDto } from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { fechaHoyPeru } from '../../common/utils/datetime.util';

@Controller('movimientos-personal')
export class MovimientosPersonalController {
  constructor(
    private readonly movimientosPersonalService: MovimientosPersonalService,
  ) {}

  @Get()
  @RequirePermissions('empleados:leer')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterMovimientosDto,
  ) {
    return this.movimientosPersonalService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('empleados:leer')
  getResumen(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterMovimientosDto,
  ) {
    return this.movimientosPersonalService.getResumen(user.empresa_id, filters);
  }

  @Get('exportar')
  @RequirePermissions('empleados:leer')
  async exportar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterMovimientosDto,
    @Res() res: Response,
  ) {
    const workbook = await this.movimientosPersonalService.exportarExcel(
      user.empresa_id,
      filters,
    );

    const mesStr = filters.mes?.toString().padStart(2, '0') || '';
    const anioStr = filters.anio?.toString() || '';
    const periodoStr = mesStr && anioStr ? `_${anioStr}-${mesStr}` : '';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=movimientos_personal${periodoStr}_${fechaHoyPeru()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
