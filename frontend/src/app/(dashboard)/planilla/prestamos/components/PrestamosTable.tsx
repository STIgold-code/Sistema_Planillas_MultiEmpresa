'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Ban, Pencil } from 'lucide-react';
import {
  ESTADO_COLOR,
  ESTADO_ETIQUETA,
  Prestamo,
  TIPO_ETIQUETA,
} from '../usePrestamos';

interface Props {
  prestamos: Prestamo[];
  cargando: boolean;
  onEditar: (prestamo: Prestamo) => void;
  onCancelar: (prestamo: Prestamo) => void;
}

const COLUMNAS = 8;

function moneda(valor: string | null): string {
  if (valor === null) return '—';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return numero.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  });
}

function fechaCorta(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-PE', { timeZone: 'UTC' });
}

function nombreCompleto(prestamo: Prestamo): string {
  const { apellido_paterno, apellido_materno, nombres } = prestamo.empleado;
  return `${apellido_paterno} ${apellido_materno}, ${nombres}`;
}

export function PrestamosTable({
  prestamos,
  cargando,
  onEditar,
  onCancelar,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden md:rounded-lg border-0 md:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Trabajador</TableHead>
                <TableHead className="min-w-[170px]">Tipo</TableHead>
                <TableHead className="min-w-[120px] text-right">
                  Cuota mensual
                </TableHead>
                <TableHead className="min-w-[120px] text-right">
                  Monto total
                </TableHead>
                <TableHead className="min-w-[120px] text-right">Saldo</TableHead>
                <TableHead className="min-w-[110px]">Estado</TableHead>
                <TableHead className="min-w-[120px]">Otorgado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNAS}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Cargando préstamos...
                  </TableCell>
                </TableRow>
              ) : prestamos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNAS}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay préstamos que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                prestamos.map((prestamo) => (
                  <TableRow
                    key={prestamo.id}
                    className={
                      prestamo.estado === 'CANCELADO' ? 'opacity-60' : ''
                    }
                  >
                    <TableCell className="text-sm">
                      <span className="font-medium block truncate">
                        {nombreCompleto(prestamo)}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {prestamo.empleado.numero_documento}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {TIPO_ETIQUETA[prestamo.tipo]}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {moneda(prestamo.cuota_mensual)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {moneda(prestamo.monto_total)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {prestamo.saldo === null ? (
                        <span
                          className="text-muted-foreground"
                          title="Descuento recurrente sin monto definido"
                        >
                          Recurrente
                        </span>
                      ) : (
                        moneda(prestamo.saldo)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={ESTADO_COLOR[prestamo.estado]}
                      >
                        {ESTADO_ETIQUETA[prestamo.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fechaCorta(prestamo.fecha_otorgado)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar préstamo de ${nombreCompleto(prestamo)}`}
                          disabled={prestamo.estado !== 'ACTIVO'}
                          onClick={() => onEditar(prestamo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Cancelar préstamo de ${nombreCompleto(prestamo)}`}
                          disabled={prestamo.estado !== 'ACTIVO'}
                          onClick={() => onCancelar(prestamo)}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
