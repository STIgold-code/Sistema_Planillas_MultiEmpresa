import { PartialType } from '@nestjs/mapped-types';
import { CreatePlantillaContratoDto } from './create-plantilla-contrato.dto';

export class UpdatePlantillaContratoDto extends PartialType(
  CreatePlantillaContratoDto,
) {}
