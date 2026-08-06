import { Test, TestingModule } from '@nestjs/testing';
import {
  ContratosExcelService,
  ContratoParaImportar,
} from './contratos-excel.service';
import { ContratosExcelExportService } from './contratos-excel-export.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Aislamiento multiempresa de la importación de contratos:
 * `contrato_existente_id` viene del cliente y NO debe permitir tocar
 * contratos de otro empleado u otra empresa.
 */
describe('ContratosExcelService - aplicarImportacion (aislamiento)', () => {
  let service: ContratosExcelService;

  const empresaId = 1;
  const usuarioId = 99;

  const prismaMock = {
    empleado: { findFirst: jest.fn() },
    contrato: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const filaActualizar = (
    contratoExistenteId: number,
  ): ContratoParaImportar => ({
    empleado_id: 5,
    dni: '12345678',
    nombre: 'EMPLEADO PRUEBA',
    tipo_contrato: 'PLAZO_FIJO',
    modalidad: 'TIEMPO_COMPLETO',
    fecha_inicio: new Date('2026-01-01'),
    fecha_fin: new Date('2026-12-31'),
    sueldo: 2000,
    fecha_cese: null,
    motivo_cese: '',
    accion: 'ACTUALIZAR',
    contrato_existente_id: contratoExistenteId,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosExcelService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ContratosExcelExportService, useValue: {} },
      ],
    }).compile();

    service = module.get(ContratosExcelService);
  });

  it('rechaza actualizar un contrato que no pertenece al empleado', async () => {
    prismaMock.empleado.findFirst.mockResolvedValue({ id: 5 });
    // El contrato indicado no existe para ese empleado (es de otro/otra empresa)
    prismaMock.contrato.findFirst.mockResolvedValue(null);

    const resultado = await service.aplicarImportacion(empresaId, usuarioId, [
      filaActualizar(777),
    ]);

    expect(prismaMock.contrato.update).not.toHaveBeenCalled();
    expect(resultado.actualizados).toBe(0);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain('no corresponde al empleado');
    // La verificación de pertenencia debe ligar contrato y empleado
    const [[argsVerificacion]] = prismaMock.contrato.findFirst.mock.calls as [
      [{ where: Record<string, unknown> }],
    ];
    expect(argsVerificacion.where).toMatchObject({ id: 777, empleado_id: 5 });
  });

  it('actualiza cuando el contrato sí pertenece al empleado de la empresa', async () => {
    prismaMock.empleado.findFirst.mockResolvedValue({ id: 5 });
    prismaMock.contrato.findFirst.mockResolvedValue({ id: 777 });
    prismaMock.contrato.update.mockResolvedValue({ id: 777 });

    const resultado = await service.aplicarImportacion(empresaId, usuarioId, [
      filaActualizar(777),
    ]);

    expect(resultado.actualizados).toBe(1);
    expect(resultado.errores).toHaveLength(0);
    expect(prismaMock.contrato.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 777 } }),
    );
  });

  it('rechaza empleados que no pertenecen a la empresa activa', async () => {
    prismaMock.empleado.findFirst.mockResolvedValue(null);

    const resultado = await service.aplicarImportacion(empresaId, usuarioId, [
      filaActualizar(777),
    ]);

    expect(prismaMock.contrato.update).not.toHaveBeenCalled();
    expect(resultado.errores[0]).toContain('Empleado no encontrado');
    const [[argsEmpleado]] = prismaMock.empleado.findFirst.mock.calls as [
      [{ where: Record<string, unknown> }],
    ];
    expect(argsEmpleado.where).toMatchObject({ empresa_id: empresaId });
  });
});
