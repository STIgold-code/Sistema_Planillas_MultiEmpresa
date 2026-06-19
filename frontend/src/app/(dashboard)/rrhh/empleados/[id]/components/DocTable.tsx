'use client';

import { EmpleadoDocumento } from '@/types';
import { toDateString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Eye, Loader2, Trash2 } from 'lucide-react';

export type DocEntry = EmpleadoDocumento;

export interface DocActionsProps {
  formatDate: (d: string | null | undefined) => string;
  canDelete: boolean;
  deletingDocId: number | null;
  handleVerDocumento: (url: string, nombre: string) => void;
  handleDescargarDocumento: (url: string, nombre: string) => Promise<void>;
  handleDeleteDocumento: (id: number) => Promise<void>;
}

export function DocRow({
  doc,
  formatDate,
  canDelete,
  deletingDocId,
  handleVerDocumento,
  handleDescargarDocumento,
  handleDeleteDocumento,
}: { doc: DocEntry } & DocActionsProps) {
  const hoyStr = toDateString(new Date());
  const vencStr = doc.fecha_vencimiento ? doc.fecha_vencimiento.split('T')[0] : null;
  const estaVencido = vencStr ? vencStr < hoyStr : false;
  const diasRestantes = vencStr
    ? Math.round(
        (new Date(vencStr + 'T12:00:00').getTime() - new Date(hoyStr + 'T12:00:00').getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const porVencer = diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 30;

  return (
    <TableRow className={estaVencido ? 'bg-red-50' : porVencer ? 'bg-amber-50' : ''}>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {doc.tipo_documento_empleado?.codigo || '-'}
        </Badge>
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm max-w-[150px] truncate">
        {doc.archivo_nombre || 'Documento'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[150px] truncate">
        {doc.descripcion || '-'}
      </TableCell>
      <TableCell className="text-sm">
        {vencStr ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs sm:text-sm">{formatDate(doc.fecha_vencimiento)}</span>
            {estaVencido && (
              <Badge variant="destructive" className="text-xs w-fit">
                Vencido
              </Badge>
            )}
            {porVencer && (
              <Badge variant="secondary" className="text-xs w-fit bg-amber-100 text-amber-700">
                {diasRestantes} dias
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => handleVerDocumento(doc.archivo_url, doc.archivo_nombre || 'documento')}
            title="Ver documento"
          >
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => handleDescargarDocumento(doc.archivo_url, doc.archivo_nombre || 'documento')}
            title="Descargar"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
              onClick={() => handleDeleteDocumento(doc.id)}
              disabled={deletingDocId === doc.id}
              title="Eliminar"
            >
              {deletingDocId === doc.id ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DocTable({
  docs,
  emptyMessage,
  ...actions
}: { docs: DocEntry[]; emptyMessage: string } & DocActionsProps) {
  if (docs.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6">
      <div className="inline-block min-w-full align-middle px-4 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[60px]">Tipo</TableHead>
              <TableHead className="min-w-[120px]">Archivo</TableHead>
              <TableHead className="min-w-[100px] hidden md:table-cell">Descripcion</TableHead>
              <TableHead className="min-w-[100px]">Vencimiento</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} {...actions} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
