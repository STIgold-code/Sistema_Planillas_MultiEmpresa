import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { UploadsService } from '../uploads/uploads.service';
import { CATEGORIA_ARCHIVO } from '../uploads/archivo.constants';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  async findAll() {
    return this.prisma.empresa.findMany({
      orderBy: { razon_social: 'asc' },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return company;
  }

  async create(createCompanyDto: CreateCompanyDto) {
    // Verificar si el RUC ya existe
    const existingCompany = await this.prisma.empresa.findUnique({
      where: { ruc: createCompanyDto.ruc },
    });

    if (existingCompany) {
      throw new ConflictException('El RUC ya está registrado');
    }

    return this.prisma.empresa.create({
      data: createCompanyDto,
    });
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    await this.findOne(id);

    // Si se actualiza el RUC, verificar que no exista
    if (updateCompanyDto.ruc) {
      const existingCompany = await this.prisma.empresa.findFirst({
        where: {
          ruc: updateCompanyDto.ruc,
          NOT: { id },
        },
      });

      if (existingCompany) {
        throw new ConflictException('El RUC ya está registrado');
      }
    }

    // SEGURIDAD (mass assignment + IDOR): el cliente envia la URL del proxy del
    // logo/firma. No se confia en ese valor: se valida que el archivo pertenezca
    // a esta empresa y se reconstruye la URL canonica desde la key validada.
    // El logo es PUBLICO; la firma del representante es PRIVADA (PII legal).
    const data: UpdateCompanyDto = { ...updateCompanyDto };

    if (data.logo_url !== undefined && data.logo_url !== null) {
      const key = await this.uploads.resolverKeyPropia(data.logo_url, id);
      if (key) {
        await this.uploads.marcarArchivoPublico(
          key,
          true,
          CATEGORIA_ARCHIVO.LOGOS,
        );
        data.logo_url = this.uploads.getPublicFileUrl(key);
      }
    }

    if (
      data.firma_representante_url !== undefined &&
      data.firma_representante_url !== null
    ) {
      const key = await this.uploads.resolverKeyPropia(
        data.firma_representante_url,
        id,
      );
      if (key) {
        await this.uploads.marcarArchivoPublico(
          key,
          false,
          CATEGORIA_ARCHIVO.FIRMAS,
        );
        data.firma_representante_url = this.uploads.getFileUrl(key);
      }
    }

    return this.prisma.empresa.update({
      where: { id },
      data,
    });
  }

  /**
   * SEGURIDAD: Valida que no haya datos dependientes antes de eliminar
   * Esto previene pérdida catastrófica de datos por CASCADE DELETE
   */
  async remove(id: number) {
    await this.findOne(id);

    // SEGURIDAD: Validar que no haya empleados activos
    const empleadosActivos = await this.prisma.empleado.count({
      where: { empresa_id: id, estado: 'ACTIVO' },
    });
    if (empleadosActivos > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la empresa tiene ${empleadosActivos} empleado(s) activo(s). Debe dar de baja a todos los empleados primero.`,
      );
    }

    // SEGURIDAD: Validar que no haya usuarios asociados
    const usuariosAsociados = await this.prisma.usuario.count({
      where: { empresa_id: id },
    });
    if (usuariosAsociados > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la empresa tiene ${usuariosAsociados} usuario(s) asociado(s). Debe eliminar todos los usuarios primero.`,
      );
    }

    // SEGURIDAD: Validar que no haya contratos vigentes
    // Nota: Contrato no tiene empresa_id directo, se filtra a través de empleado
    const contratosVigentes = await this.prisma.contrato.count({
      where: {
        empleado: { empresa_id: id },
        estado: 'ACTIVO',
      },
    });
    if (contratosVigentes > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la empresa tiene ${contratosVigentes} contrato(s) vigente(s).`,
      );
    }

    // SEGURIDAD: Validar que no haya planillas pendientes
    // Estados válidos: BORRADOR, CALCULADA, REVISADA, APROBADA, PAGADA, ANULADA
    const planillasPendientes = await this.prisma.planilla.count({
      where: {
        empresa_id: id,
        estado: { in: ['BORRADOR', 'CALCULADA', 'REVISADA'] },
      },
    });
    if (planillasPendientes > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la empresa tiene ${planillasPendientes} planilla(s) pendiente(s) de procesar.`,
      );
    }

    await this.prisma.empresa.delete({
      where: { id },
    });

    return { message: 'Empresa eliminada correctamente' };
  }
}
