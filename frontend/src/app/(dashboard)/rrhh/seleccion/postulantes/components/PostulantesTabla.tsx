'use client';

import { Postulante, EstadoPostulante } from '@/types';
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
import { Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';

const estadoBadgeVariant: Record<EstadoPostulante, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EN_PROCESO: 'secondary',
  APROBADO: 'default',
  RECHAZADO: 'destructive',
};

interface PostulantesTablaProps {
  postulantes: Postulante[];
  loading: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (postulante: Postulante) => void;
}

export function PostulantesTabla({
  postulantes,
  loading,
  onView,
  onEdit,
  onDelete,
}: PostulantesTablaProps) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0 flex-1">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden md:rounded-lg border-0 md:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Documento</TableHead>
                <TableHead className="min-w-[200px]">Nombre Completo</TableHead>
                <TableHead className="min-w-[100px]">Email</TableHead>
                <TableHead className="min-w-[100px]">Vacante</TableHead>
                <TableHead className="min-w-[100px]">Cargo</TableHead>
                <TableHead className="min-w-[150px]">Procedencia</TableHead>
                <TableHead className="min-w-[200px]">Fecha Postulacion</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : postulantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No hay postulantes registrados
                  </TableCell>
                </TableRow>
              ) : (
                postulantes.map((postulante) => (
                  <TableRow key={postulante.id}>
                    <TableCell className="font-mono">{postulante.numero_documento}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {postulante.apellido_paterno} {postulante.apellido_materno}, {postulante.nombres}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={postulante.email || undefined}>
                      {postulante.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate" title={postulante.vacante?.codigo || undefined}>
                      {postulante.vacante?.codigo || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate" title={postulante.vacante?.cargo?.nombre || undefined}>
                      {postulante.vacante?.cargo?.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate" title={postulante.procedencia_rel?.nombre || undefined}>
                      {postulante.procedencia_rel?.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateSafe(postulante.fecha_postulacion)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={estadoBadgeVariant[postulante.estado]}>{postulante.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(postulante.id)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!postulante.empleado_id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(postulante.id)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDelete(postulante)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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
