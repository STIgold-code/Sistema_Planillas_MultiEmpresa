import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { Archivo } from '@prisma/client';

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
