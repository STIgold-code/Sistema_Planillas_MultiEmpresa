import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBancoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateBancoDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
