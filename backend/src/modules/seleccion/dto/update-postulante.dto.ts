import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePostulanteDto } from './create-postulante.dto';

export class UpdatePostulanteDto extends PartialType(
  OmitType(CreatePostulanteDto, ['vacante_id'] as const),
) {}
