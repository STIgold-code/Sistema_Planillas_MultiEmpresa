import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MastersService } from './masters.service';
import {
  CreateAreaDto,
  UpdateAreaDto,
  CreateCargoDto,
  UpdateCargoDto,
  CreateBancoDto,
  UpdateBancoDto,
  CreateTipoDocumentoEmpleadoDto,
  UpdateTipoDocumentoEmpleadoDto,
  CreateTipoEvaluacionDto,
  UpdateTipoEvaluacionDto,
  CreateProcedenciaDto,
  UpdateProcedenciaDto,
  CreateTipoCeseDto,
  UpdateTipoCeseDto,
} from './dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';

@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  // ==================== ÁREAS ====================
  @Get('areas')
  @RequirePermissions('maestros:leer')
  findAllAreas(@Query('empresa_id') empresaId?: string) {
    return this.mastersService.findAllAreas(
      empresaId ? parseInt(empresaId, 10) : undefined,
    );
  }

  @Get('areas/:id')
  @RequirePermissions('maestros:leer')
  findOneArea(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.mastersService.findOneArea(id, user.empresa_id);
  }

  @Post('areas')
  @RequirePermissions('maestros:crear')
  createArea(@Body() dto: CreateAreaDto, @CurrentUser() user: any) {
    return this.mastersService.createArea(dto, user.empresa_id);
  }

  @Patch('areas/:id')
  @RequirePermissions('maestros:editar')
  updateArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAreaDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.updateArea(id, dto, user.empresa_id);
  }

  @Delete('areas/:id')
  @RequirePermissions('maestros:eliminar')
  removeArea(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.mastersService.removeArea(id, user.empresa_id);
  }

  // ==================== CARGOS ====================
  @Get('cargos')
  @RequirePermissions('maestros:leer')
  findAllCargos(@Query('empresa_id') empresaId?: string) {
    return this.mastersService.findAllCargos(
      empresaId ? parseInt(empresaId, 10) : undefined,
    );
  }

  @Get('cargos/:id')
  @RequirePermissions('maestros:leer')
  findOneCargo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.findOneCargo(id, user.empresa_id);
  }

  @Post('cargos')
  @RequirePermissions('maestros:crear')
  createCargo(@Body() dto: CreateCargoDto, @CurrentUser() user: any) {
    return this.mastersService.createCargo(dto, user.empresa_id);
  }

  @Patch('cargos/:id')
  @RequirePermissions('maestros:editar')
  updateCargo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCargoDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.updateCargo(id, dto, user.empresa_id);
  }

  @Delete('cargos/:id')
  @RequirePermissions('maestros:eliminar')
  removeCargo(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.mastersService.removeCargo(id, user.empresa_id);
  }

  // ==================== BANCOS ====================
  @Get('bancos')
  @RequirePermissions('maestros:leer')
  findAllBancos() {
    return this.mastersService.findAllBancos();
  }

  @Get('bancos/:id')
  @RequirePermissions('maestros:leer')
  findOneBanco(@Param('id', ParseIntPipe) id: number) {
    return this.mastersService.findOneBanco(id);
  }

  @Post('bancos')
  @RequirePermissions('maestros:crear')
  createBanco(@Body() dto: CreateBancoDto) {
    return this.mastersService.createBanco(dto);
  }

  @Patch('bancos/:id')
  @RequirePermissions('maestros:editar')
  updateBanco(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBancoDto,
  ) {
    return this.mastersService.updateBanco(id, dto);
  }

  @Delete('bancos/:id')
  @RequirePermissions('maestros:eliminar')
  removeBanco(@Param('id', ParseIntPipe) id: number) {
    return this.mastersService.removeBanco(id);
  }

  // ==================== PROCEDENCIAS ====================
  @Get('procedencias')
  @RequirePermissions('maestros:leer')
  findAllProcedencias(
    @CurrentUser() user: any,
    @Query('incluir_inactivos') includeInactive?: string,
  ) {
    return this.mastersService.findAllProcedencias(
      user.empresa_id,
      includeInactive === 'true',
    );
  }

  @Get('procedencias/:id')
  @RequirePermissions('maestros:leer')
  findOneProcedencia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.findOneProcedencia(id, user.empresa_id);
  }

  @Post('procedencias')
  @RequirePermissions('maestros:crear')
  createProcedencia(
    @Body() dto: CreateProcedenciaDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.createProcedencia(dto, user.empresa_id);
  }

  @Patch('procedencias/:id')
  @RequirePermissions('maestros:editar')
  updateProcedencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcedenciaDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.updateProcedencia(id, user.empresa_id, dto);
  }

  @Delete('procedencias/:id')
  @RequirePermissions('maestros:eliminar')
  removeProcedencia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.removeProcedencia(id, user.empresa_id);
  }

  @Patch('procedencias/:id/toggle')
  @RequirePermissions('maestros:editar')
  toggleProcedencia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.toggleProcedencia(id, user.empresa_id);
  }

  // ==================== UBIGEOS ====================
  @Get('departamentos')
  @RequirePermissions('maestros:leer')
  findAllDepartamentos() {
    return this.mastersService.findAllDepartamentos();
  }

  @Get('provincias')
  @RequirePermissions('maestros:leer')
  findAllProvincias(@Query('departamento_id') departamentoId?: string) {
    return this.mastersService.findAllProvincias(
      departamentoId ? parseInt(departamentoId, 10) : undefined,
    );
  }

  @Get('distritos')
  @RequirePermissions('maestros:leer')
  findAllDistritos(@Query('provincia_id') provinciaId?: string) {
    return this.mastersService.findAllDistritos(
      provinciaId ? parseInt(provinciaId, 10) : undefined,
    );
  }

  // ==================== REGÍMENES PENSIONARIOS ====================
  @Get('regimenes-pensionarios')
  @RequirePermissions('maestros:leer')
  findAllRegimenes() {
    return this.mastersService.findAllRegimenes();
  }

  // ==================== TIPOS DE DOCUMENTO DE EMPLEADO ====================
  @Get('tipos-documento-empleado')
  @RequirePermissions('maestros:leer')
  findAllTiposDocumentoEmpleado(@CurrentUser() user: any) {
    // Siempre usar empresa del usuario logueado para evitar IDOR
    return this.mastersService.findAllTiposDocumentoEmpleado(user.empresa_id);
  }

  @Get('tipos-documento-empleado/:id')
  @RequirePermissions('maestros:leer')
  findOneTipoDocumentoEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.findOneTipoDocumentoEmpleado(
      id,
      user.empresa_id,
    );
  }

  @Post('tipos-documento-empleado')
  @RequirePermissions('maestros:crear')
  createTipoDocumentoEmpleado(
    @Body() dto: CreateTipoDocumentoEmpleadoDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.createTipoDocumentoEmpleado(
      dto,
      user.empresa_id,
    );
  }

  @Patch('tipos-documento-empleado/:id')
  @RequirePermissions('maestros:editar')
  updateTipoDocumentoEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoDocumentoEmpleadoDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.updateTipoDocumentoEmpleado(
      id,
      dto,
      user.empresa_id,
    );
  }

  @Delete('tipos-documento-empleado/:id')
  @RequirePermissions('maestros:eliminar')
  removeTipoDocumentoEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.removeTipoDocumentoEmpleado(id, user.empresa_id);
  }

  // ==================== SEDES ====================
  @Get('sedes')
  @RequirePermissions('maestros:leer')
  findAllSedes(@Query('empresa_id') empresaId?: string) {
    return this.mastersService.findAllSedes(
      empresaId ? parseInt(empresaId, 10) : undefined,
    );
  }

  // ==================== TIPOS DE EVALUACIÓN ====================
  @Get('tipos-evaluacion')
  @RequirePermissions('maestros:leer')
  findAllTiposEvaluacion(
    @CurrentUser() user: any,
    @Query('incluir_inactivos') includeInactive?: string,
  ) {
    return this.mastersService.findAllTiposEvaluacion(
      user.empresa_id,
      includeInactive === 'true',
    );
  }

  @Get('tipos-evaluacion/:id')
  @RequirePermissions('maestros:leer')
  findOneTipoEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.findOneTipoEvaluacion(id, user.empresa_id);
  }

  @Post('tipos-evaluacion')
  @RequirePermissions('maestros:crear')
  createTipoEvaluacion(
    @Body() dto: CreateTipoEvaluacionDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.createTipoEvaluacion(dto, user.empresa_id);
  }

  @Patch('tipos-evaluacion/:id')
  @RequirePermissions('maestros:editar')
  updateTipoEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoEvaluacionDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.updateTipoEvaluacion(id, user.empresa_id, dto);
  }

  @Delete('tipos-evaluacion/:id')
  @RequirePermissions('maestros:eliminar')
  removeTipoEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.removeTipoEvaluacion(id, user.empresa_id);
  }

  @Patch('tipos-evaluacion/:id/toggle')
  @RequirePermissions('maestros:editar')
  toggleTipoEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.toggleTipoEvaluacion(id, user.empresa_id);
  }

  // ==================== TIPOS DE CESE ====================
  @Get('tipos-cese')
  @RequirePermissions('maestros:leer')
  findAllTiposCese(@Query('empresa_id') empresaId?: string) {
    return this.mastersService.findAllTiposCese(
      empresaId ? parseInt(empresaId, 10) : undefined,
    );
  }

  @Get('tipos-cese/:id')
  @RequirePermissions('maestros:leer')
  findOneTipoCese(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.findOneTipoCese(id, user.empresa_id);
  }

  @Post('tipos-cese')
  @RequirePermissions('maestros:crear')
  createTipoCese(@Body() dto: CreateTipoCeseDto, @CurrentUser() user: any) {
    return this.mastersService.createTipoCese(dto, user.empresa_id);
  }

  @Patch('tipos-cese/:id')
  @RequirePermissions('maestros:editar')
  updateTipoCese(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoCeseDto,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.updateTipoCese(id, dto, user.empresa_id);
  }

  @Delete('tipos-cese/:id')
  @RequirePermissions('maestros:eliminar')
  removeTipoCese(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.mastersService.removeTipoCese(id, user.empresa_id);
  }
}
