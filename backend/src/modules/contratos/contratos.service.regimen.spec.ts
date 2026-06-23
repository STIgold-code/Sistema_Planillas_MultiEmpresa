import { Test, TestingModule } from '@nestjs/testing';
import { RegimenLaboral } from '@prisma/client';
import { ContratosService } from './contratos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ContratoLifecycleService } from './contrato-lifecycle.service';
import { CreateContratoDto } from './dto';

// Cliente de transacción simulado: el tipo se deriva del literal por inferencia,
// evitando `any` sin forzar la firma completa de Prisma.TransactionClient.
const crearTxMock = () => ({
  empleado: {
    findFirst: jest
      .fn()
      .mockResolvedValue({ id: 5, estado: 'ACTIVO', empresa_id: 1 }),
    update: jest.fn(),
  },
  contrato: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 10,
        ...data,
        empleado: { fecha_cese: null },
      })),
    update: jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 10,
        ...data,
      })),
  },
  vinculoLaboral: {
    findFirst: jest.fn().mockResolvedValue({ id: 7 }),
    create: jest.fn().mockResolvedValue({ id: 7 }),
  },
});

describe('ContratosService - persistencia de regimen_laboral', () => {
  let service: ContratosService;
  let tx: ReturnType<typeof crearTxMock>;

  const empresaId = 1;
  const usuarioId = 99;

  beforeEach(async () => {
    tx = crearTxMock();

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

    const dataEsperada: unknown = expect.objectContaining({
      regimen_laboral: RegimenLaboral.CONSTRUCCION_CIVIL,
    });
    expect(tx.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: dataEsperada }),
    );
  });

  it('deja el régimen en null/undefined cuando no se envía (hereda el default de la empresa)', async () => {
    const dto: CreateContratoDto = {
      empleado_id: 5,
      tipo_contrato: 'PLAZO_FIJO',
      fecha_inicio: '2025-01-01',
    };

    await service.create(empresaId, dto, usuarioId);

    const primerLlamado = tx.contrato.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    const dataArg = primerLlamado[0].data;
    expect(dataArg.regimen_laboral ?? null).toBeNull();
  });
});
