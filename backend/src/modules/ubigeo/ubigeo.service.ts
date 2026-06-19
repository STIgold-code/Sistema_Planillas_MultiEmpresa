import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UbigeoService {
  constructor(private prisma: PrismaService) {}

  async getDepartamentos() {
    return this.prisma.departamento.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async getProvincias(departamentoId?: number) {
    return this.prisma.provincia.findMany({
      where: departamentoId ? { departamento_id: departamentoId } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async getDistritos(provinciaId?: number) {
    return this.prisma.distrito.findMany({
      where: provinciaId ? { provincia_id: provinciaId } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }
}
