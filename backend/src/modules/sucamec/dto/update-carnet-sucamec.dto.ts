import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCarnetSucamecDto } from './create-carnet-sucamec.dto';

export class UpdateCarnetSucamecDto extends PartialType(
  OmitType(CreateCarnetSucamecDto, ['empleado_id'] as const),
) {}
