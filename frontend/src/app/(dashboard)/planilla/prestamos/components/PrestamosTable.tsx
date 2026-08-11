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
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Pencil,
} from 'lucide-react';
import {
  ESTADO_COLOR,
  ESTADO_ETIQUETA,
  MOVIMIENTO_ETIQUETA,
  Prestamo,
  TIPO_ETIQUETA,
} from '../usePrestamos';

interface Props {
  prestamos: Prestamo[];
  cargando: boolean;
  expandidos: Set<number>;
  onAlternarDetalle: (id: number) => void;
  onEditar: (prestamo: Prestamo) => void;
  onCancelar: (prestamo: Prestamo) => void;
  onAdjuntar: (prestamo: Prestamo) => void;
}

const COLUMNAS = 9;

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
  expandidos,
  onAlternarDetalle,
  onEditar,
  onCancelar,
  onAdjuntar,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden md:rounded-lg border-0 md:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <span className="sr-only">Movimientos</span>
                </TableHead>
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
                prestamos.flatMap((prestamo) => [
                  <TableRow
                    key={prestamo.id}
                    className={
                      prestamo.estado === 'CANCELADO' ? 'opacity-60' : ''
                    }
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-expanded={expandidos.has(prestamo.id)}
                        aria-label={
                          expandidos.has(prestamo.id)
                            ? `Ocultar movimientos de ${nombreCompleto(prestamo)}`
                            : `Ver movimientos de ${nombreCompleto(prestamo)}`
                        }
                        onClick={() => onAlternarDetalle(prestamo.id)}
                      >
                        {expandidos.has(prestamo.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium block truncate">
                        {nombreCompleto(prestamo)}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {prestamo.empleado.numero_documento}
                      </span>
                      {prestamo.archivos.length === 0 && (
                        <span className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Sin convenio adjunto
                        </span>
                      )}
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
                          aria-label={`Adjuntar convenio al préstamo de ${nombreCompleto(prestamo)}`}
                          onClick={() => onAdjuntar(prestamo)}
                        >
                          <Paperclip
                            className={
                              prestamo.archivos.length === 0
                                ? 'h-4 w-4 text-amber-600'
                                : 'h-4 w-4'
                            }
                          />
                        </Button>
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
                  </TableRow>,
                  ...(expandidos.has(prestamo.id)
                    ? [
                        <TableRow
                          key={`${prestamo.id}-movimientos`}
                          className="bg-muted/40 hover:bg-muted/40"
                        >
                          <TableCell colSpan={COLUMNAS} className="py-3">
                            {prestamo.movimientos.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Todavía no hay movimientos. El primer cargo se
                                registra cuando se aprueba una planilla.
                              </p>
                            ) : (
                              <ul className="space-y-1">
                                {prestamo.movimientos.map((movimiento) => (
                                  <li
                                    key={movimiento.id}
                                    className="flex flex-wrap items-baseline gap-x-3 text-sm"
                                  >
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {fechaCorta(movimiento.fecha)}
                                    </span>
                                    <span className="font-medium">
                                      {MOVIMIENTO_ETIQUETA[movimiento.tipo]}
                                    </span>
                                    <span className="font-mono">
                                      {moneda(movimiento.monto)}
                                    </span>
                                    {movimiento.planilla_id !== null && (
                                      <span className="text-xs text-muted-foreground">
                                        Planilla #{movimiento.planilla_id}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                        </TableRow>,
                      ]
                    : []),
                ])
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
