import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { BoletasService } from './boletas.service';
import { FilterBoletaDto, GenerarBoletasDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('boletas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoletasController {
  constructor(private readonly boletasService: BoletasService) {}

  @Get()
  @RequirePermissions('boleta:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterBoletaDto,
  ) {
    return this.boletasService.findAll(empresaId, filters);
  }

  @Get('estadisticas')
  @RequirePermissions('boleta:leer')
  getEstadisticas(
    @CurrentUser('empresa_id') empresaId: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
  ) {
    return this.boletasService.getEstadisticas(empresaId, anio);
  }

  @Get('pendientes-envio')
  @RequirePermissions('boleta:leer')
  getPendientesEnvio(
    @CurrentUser('empresa_id') empresaId: number,
    @Query('planilla_id', new ParseIntPipe({ optional: true }))
    planillaId?: number,
  ) {
    return this.boletasService.getPendientesEnvio(empresaId, planillaId);
  }

  @Get('empleado/:empleadoId')
  @RequirePermissions('boleta:leer')
  findByEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Query() filters: FilterBoletaDto,
  ) {
    return this.boletasService.findByEmpleado(empleadoId, empresaId, filters);
  }

  @Get(':id')
  @RequirePermissions('boleta:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.boletasService.findOne(id, empresaId);
  }

  @Get(':id/pdf')
  @RequirePermissions('boleta:leer')
  async descargarPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.boletasService.descargarPdf(
      id,
      empresaId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('planilla/:planillaId/pdf')
  @RequirePermissions('boleta:leer')
  async descargarPdfMasivo(
    @Param('planillaId', ParseIntPipe) planillaId: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Res() res: Response,
  ) {
    const { buffer, filename, cantidad } =
      await this.boletasService.generarPdfMasivo(planillaId, empresaId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'X-Boletas-Count': String(cantidad),
    });

    res.end(buffer);
  }

  @Post('generar')
  @RequirePermissions('boleta:crear')
  generarBoletas(
    @Body() dto: GenerarBoletasDto,
    @CurrentUser('empresa_id') empresaId: number,
    @CurrentUser('id') usuarioId: number,
  ) {
    return this.boletasService.generarBoletas(dto, empresaId, usuarioId);
  }

  @Post(':id/marcar-enviada')
  @RequirePermissions('boleta:editar')
  marcarEnviada(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body('email') email: string,
  ) {
    return this.boletasService.marcarEnviada(id, empresaId, email);
  }
}
