import { Test, TestingModule } from '@nestjs/testing';
import { RegimenLaboral } from '@prisma/client';
import { ContratosService } from './contratos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ContratoLifecycleService } from './contrato-lifecycle.service';
import { CreateContratoDto } from './dto';

describe('ContratosService - persistencia de regimen_laboral', () => {
  let service: ContratosService;
  let tx: any;

  const empresaId = 1;
  const usuarioId = 99;

  beforeEach(async () => {
    tx = {
      empleado: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 5, estado: 'ACTIVO', empresa_id: empresaId }),
        update: jest.fn(),
      },
      contrato: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 10,
          ...data,
          empleado: { fecha_cese: null },
        })),
        update: jest.fn().mockImplementation(({ data }) => ({ id: 10, ...data })),
      },
      vinculoLaboral: {
        findFirst: jest.fn().mockResolvedValue({ id: 7 }),
        create: jest.fn().mockResolvedValue({ id: 7 }),
      },
    };

    const prismaMock = {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
      contrato: tx.contrato,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: UploadsService, useValue: { resolverKeyPropia: jest.fn() } },
        {
          provide: ContratoLifecycleService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ContratosService>(ContratosService);
  });

  it('persiste el régimen laboral cuando viene en el create (override)', async () => {
    const dto: CreateContratoDto = {
      empleado_id: 5,
      tipo_contrato: 'PLAZO_FIJO',
      fecha_inicio: '2025-01-01',
      regimen_laboral: RegimenLaboral.CONSTRUCCION_CIVIL,
    };

    await service.create(empresaId, dto, usuarioId);

    expect(tx.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          regimen_laboral: RegimenLaboral.CONSTRUCCION_CIVIL,
        }),
      }),
    );
  });

  it('deja el régimen en null/undefined cuando no se envía (hereda el default de la empresa)', async () => {
    const dto: CreateContratoDto = {
      empleado_id: 5,
      tipo_contrato: 'PLAZO_FIJO',
      fecha_inicio: '2025-01-01',
    };

    await service.create(empresaId, dto, usuarioId);

    const dataArg = tx.contrato.create.mock.calls[0][0].data;
    expect(dataArg.regimen_laboral ?? null).toBeNull();
  });
});
