import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateAreaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
