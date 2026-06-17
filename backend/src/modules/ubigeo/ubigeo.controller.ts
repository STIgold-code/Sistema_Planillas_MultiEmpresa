import { Controller, Get, Query } from '@nestjs/common';
import { UbigeoService } from './ubigeo.service';
import { Public } from '../../common/decorators';

@Controller('ubigeo')
export class UbigeoController {
  constructor(private readonly ubigeoService: UbigeoService) {}

  @Get('departamentos')
  @Public()
  getDepartamentos() {
    return this.ubigeoService.getDepartamentos();
  }

  @Get('provincias')
  @Public()
  getProvincias(@Query('departamento_id') departamentoId?: string) {
    return this.ubigeoService.getProvincias(
      departamentoId ? parseInt(departamentoId) : undefined,
    );
  }

  @Get('distritos')
  @Public()
  getDistritos(@Query('provincia_id') provinciaId?: string) {
    return this.ubigeoService.getDistritos(
      provinciaId ? parseInt(provinciaId) : undefined,
    );
  }
}
