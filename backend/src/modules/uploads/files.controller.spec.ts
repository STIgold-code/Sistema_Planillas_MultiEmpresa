/* eslint-disable @typescript-eslint/unbound-method -- los mocks de jest no dependen de `this` */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { FilesController } from './files.controller';
import { UploadsService } from './uploads.service';
import { AuthenticatedUser } from '../../common/types/auth.types';
import type { Archivo } from '@prisma/client';

/**
 * Tests de aislamiento cross-tenant (anti-IDOR) del proxy de archivos.
 *
 * Verifican que la autorizacion se basa en el registro `Archivo`
 * (empresa_id + publico) y no en el prefijo de la key.
 */
describe('FilesController (aislamiento cross-tenant)', () => {
  let controller: FilesController;
  let uploadsService: {
    getArchivoByKey: jest.Mock;
    getFileFromWasabi: jest.Mock;
  };

  const EMPRESA_A = 1;
  const EMPRESA_B = 2;

  const usuarioEmpresaA = {
    id: 10,
    empresa_id: EMPRESA_A,
  } as AuthenticatedUser;

  const archivoPrivadoEmpresaB: Archivo = {
    id: 100,
    key: 'documentos/secreto-empresa-b.pdf',
    empresa_id: EMPRESA_B,
    categoria: 'documentos',
    publico: false,
    subido_por_id: null,
    mime: 'application/pdf',
    size: 1024,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const archivoPrivadoEmpresaA: Archivo = {
    ...archivoPrivadoEmpresaB,
    id: 101,
    key: 'documentos/propio-empresa-a.pdf',
    empresa_id: EMPRESA_A,
  };

  const logoPublico: Archivo = {
    ...archivoPrivadoEmpresaB,
    id: 102,
    key: 'empresas/logo-empresa-b.png',
    empresa_id: EMPRESA_B,
    categoria: 'logos',
    publico: true,
    mime: 'image/png',
  };

  const firmaPrivada: Archivo = {
    ...archivoPrivadoEmpresaB,
    id: 103,
    key: 'empresas/firma-representante-empresa-b.png',
    empresa_id: EMPRESA_B,
    categoria: 'firmas',
    publico: false,
    mime: 'image/png',
  };

  // Mock minimo de Response de Express
  const buildRes = (): Response => {
    const res: Partial<Response> = {
      set: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    uploadsService = {
      getArchivoByKey: jest.fn(),
      getFileFromWasabi: jest.fn().mockResolvedValue({
        body: { pipe: jest.fn() },
        contentType: 'application/pdf',
        contentLength: 1024,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: UploadsService, useValue: uploadsService }],
    }).compile();

    controller = module.get<FilesController>(FilesController);
  });

  describe('GET /files/key/:key (autenticado)', () => {
    it('BLOQUEA acceso a archivo privado de otra empresa con 404 (anti-IDOR)', async () => {
      uploadsService.getArchivoByKey.mockResolvedValue(archivoPrivadoEmpresaB);
      const res = buildRes();

      await expect(
        controller.serveFile(
          encodeURIComponent(archivoPrivadoEmpresaB.key),
          res,
          usuarioEmpresaA,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      // No se debe haber intentado servir el archivo.
      expect(uploadsService.getFileFromWasabi).not.toHaveBeenCalled();
    });

    it('PERMITE acceso a archivo privado de la propia empresa', async () => {
      uploadsService.getArchivoByKey.mockResolvedValue(archivoPrivadoEmpresaA);
      const res = buildRes();

      await controller.serveFile(
        encodeURIComponent(archivoPrivadoEmpresaA.key),
        res,
        usuarioEmpresaA,
      );

      expect(uploadsService.getFileFromWasabi).toHaveBeenCalledWith(
        archivoPrivadoEmpresaA.key,
      );
      // Documento privado: cache nunca publico.
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Cache-Control': 'private, no-store' }),
      );
    });

    it('responde 404 si la key no tiene registro de propiedad', async () => {
      uploadsService.getArchivoByKey.mockResolvedValue(null);
      const res = buildRes();

      await expect(
        controller.serveFile(
          'documentos%2Finexistente.pdf',
          res,
          usuarioEmpresaA,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('PERMITE acceso a archivo publico aunque sea de otra empresa', async () => {
      uploadsService.getArchivoByKey.mockResolvedValue(logoPublico);
      const res = buildRes();

      await controller.serveFile(
        encodeURIComponent(logoPublico.key),
        res,
        usuarioEmpresaA,
      );

      expect(uploadsService.getFileFromWasabi).toHaveBeenCalledWith(
        logoPublico.key,
      );
    });
  });

  describe('GET /files/public/:key (publico, sin auth)', () => {
    it('SIRVE un logo marcado como publico', async () => {
      uploadsService.getArchivoByKey.mockResolvedValue(logoPublico);
      const res = buildRes();

      await controller.servePublicFile(
        encodeURIComponent(logoPublico.key),
        res,
      );

      expect(uploadsService.getFileFromWasabi).toHaveBeenCalledWith(
        logoPublico.key,
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Cache-Control': 'public, max-age=86400' }),
      );
    });

    it('NO sirve la firma del representante aunque comparta prefijo con logos', async () => {
      // La firma vive bajo el prefijo "empresas/" igual que los logos, pero su
      // registro Archivo es privado => el endpoint publico debe rechazarla.
      uploadsService.getArchivoByKey.mockResolvedValue(firmaPrivada);
      const res = buildRes();

      await expect(
        controller.servePublicFile(encodeURIComponent(firmaPrivada.key), res),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(uploadsService.getFileFromWasabi).not.toHaveBeenCalled();
    });

    it('NO sirve un documento privado por el endpoint publico', async () => {
      uploadsService.getArchivoByKey.mockResolvedValue(archivoPrivadoEmpresaB);
      const res = buildRes();

      await expect(
        controller.servePublicFile(
          encodeURIComponent(archivoPrivadoEmpresaB.key),
          res,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
