import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { PeriodosService } from './periodos.service';
import { TareoExcelService } from './tareo-excel.service';
import { SesionTareoService } from './sesion-tareo.service';
import {
  CreatePeriodoDto,
  UpdatePeriodoDto,
  FilterPeriodoDto,
  AplicarImportacionDto,
} from './dto';

@Controller('tareo/periodos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PeriodosController {
  constructor(
    private readonly periodosService: PeriodosService,
    private readonly excelService: TareoExcelService,
    private readonly sesionTareoService: SesionTareoService,
  ) {}

  @Get()
  @RequirePermissions('tareo:leer')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterPeriodoDto,
  ) {
    return this.periodosService.findAll(user.empresa_id, filters);
  }

  @Get(':id')
  @RequirePermissions('tareo:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.findOne(id, user.empresa_id);
  }

  @Get(':id/resumen')
  @RequirePermissions('tareo:leer')
  getResumen(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.getResumen(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('tareo:crear')
  create(
    @Body() dto: CreatePeriodoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.create(user.empresa_id, dto);
  }

  @Patch(':id')
  @RequirePermissions('tareo:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePeriodoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.update(id, user.empresa_id, dto);
  }

  @Post(':id/generar')
  @RequirePermissions('tareo:crear')
  generarTareos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.generarTareos(id, user.empresa_id);
  }

  @Post(':id/sincronizar')
  @RequirePermissions('tareo:editar')
  sincronizarEmpleados(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.sincronizarEmpleados(id, user.empresa_id);
  }

  @Post(':id/cerrar')
  @RequirePermissions('tareo:cerrar')
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.cerrar(id, user.empresa_id, user.id);
  }

  @Post(':id/reabrir')
  @RequirePermissions('tareo:cerrar')
  reabrir(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.reabrir(id, user.empresa_id, user.id);
  }

  @Delete(':id')
  @RequirePermissions('tareo:eliminar')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.periodosService.eliminar(id, user.empresa_id);
  }

  // Exportar a Excel
  @Get(':id/exportar')
  @RequirePermissions('tareo:leer')
  async exportarExcel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const workbook = await this.excelService.exportarExcel(id, user.empresa_id);

    // Obtener nombre del periodo para el archivo
    const periodo = await this.periodosService.findOne(id, user.empresa_id);
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const fileName = `Tareo_${meses[periodo.mes - 1]}_${periodo.anio}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // Preview de importación Excel
  @Post(':id/importar/preview')
  @RequirePermissions('tareo:editar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Solo se permiten archivos Excel (.xlsx, .xls)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async previewImportacion(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }
    return this.excelService.importarExcel(id, user.empresa_id, file.buffer);
  }

  // Aplicar importación Excel
  @Post(':id/importar/aplicar')
  @RequirePermissions('tareo:editar')
  async aplicarImportacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AplicarImportacionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // SEGURIDAD: Validar sesión de tareo activa (admin/corrector no la necesitan)
    const permisos = user.rol?.permisos || [];
    const sinRestriccion =
      permisos.includes('*') ||
      permisos.includes('tareo:corregir') ||
      permisos.includes('tareo:*');

    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      id,
      user.id,
      user.empresa_id,
      sinRestriccion,
    );

    if (!puedeEditar.puede) {
      throw new BadRequestException(
        puedeEditar.motivo ||
          'No tiene una sesión de tareo activa para este periodo. Inicie una sesión primero.',
      );
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.excelService.aplicarImportacion(
      id,
      user.empresa_id,
      user.id,
      dto.cambios,
      ipAddress,
    );
  }
}
