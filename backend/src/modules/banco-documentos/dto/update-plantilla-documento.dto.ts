import { PartialType } from '@nestjs/mapped-types';
import { CreatePlantillaDocumentoDto } from './create-plantilla-documento.dto';

export class UpdatePlantillaDocumentoDto extends PartialType(
  CreatePlantillaDocumentoDto,
) {}
