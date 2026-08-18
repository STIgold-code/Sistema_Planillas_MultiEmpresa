import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

/**
 * Resolución de las referencias de archivo (logo y firma) al actualizar una
 * empresa. Dos bugs reales cubiertos aquí:
 *
 * 1. El formulario reenvía el logo vigente en cada guardado. Para las empresas
 *    cuyo logo es una URL externa (un asset estático del frontend) esa URL no
 *    se puede mapear a una key de storage, así que CUALQUIER cambio de esos
 *    datos moría con "Referencia de archivo no valida", sin decir que la causa
 *    era el logo.
 * 2. `marcarArchivoPublico` no miraba cuántas filas actualizaba. Si el archivo
 *    no tenía registro de propiedad, se persistía una URL que el controlador
 *    de archivos nunca iba a poder servir: imagen rota para siempre y ningún
 *    error al guardar.
 */
describe('CompaniesService.update (referencias de logo y firma)', () => {
  const EMPRESA_ID = 3;
  const LOGO_EXTERNO =
    'https://frontend-production-8c1aa.up.railway.app/images/logo-JJMM.png';
  const KEY_LOGO = 'empresas/nuevo-logo.png';
  const KEY_FIRMA = 'empresas/nueva-firma.png';

  let service: CompaniesService;
  let prisma: {
    empresa: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };
  let uploads: {
    resolverKeyPropia: jest.Mock;
    marcarArchivoPublico: jest.Mock;
    getPublicFileUrl: jest.Mock;
    getFileUrl: jest.Mock;
  };

  /** Empresa persistida que devuelve `findOne` antes de aplicar el cambio. */
  const empresaPersistida = (
    campos: {
      logo_url?: string | null;
      firma_representante_url?: string | null;
    } = {},
  ) => ({
    id: EMPRESA_ID,
    razon_social: 'ESTUDIO CONTABLE JJMM S.A.C.',
    logo_url: campos.logo_url ?? null,
    firma_representante_url: campos.firma_representante_url ?? null,
  });

  beforeEach(async () => {
    prisma = {
      empresa: {
        findUnique: jest.fn().mockResolvedValue(empresaPersistida()),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve(data),
          ),
      },
    };

    uploads = {
      resolverKeyPropia: jest.fn(),
      marcarArchivoPublico: jest.fn().mockResolvedValue(1),
      getPublicFileUrl: jest
        .fn()
        .mockImplementation((key: string) => `https://api/files/public/${key}`),
      getFileUrl: jest
        .fn()
        .mockImplementation((key: string) => `https://api/files/key/${key}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadsService, useValue: uploads },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('NO reprocesa el logo cuando llega idéntico al persistido (URL externa)', async () => {
    prisma.empresa.findUnique.mockResolvedValue(
      empresaPersistida({ logo_url: LOGO_EXTERNO }),
    );

    const resultado = await service.update(EMPRESA_ID, {
      telefono: '987654321',
      logo_url: LOGO_EXTERNO,
    });

    expect(uploads.resolverKeyPropia).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({
      telefono: '987654321',
      logo_url: LOGO_EXTERNO,
    });
  });

  it('SIGUE rechazando una URL externa cuando el logo SÍ cambió', async () => {
    prisma.empresa.findUnique.mockResolvedValue(empresaPersistida());
    uploads.resolverKeyPropia.mockRejectedValue(
      new BadRequestException('Referencia de archivo no valida'),
    );

    await expect(
      service.update(EMPRESA_ID, {
        logo_url: 'https://evil.example.com/x.png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.empresa.update).not.toHaveBeenCalled();
  });

  it('marca el logo nuevo como PÚBLICO y persiste su URL canónica', async () => {
    uploads.resolverKeyPropia.mockResolvedValue(KEY_LOGO);

    const resultado = await service.update(EMPRESA_ID, { logo_url: KEY_LOGO });

    expect(uploads.marcarArchivoPublico).toHaveBeenCalledWith(
      KEY_LOGO,
      true,
      'logos',
    );
    expect(resultado).toMatchObject({
      logo_url: `https://api/files/public/${KEY_LOGO}`,
    });
  });

  it('marca la firma nueva como PRIVADA y persiste la URL protegida', async () => {
    uploads.resolverKeyPropia.mockResolvedValue(KEY_FIRMA);

    const resultado = await service.update(EMPRESA_ID, {
      firma_representante_url: KEY_FIRMA,
    });

    expect(uploads.marcarArchivoPublico).toHaveBeenCalledWith(
      KEY_FIRMA,
      false,
      'firmas',
    );
    expect(resultado).toMatchObject({
      firma_representante_url: `https://api/files/key/${KEY_FIRMA}`,
    });
  });

  it('RECHAZA el guardado si el archivo no tiene registro de propiedad', async () => {
    uploads.resolverKeyPropia.mockResolvedValue(KEY_LOGO);
    // Sin fila en `archivos` el controlador responde 404 al servir el archivo.
    uploads.marcarArchivoPublico.mockResolvedValue(0);

    await expect(
      service.update(EMPRESA_ID, { logo_url: KEY_LOGO }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.empresa.update).not.toHaveBeenCalled();
  });

  it('permite limpiar el logo enviando null, sin resolver nada', async () => {
    prisma.empresa.findUnique.mockResolvedValue(
      empresaPersistida({ logo_url: LOGO_EXTERNO }),
    );

    const resultado = await service.update(EMPRESA_ID, { logo_url: null });

    expect(uploads.resolverKeyPropia).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ logo_url: null });
  });
});
