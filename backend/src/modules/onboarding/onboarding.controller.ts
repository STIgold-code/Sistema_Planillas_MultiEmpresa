import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  CreatePlantillaOnboardingDto,
  UpdatePlantillaOnboardingDto,
  CreateTareaOnboardingDto,
  UpdateTareaOnboardingDto,
  IniciarOnboardingDto,
  CompletarTareaDto,
  OmitirTareaDto,
  FilterProcesoOnboardingDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // ==================== PLANTILLAS ====================

  @Get('plantillas')
  @RequirePermissions('empleados:leer')
  findAllPlantillas(@CurrentUser() user: any) {
    return this.onboardingService.findAllPlantillas(user.empresa_id);
  }

  @Get('plantillas/:id')
  @RequirePermissions('empleados:leer')
  findOnePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.findOnePlantilla(id, user.empresa_id);
  }

  @Post('plantillas')
  @RequirePermissions('empleados:crear')
  createPlantilla(
    @Body() dto: CreatePlantillaOnboardingDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.createPlantilla(user.empresa_id, dto);
  }

  @Patch('plantillas/:id')
  @RequirePermissions('empleados:editar')
  updatePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantillaOnboardingDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.updatePlantilla(id, user.empresa_id, dto);
  }

  @Delete('plantillas/:id')
  @RequirePermissions('empleados:eliminar')
  deletePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.deletePlantilla(id, user.empresa_id);
  }

  // ==================== TAREAS DE PLANTILLA ====================

  @Post('plantillas/:plantillaId/tareas')
  @RequirePermissions('empleados:editar')
  addTarea(
    @Param('plantillaId', ParseIntPipe) plantillaId: number,
    @Body() dto: CreateTareaOnboardingDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.addTareaToPlantilla(
      plantillaId,
      user.empresa_id,
      dto,
    );
  }

  @Patch('plantillas/:plantillaId/tareas/:tareaId')
  @RequirePermissions('empleados:editar')
  updateTarea(
    @Param('plantillaId', ParseIntPipe) plantillaId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() dto: UpdateTareaOnboardingDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.updateTarea(
      tareaId,
      plantillaId,
      user.empresa_id,
      dto,
    );
  }

  @Delete('plantillas/:plantillaId/tareas/:tareaId')
  @RequirePermissions('empleados:eliminar')
  deleteTarea(
    @Param('plantillaId', ParseIntPipe) plantillaId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.deleteTarea(
      tareaId,
      plantillaId,
      user.empresa_id,
    );
  }

  // ==================== PROCESOS ====================

  @Get('procesos')
  @RequirePermissions('empleados:leer')
  findAllProcesos(
    @CurrentUser() user: any,
    @Query() filters: FilterProcesoOnboardingDto,
  ) {
    return this.onboardingService.findAllProcesos(user.empresa_id, filters);
  }

  @Get('procesos/:id')
  @RequirePermissions('empleados:leer')
  findOneProceso(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.findOneProceso(id, user.empresa_id);
  }

  @Post('procesos/:procesoId/tareas/:tareaId/completar')
  @RequirePermissions('empleados:editar')
  completarTarea(
    @Param('procesoId', ParseIntPipe) procesoId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() dto: CompletarTareaDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.completarTarea(
      procesoId,
      tareaId,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  @Post('procesos/:procesoId/tareas/:tareaId/omitir')
  @RequirePermissions('empleados:editar')
  omitirTarea(
    @Param('procesoId', ParseIntPipe) procesoId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() dto: OmitirTareaDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.omitirTarea(
      procesoId,
      tareaId,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  @Post('procesos/:id/cancelar')
  @RequirePermissions('empleados:editar')
  cancelarProceso(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo: string },
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.cancelarProceso(
      id,
      user.empresa_id,
      body.motivo,
    );
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @RequirePermissions('empleados:leer')
  getDashboard(@CurrentUser() user: any) {
    return this.onboardingService.getDashboard(user.empresa_id);
  }

  // ==================== BUSCAR PLANTILLA PARA EMPLEADO ====================

  @Get('empleados/:empleadoId/plantilla-sugerida')
  @RequirePermissions('empleados:leer')
  buscarPlantillaParaEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.buscarPlantillaParaEmpleado(
      empleadoId,
      user.empresa_id,
    );
  }
}

// Controller adicional para endpoints desde empleados
@Controller('empleados')
export class EmpleadosOnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post(':id/onboarding/iniciar')
  @RequirePermissions('empleados:editar')
  iniciarOnboarding(
    @Param('id', ParseIntPipe) empleadoId: number,
    @Body() dto: IniciarOnboardingDto,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.iniciarOnboarding(
      empleadoId,
      user.empresa_id,
      dto,
      user.id,
    );
  }

  @Get(':id/onboarding')
  @RequirePermissions('empleados:leer')
  getOnboardingEmpleado(
    @Param('id', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: any,
  ) {
    return this.onboardingService.findAllProcesos(user.empresa_id, {
      empleado_id: empleadoId,
    });
  }
}
