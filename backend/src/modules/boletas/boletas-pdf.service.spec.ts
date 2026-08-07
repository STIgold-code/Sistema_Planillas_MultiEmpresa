/**
 * Tests del ordenamiento del PDF masivo de boletas.
 *
 * La descarga masiva se imprime y se archiva: el contador necesita elegir si el
 * lote sale alfabetico (por apellido) o por codigo de empleado. El criterio se
 * aplica en la consulta, no en memoria, para que el orden del PDF sea el mismo
 * orden con el que se leyeron las boletas.
 */
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BoletasPdfService, resolverOrdenBoletas } from './boletas-pdf.service';
import { OrdenBoletasMasivo } from './dto';

describe('resolverOrdenBoletas', () => {
  it('ordena por apellido paterno y materno por defecto', () => {
    expect(resolverOrdenBoletas(OrdenBoletasMasivo.APELLIDO)).toEqual([
      { empleado: { apellido_paterno: 'asc' } },
      { empleado: { apellido_materno: 'asc' } },
    ]);
  });

  it('ordena por codigo de empleado ascendente', () => {
    expect(resolverOrdenBoletas(OrdenBoletasMasivo.CODIGO)).toEqual([
      { empleado_id: 'asc' },
    ]);
  });
});

describe('BoletasPdfService.generarPdfMasivo — orden de la consulta', () => {
  function build() {
    // Devolver [] corta la generacion con NotFoundException antes de armar el
    // PDF: alcanza para verificar con que orderBy se consulto.
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { boleta: { findMany } };
    const service = new BoletasPdfService(prisma as never, {} as never);
    return { service, findMany };
  }

  function orderByDeLaConsulta(
    findMany: jest.Mock,
  ): Prisma.BoletaOrderByWithRelationInput[] {
    const calls = findMany.mock.calls as unknown as Array<
      [{ orderBy: Prisma.BoletaOrderByWithRelationInput[] }]
    >;
    return calls[0][0].orderBy;
  }

  it('usa el orden por apellido cuando no se especifica criterio', async () => {
    const { service, findMany } = build();

    await expect(service.generarPdfMasivo(1, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(orderByDeLaConsulta(findMany)).toEqual([
      { empleado: { apellido_paterno: 'asc' } },
      { empleado: { apellido_materno: 'asc' } },
    ]);
  });

  it('usa el orden por codigo cuando se pide orden=codigo', async () => {
    const { service, findMany } = build();

    await expect(
      service.generarPdfMasivo(1, 7, OrdenBoletasMasivo.CODIGO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(orderByDeLaConsulta(findMany)).toEqual([{ empleado_id: 'asc' }]);
  });
});
