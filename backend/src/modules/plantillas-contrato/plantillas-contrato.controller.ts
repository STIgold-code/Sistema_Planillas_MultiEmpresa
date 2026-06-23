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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PlantillasContratoService } from './plantillas-contrato.service';
import {
  CreatePlantillaContratoDto,
  UpdatePlantillaContratoDto,
  FilterPlantillaContratoDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { multerOptions } from '../uploads/uploads.config';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { ContratoDataPlantilla } from './plantillas-contrato-docs.service';

@Controller('plantillas-contrato')
export class PlantillasContratoController {
  constructor(private readonly plantillasService: PlantillasContratoService) {}

  @Get()
  @RequirePermissions('contratos:leer')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterPlantillaContratoDto,
  ) {
    return this.plantillasService.findAll(user.empresa_id, filters);
  }

  @Get('variables')
  @RequirePermissions('contratos:leer')
  getVariables() {
    return this.plantillasService.getVariables();
  }

  @Get('tipos')
  @RequirePermissions('contratos:leer')
  getTiposContrato(@CurrentUser() user: AuthenticatedUser) {
    return this.plantillasService.getTiposContrato(user.empresa_id);
  }

  @Get(':id')
  @RequirePermissions('contratos:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.plantillasService.findOne(id, user.empresa_id);
  }

  @Get(':id/descargar')
  @RequirePermissions('contratos:leer')
  async descargarWord(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const plantilla = await this.plantillasService.findOne(id, user.empresa_id);

    if (!plantilla.archivo_base_url) {
      throw new BadRequestException(
        'La plantilla no tiene un archivo Word asociado',
      );
    }

    const buffer = await this.plantillasService.getWordBuffer(
      plantilla.archivo_base_url,
    );
    const filename =
      plantilla.archivo_base_url.split('/').pop() || 'plantilla.docx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':id/preview')
  @RequirePermissions('contratos:leer')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Query('empleado_id') empleadoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empId = empleadoId ? parseInt(empleadoId, 10) : undefined;
    return this.plantillasService.preview(id, user.empresa_id, empId);
  }

  @Post()
  @RequirePermissions('contratos:crear')
  create(@Body() dto: CreatePlantillaContratoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.plantillasService.create(user.empresa_id, dto);
  }

  @Post(':id/duplicar')
  @RequirePermissions('contratos:crear')
  duplicar(
    @Param('id', ParseIntPipe) id: number,
    @Body('nombre') nuevoNombre: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantillasService.duplicar(id, user.empresa_id, nuevoNombre);
  }

  @Patch(':id')
  @RequirePermissions('contratos:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantillaContratoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantillasService.update(id, user.empresa_id, dto);
  }

  @Delete(':id')
  @RequirePermissions('contratos:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.plantillasService.remove(id, user.empresa_id);
  }

  // ==========================================
  // ENDPOINTS PARA ARCHIVOS WORD
  // ==========================================

  // Crear plantilla con archivo Word
  @Post('upload')
  @RequirePermissions('contratos:crear')
  @UseInterceptors(FileInterceptor('file', multerOptions('plantillas')))
  async createWithWord(
    @UploadedFile() file: Express.Multer.File,
    @Body('nombre') nombre: string,
    @Body('descripcion') descripcion: string,
    @Body('tipo_contrato') tipo_contrato: string,
    @Body('es_predeterminada') es_predeterminada: string,
    @Body('force_invalid_variables') forceInvalidVariables: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Debe subir un archivo Word (.docx)');
    }

    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Solo se permiten archivos Word (.docx)');
    }

    if (!nombre || !tipo_contrato) {
      throw new BadRequestException('Nombre y tipo de contrato son requeridos');
    }

    // Validar variables antes de guardar
    const extractedVars = this.plantillasService.extractVariablesFromWordFile(
      file.path,
    );
    const validation =
      this.plantillasService.validateExtractedVariables(extractedVars);

    if (validation.hasErrors && forceInvalidVariables !== 'true') {
      const suggestions = validation.invalid
        .map((i) =>
          i.suggestion
            ? `"${i.variable}" → ¿Quisiste decir "${i.suggestion}"?`
            : `"${i.variable}" no es una variable reconocida`,
        )
        .join('; ');

      throw new BadRequestException({
        message: `El documento contiene ${validation.invalid.length} variable(s) no reconocida(s): ${suggestions}`,
        statusCode: 400,
        validation,
      });
    }

    const dto: CreatePlantillaContratoDto = {
      nombre,
      descripcion,
      tipo_contrato,
      contenido: '',
      es_predeterminada: es_predeterminada === 'true',
      activo: true,
    };

    return this.plantillasService.createFromWord(
      user.empresa_id,
      dto,
      file.originalname,
      file.path,
    );
  }

  // Actualizar archivo Word de una plantilla existente
  @Patch(':id/upload')
  @RequirePermissions('contratos:editar')
  @UseInterceptors(FileInterceptor('file', multerOptions('plantillas')))
  async updateWordFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('force_invalid_variables') forceInvalidVariables: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Debe subir un archivo Word (.docx)');
    }

    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Solo se permiten archivos Word (.docx)');
    }

    // Validar variables antes de actualizar
    const extractedVars = this.plantillasService.extractVariablesFromWordFile(
      file.path,
    );
    const validation =
      this.plantillasService.validateExtractedVariables(extractedVars);

    if (validation.hasErrors && forceInvalidVariables !== 'true') {
      const suggestions = validation.invalid
        .map((i) =>
          i.suggestion
            ? `"${i.variable}" → ¿Quisiste decir "${i.suggestion}"?`
            : `"${i.variable}" no es una variable reconocida`,
        )
        .join('; ');

      throw new BadRequestException({
        message: `El documento contiene ${validation.invalid.length} variable(s) no reconocida(s): ${suggestions}`,
        statusCode: 400,
        validation,
      });
    }

    return this.plantillasService.updateWordFile(
      id,
      user.empresa_id,
      file.originalname,
      file.path,
    );
  }

  // Preview de archivo Word con datos de ejemplo (antes de guardar)
  @Post('preview-file')
  @RequirePermissions('contratos:leer')
  @UseInterceptors(FileInterceptor('file', multerOptions('temp')))
  previewFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debe subir un archivo Word (.docx)');
    }

    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Solo se permiten archivos Word (.docx)');
    }

    const preview = this.plantillasService.previewWordFile(file.path);

    // Eliminar archivo temporal
    const fs = require('fs');
    fs.unlinkSync(file.path);

    return preview;
  }

  // Extraer variables de un archivo Word y validarlas
  @Post('extract-variables')
  @RequirePermissions('contratos:leer')
  @UseInterceptors(FileInterceptor('file', multerOptions('temp')))
  extractVariables(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debe subir un archivo Word (.docx)');
    }

    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Solo se permiten archivos Word (.docx)');
    }

    const variables = this.plantillasService.extractVariablesFromWordFile(
      file.path,
    );

    // Validar variables contra las conocidas
    const validation =
      this.plantillasService.validateExtractedVariables(variables);

    // Eliminar archivo temporal
    const fs = require('fs');
    fs.unlinkSync(file.path);

    return { variables, validation };
  }

  // Generar documento de contrato
  @Post(':id/generar')
  @RequirePermissions('contratos:crear')
  async generateContract(
    @Param('id', ParseIntPipe) id: number,
    @Body('empleado_id', ParseIntPipe) empleadoId: number,
    @Body('contrato') contratoData: ContratoDataPlantilla,
    @Body('formato') formato: 'docx' | 'pdf',
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    // Por defecto PDF si no se especifica, por seguridad
    const formatoFinal = formato || 'pdf';

    const { buffer, filename, mimetype } =
      await this.plantillasService.generateContractDocument(
        id,
        user.empresa_id,
        empleadoId,
        contratoData,
        formatoFinal,
      );

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
