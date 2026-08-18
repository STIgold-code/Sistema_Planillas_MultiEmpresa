import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import type { Archivo } from '@prisma/client';

/**
 * El almacenamiento local escribe en disco (y el constructor del servicio crea
 * los directorios de uploads). Se aísla el sistema de archivos para que estos
 * tests validen solo el comportamiento del servicio, sin efectos colaterales.
 */
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

/**
 * Tests del bloqueo de mass assignment cross-tenant en resolverKeyPropia.
 */
describe('UploadsService.resolverKeyPropia (anti mass-assignment / IDOR)', () => {
  let service: UploadsService;
  let prisma: { archivo: { findUnique: jest.Mock } };

  const EMPRESA_A = 1;
  const EMPRESA_B = 2;

  const archivoEmpresaB: Archivo = {
    id: 1,
    key: 'documentos/de-empresa-b.pdf',
    empresa_id: EMPRESA_B,
    categoria: 'documentos',
    publico: false,
    subido_por_id: null,
    mime: 'application/pdf',
    size: 10,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = { archivo: { findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('BLOQUEA referenciar un archivo de otra empresa (ForbiddenException)', async () => {
    prisma.archivo.findUnique.mockResolvedValue(archivoEmpresaB);

    await expect(
      service.resolverKeyPropia(archivoEmpresaB.key, EMPRESA_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('PERMITE referenciar un archivo de la propia empresa y devuelve la key limpia', async () => {
    prisma.archivo.findUnique.mockResolvedValue({
      ...archivoEmpresaB,
      empresa_id: EMPRESA_A,
    });

    const key = await service.resolverKeyPropia(
      'http://host/api/files/key/documentos%2Fde-empresa-b.pdf',
      EMPRESA_A,
    );

    expect(key).toBe('documentos/de-empresa-b.pdf');
  });

  it('acepta keys aun sin registro previo (compatibilidad pre-backfill)', async () => {
    prisma.archivo.findUnique.mockResolvedValue(null);

    const key = await service.resolverKeyPropia('logos/empresa.png', EMPRESA_A);

    expect(key).toBe('logos/empresa.png');
  });

  it('rechaza una URL externa no mapeable a una key', async () => {
    await expect(
      service.resolverKeyPropia('https://evil.example.com/x.pdf', EMPRESA_A),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve el valor nulo/indefinido sin tocar la BD', async () => {
    await expect(
      service.resolverKeyPropia(null, EMPRESA_A),
    ).resolves.toBeNull();
    expect(prisma.archivo.findUnique).not.toHaveBeenCalled();
  });
});

/**
 * `uploadFile` sube el binario pero durante mucho tiempo NO registraba la
 * propiedad en `archivos`. El endpoint protegido /files/key/:key autoriza
 * contra ese registro, así que esos documentos respondían 404 aunque el archivo
 * existiera en el storage: se subían documentos que después no se podían ver.
 */
describe('UploadsService.uploadFile (registro de propiedad)', () => {
  /** Argumentos del upsert que registra la propiedad del archivo. */
  interface ArgsUpsertArchivo {
    where: { key: string };
    create: {
      key: string;
      empresa_id: number;
      categoria: string;
      publico: boolean;
      subido_por_id: number | null;
      mime: string | null;
      size: number | null;
    };
  }

  let service: UploadsService;
  let prisma: { archivo: { upsert: jest.Mock; findUnique: jest.Mock } };
  let upserts: ArgsUpsertArchivo[];

  const EMPRESA_DUENA = 42;
  const CONTEXTO_VACIO = RequestContextService.createEmptyContext();

  beforeEach(async () => {
    upserts = [];
    prisma = {
      archivo: {
        upsert: jest.fn().mockImplementation((args: ArgsUpsertArchivo) => {
          upserts.push(args);
          return Promise.resolve(null);
        }),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('registra el archivo subido con el empresa_id EXPLICITO del dueño', async () => {
    const contenido = Buffer.from('contenido-pdf');

    const key = await service.uploadFile(
      contenido,
      'documentos/7/doc_contrato.pdf',
      'application/pdf',
      { empresa_id: EMPRESA_DUENA, subido_por_id: 3 },
    );

    expect(key).toBe('documentos/7/doc_contrato.pdf');
    expect(upserts).toHaveLength(1);
    expect(upserts[0].where).toEqual({ key: 'documentos/7/doc_contrato.pdf' });
    expect(upserts[0].create).toMatchObject({
      key: 'documentos/7/doc_contrato.pdf',
      empresa_id: EMPRESA_DUENA,
      // La categoría se deriva del primer segmento de la key.
      categoria: 'documentos',
      publico: false,
      subido_por_id: 3,
      mime: 'application/pdf',
      size: contenido.length,
    });
  });

  it('el empresa_id explícito GANA sobre el del contexto del request', async () => {
    // Escenario real: superadmin con empresa activa 1 sube un documento de un
    // postulante de la empresa 42. Sin el parámetro explícito el archivo
    // quedaría registrado en la empresa 1 y sería inaccesible para la 42.
    await RequestContextService.run(
      { ...CONTEXTO_VACIO, empresaId: 1, userId: 99 },
      async () => {
        await service.uploadFile(
          Buffer.from('x'),
          'postulantes/5/doc_cv.pdf',
          'application/pdf',
          { empresa_id: EMPRESA_DUENA, subido_por_id: 3 },
        );
      },
    );

    expect(upserts[0].create).toMatchObject({
      empresa_id: EMPRESA_DUENA,
      categoria: 'postulantes',
      subido_por_id: 3,
    });
  });

  it('sin empresa explícita cae al contexto del request', async () => {
    await RequestContextService.run(
      { ...CONTEXTO_VACIO, empresaId: 8, userId: 99 },
      async () => {
        await service.uploadFile(
          Buffer.from('x'),
          'plantillas/plantilla_base.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
      },
    );

    expect(upserts[0].create).toMatchObject({
      empresa_id: 8,
      categoria: 'plantillas',
      subido_por_id: 99,
    });
  });

  it('sin empresa resoluble NO registra propiedad', async () => {
    await service.uploadFile(
      Buffer.from('x'),
      'temp/suelto.pdf',
      'application/pdf',
    );

    expect(prisma.archivo.upsert).not.toHaveBeenCalled();
    expect(upserts).toHaveLength(0);
  });
});

/**
 * `marcarArchivoPublico` hacia un `updateMany` a ciegas: si la key no tenia
 * registro en `archivos` no actualizaba nada y el llamador seguia como si todo
 * hubiera ido bien, persistiendo una URL que el controlador de archivos jamas
 * podria servir (404 permanente). Ahora devuelve el conteo para que el llamador
 * pueda reaccionar.
 */
describe('UploadsService.marcarArchivoPublico (senal de archivo no registrado)', () => {
  let service: UploadsService;
  let prisma: { archivo: { updateMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { archivo: { updateMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('devuelve la cantidad de registros actualizados', async () => {
    prisma.archivo.updateMany.mockResolvedValue({ count: 1 });

    const actualizados = await service.marcarArchivoPublico(
      'empresas/logo.png',
      true,
      'logos',
    );

    expect(actualizados).toBe(1);
    expect(prisma.archivo.updateMany).toHaveBeenCalledWith({
      where: { key: 'empresas/logo.png' },
      data: { publico: true, categoria: 'logos' },
    });
  });

  it('devuelve 0 cuando la key no tiene registro de propiedad', async () => {
    prisma.archivo.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.marcarArchivoPublico('empresas/sin-registro.png', true),
    ).resolves.toBe(0);
  });

  it('devuelve 0 sin tocar la BD si el valor no es mapeable a una key', async () => {
    await expect(
      service.marcarArchivoPublico('https://externo.example.com/x.png', true),
    ).resolves.toBe(0);
    expect(prisma.archivo.updateMany).not.toHaveBeenCalled();
  });
});
