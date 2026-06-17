import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoUniformeDto } from './create-tipo-uniforme.dto';

export class UpdateTipoUniformeDto extends PartialType(CreateTipoUniformeDto) {}
