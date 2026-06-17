import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

/**
 * Asigna items DISPONIBLES de un tipo + talla a un empleado dentro de una
 * entrega, todo sobre el MISMO transaction client (`tx`). Marca los items como
 * ENTREGADO, los vincula al empleado y a la entrega, y registra un movimiento
 * ENTREGA por cada item.
 *
 * Tomar los items DENTRO de la transacción es lo que evita la sobre-asignación:
 * cada lectura de DISPONIBLE ve los items ya marcados ENTREGADO por iteraciones
 * previas del mismo `$transaction`, de modo que un mismo item nunca se asigna a
 * dos empleados/lineas distintos en un flujo masivo.
 *
 * @returns la cantidad de items efectivamente asignados (<= cantidad pedida).
 */
export async function asignarItemsDisponibles(
  tx: Prisma.TransactionClient,
  params: {
    empresaId: number;
    usuarioId: number;
    empleadoId: number;
    entregaId: number;
    tipoUniformeId: number;
    talla: string;
    cantidad: number;
  },
): Promise<number> {
  if (params.cantidad <= 0) return 0;

  const disponibles = await tx.itemInventario.findMany({
    where: {
      empresa_id: params.empresaId,
      tipo_uniforme_id: params.tipoUniformeId,
      talla: params.talla,
      estado: 'DISPONIBLE',
    },
    orderBy: { codigo: 'asc' },
    take: params.cantidad,
    select: { id: true },
  });

  if (disponibles.length === 0) return 0;

  const ids = disponibles.map((i) => i.id);

  // Update condicionado a empresa + estado DISPONIBLE (anti-carrera): si otra
  // entrega concurrente tomó alguno de estos items entre el findMany y el
  // updateMany, el count no coincide y abortamos toda la transacción. Mismo
  // patrón que `devolver` y el módulo de descuentos. Sin esta condición, dos
  // entregas simultáneas podrían asignar el mismo item (sobre-asignación).
  const upd = await tx.itemInventario.updateMany({
    where: {
      id: { in: ids },
      empresa_id: params.empresaId,
      estado: 'DISPONIBLE',
    },
    data: {
      estado: 'ENTREGADO',
      empleado_id: params.empleadoId,
      entrega_id: params.entregaId,
    },
  });
  if (upd.count !== ids.length) {
    throw new ConflictException(
      'El stock cambió durante la asignación; reintenta la entrega',
    );
  }

  await tx.movimientoInventario.createMany({
    data: ids.map((itemId) => ({
      item_id: itemId,
      tipo_movimiento: 'ENTREGA' as const,
      empleado_id: params.empleadoId,
      motivo: `Entrega #${params.entregaId}`,
      usuario_id: params.usuarioId,
      empresa_id: params.empresaId,
    })),
  });

  return ids.length;
}
