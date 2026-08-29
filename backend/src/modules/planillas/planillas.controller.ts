import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PlanillasService } from './planillas.service';
import { PlantillaCierreImportacionService } from './plantilla-cierre-importacion.service';
import {
  CreatePlanillaDto,
  UpdatePlanillaDetalleDto,
  FilterPlanillaDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { IsOptional, IsString } from 'class-validator';

/** Solo Excel, y con techo: la plantilla de cierre nunca pesa megabytes. */
const OPCIONES_EXCEL = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, aceptado: boolean) => void,
  ) => {
    const permitidos = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!permitidos.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Solo se permiten archivos Excel (.xlsx, .xls)',
        ),
        false,
      );
    }
    cb(null, true);
  },
};

// DTO para rechazar/anular con motivo
class MotivoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}

@Controller('planillas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlanillasController {
  constructor(
    private readonly planillasService: PlanillasService,
    private readonly importacionCierre: PlantillaCierreImportacionService,
  ) {}

  @Get()
  @RequirePermissions('planilla:leer')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterPlanillaDto,
  ) {
    return this.planillasService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('planilla:leer')
  getResumen(@CurrentUser() user: AuthenticatedUser) {
    return this.planillasService.getResumen(user.empresa_id);
  }

  /**
   * Plantilla de CIERRE del período: el Excel que el área contable llena con
   * los saldos reales, adelantos, vacaciones y bonos del mes. Se pide por
   * año/mes y NO exige que la planilla exista todavía — justamente se descarga
   * antes de calcular.
   */
  @Get('plantilla-cierre/:anio/:mes')
  @RequirePermissions('planilla:leer')
  async plantillaCierre(
    @Param('anio', ParseIntPipe) anio: number,
    @Param('mes', ParseIntPipe) mes: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { workbook, nombreArchivo } =
      await this.planillasService.plantillaCierre(user.empresa_id, anio, mes);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreArchivo}"`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Vista previa de la plantilla de cierre llena: dice exactamente qué se va a
   * cambiar, sin tocar nada. Es el paso obligatorio antes de aplicar.
   */
  @Post('plantilla-cierre/:anio/:mes/preview')
  @RequirePermissions('planilla:crear')
  @UseInterceptors(FileInterceptor('file', OPCIONES_EXCEL))
  previewPlantillaCierre(
    @Param('anio', ParseIntPipe) anio: number,
    @Param('mes', ParseIntPipe) mes: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No se adjuntó ningún archivo');
    return this.importacionCierre.preview(
      user.empresa_id,
      anio,
      mes,
      file.buffer,
    );
  }

  /**
   * Aplica la plantilla de cierre. Se vuelve a subir el ARCHIVO, no el plan:
   * el plan se recalcula acá para que no se pueda aplicar algo distinto de lo
   * que se revisó en el preview.
   */
  @Post('plantilla-cierre/:anio/:mes/aplicar')
  @RequirePermissions('planilla:crear')
  @UseInterceptors(FileInterceptor('file', OPCIONES_EXCEL))
  aplicarPlantillaCierre(
    @Param('anio', ParseIntPipe) anio: number,
    @Param('mes', ParseIntPipe) mes: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No se adjuntó ningún archivo');
    return this.importacionCierre.aplicar(
      user.empresa_id,
      anio,
      mes,
      file.buffer,
      user.id,
    );
  }

  @Get(':id')
  @RequirePermissions('planilla:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.findOne(id, user.empresa_id);
  }

  // Endpoint para obtener detalles paginados (útil para planillas grandes)
  @Get(':id/detalles')
  @RequirePermissions('planilla:leer')
  findOneDetalles(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('search') search?: string,
  ) {
    return this.planillasService.findOneDetalles(
      id,
      user.empresa_id,
      page,
      limit,
      search,
    );
  }

  @Get(':id/exportar')
  @RequirePermissions('planilla:leer')
  exportar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.exportar(id, user.empresa_id);
  }

  /**
   * Datos para el Excel por trabajador: el mismo DTO de `exportar` más el tareo
   * del período, los acumulados de renta, los cargos de préstamos y el
   * historial de planillas previas de cada trabajador.
   */
  @Get(':id/exportar-trabajadores')
  @RequirePermissions('planilla:leer')
  exportarTrabajadores(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.exportarTrabajadores(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('planilla:crear')
  create(
    @Body() dto: CreatePlanillaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.create(user.empresa_id, dto, user.id);
  }

  @Post(':id/calcular')
  @RequirePermissions('planilla:crear')
  calcular(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.calcular(id, user.empresa_id, user.id);
  }

  @Patch(':id/detalle/:detalleId')
  @RequirePermissions('planilla:editar')
  updateDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: UpdatePlanillaDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.updateDetalle(
      id,
      detalleId,
      user.empresa_id,
      dto,
      user.id,
    );
  }

  @Post(':id/aprobar')
  @RequirePermissions('planilla:aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.aprobar(id, user.empresa_id, user.id);
  }

  @Post(':id/rechazar')
  @RequirePermissions('planilla:aprobar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.rechazar(
      id,
      user.empresa_id,
      user.id,
      dto.motivo,
    );
  }

  @Post(':id/pagar')
  @RequirePermissions('planilla:aprobar')
  marcarPagada(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.marcarPagada(id, user.empresa_id, user.id);
  }

  @Post(':id/anular')
  @RequirePermissions('planilla:eliminar')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.anular(
      id,
      user.empresa_id,
      user.id,
      dto.motivo,
    );
  }

  @Delete(':id')
  @RequirePermissions('planilla:eliminar')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planillasService.remove(id, user.empresa_id, user.id);
  }
}
