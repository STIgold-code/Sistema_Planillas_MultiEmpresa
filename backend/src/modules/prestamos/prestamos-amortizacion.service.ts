import { Injectable, Logger } from '@nestjs/common';
import {
  EstadoPrestamo,
  Prisma,
  TipoMovimientoPrestamo,
  TipoPrestamo,
} from '@prisma/client';
import {
  DescuentosPrestamos,
  PrestamoVigente,
} from './dominio/descuentos-prestamos';
import { repartirCargo } from './dominio/amortizacion-prestamos';
import {
  ORDEN_AMORTIZACION,
  SELECT_PRESTAMO_ACTIVO,
  aPrestamoVigente,
} from './prestamos.mapper';

/** Campo del detalle de planilla que alimenta cada tipo de préstamo. */
const CAMPO_POR_TIPO: Record<TipoPrestamo, keyof DescuentosPrestamos> = {
  [TipoPrestamo.PRESTAMO]: 'prestamo',
  [TipoPrestamo.ADELANTO_SUELDO]: 'adelantoQuincena',
  [TipoPrestamo.ADELANTO_GRATIFICACION]: 'adelantoGratificacion',
};

const aNumero = (valor: unknown): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

export interface ResumenAmortizacion {
  cargos: number;
  montoAmortizado: number;
  prestamosPagados: number;
}

/**
 * Amortización de préstamos al APROBAR la planilla.
 *
 * Mientras la planilla está en cálculo el descuento es una proyección; recién al
 * aprobar se considera cobrado y se mueve el saldo. Cada cargo queda registrado
 * como `PrestamoMovimiento` de tipo CARGO_PLANILLA, con unique
 * (prestamo, planilla, tipo): re-aprobar una planilla NO vuelve a descontar.
 */
@Injectable()
export class PrestamosAmortizacionService {
  private readonly logger = new Logger(PrestamosAmortizacionService.name);

  /**
   * Registra los cargos de la planilla contra los préstamos activos y descuenta
   * el saldo. Debe ejecutarse DENTRO de la transacción que aprueba la planilla.
   */
  async amortizarPlanillaAprobada(
    tx: Prisma.TransactionClient,
    planillaId: number,
    empresaId: number,
  ): Promise<ResumenAmortizacion> {
    const vacio: ResumenAmortizacion = {
      cargos: 0,
      montoAmortizado: 0,
      prestamosPagados: 0,
    };

    // Multi-tenant: el detalle se lee acotado a la planilla de ESTA empresa.
    const detalles = await tx.planillaDetalle.findMany({
      where: {
        planilla_id: planillaId,
        planilla: { empresa_id: empresaId },
        OR: [
          { prestamo: { gt: 0 } },
          { adelanto_quincena: { gt: 0 } },
          { adelanto_gratificacion: { gt: 0 } },
        ],
      },
      select: {
        empleado_id: true,
        prestamo: true,
        adelanto_quincena: true,
        adelanto_gratificacion: true,
      },
    });

    if (detalles.length === 0) return vacio;

    const descuentosPorEmpleado = new Map<number, DescuentosPrestamos>();
    for (const detalle of detalles) {
      descuentosPorEmpleado.set(detalle.empleado_id, {
        prestamo: aNumero(detalle.prestamo),
        adelantoQuincena: aNumero(detalle.adelanto_quincena),
        adelantoGratificacion: aNumero(detalle.adelanto_gratificacion),
      });
    }

    const empleadoIds = [...descuentosPorEmpleado.keys()];

    // Idempotencia: los préstamos ya cargados por ESTA planilla se excluyen.
    const yaCargados = await tx.prestamoMovimiento.findMany({
      where: {
        planilla_id: planillaId,
        tipo: TipoMovimientoPrestamo.CARGO_PLANILLA,
      },
      select: { prestamo_id: true },
    });
    const idsYaCargados = yaCargados.map((m) => m.prestamo_id);

    const prestamos = await tx.prestamo.findMany({
      where: {
        empresa_id: empresaId,
        empleado_id: { in: empleadoIds },
        estado: EstadoPrestamo.ACTIVO,
        ...(idsYaCargados.length > 0 ? { id: { notIn: idsYaCargados } } : {}),
      },
      select: SELECT_PRESTAMO_ACTIVO,
      orderBy: [...ORDEN_AMORTIZACION],
    });

    if (prestamos.length === 0) return vacio;

    const resumen: ResumenAmortizacion = { ...vacio };

    for (const [empleadoId, descuentos] of descuentosPorEmpleado) {
      const delEmpleado = prestamos.filter((p) => p.empleado_id === empleadoId);
      if (delEmpleado.length === 0) continue;

      for (const tipo of Object.values(TipoPrestamo)) {
        const montoAplicado = descuentos[CAMPO_POR_TIPO[tipo]];
        if (montoAplicado <= 0) continue;

        const vigentes: PrestamoVigente[] = delEmpleado
          .filter((p) => p.tipo === tipo)
          .map(aPrestamoVigente);

        for (const cargo of repartirCargo(vigentes, montoAplicado)) {
          await tx.prestamoMovimiento.create({
            data: {
              prestamo_id: cargo.prestamoId,
              planilla_id: planillaId,
              monto: cargo.monto,
              tipo: TipoMovimientoPrestamo.CARGO_PLANILLA,
              observaciones: `Cargo por aprobación de la planilla #${planillaId}`,
            },
          });

          await tx.prestamo.update({
            where: { id: cargo.prestamoId },
            data: {
              ...(cargo.saldoResultante !== null
                ? { saldo: cargo.saldoResultante }
                : {}),
              ...(cargo.quedaPagado ? { estado: EstadoPrestamo.PAGADO } : {}),
            },
          });

          resumen.cargos += 1;
          resumen.montoAmortizado = Number(
            (resumen.montoAmortizado + cargo.monto).toFixed(2),
          );
          if (cargo.quedaPagado) resumen.prestamosPagados += 1;
        }
      }
    }

    if (resumen.cargos > 0) {
      this.logger.log(
        `Planilla #${planillaId}: ${resumen.cargos} cargo(s) de préstamo por S/. ${resumen.montoAmortizado.toFixed(2)} (${resumen.prestamosPagados} cancelado[s]).`,
      );
    }

    return resumen;
  }
}
