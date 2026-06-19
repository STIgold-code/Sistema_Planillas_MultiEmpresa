'use client';

import { CarnetSucamec, EstadoCarnetSucamec, CategoriaSucamec } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Eye, PlayCircle } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';

const estadoBadgeVariant: Record<EstadoCarnetSucamec, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  VIGENTE: 'default',
  VENCIDO: 'destructive',
  SUSPENDIDO: 'secondary',
  ANULADO: 'outline',
};

interface Props {
  historial: CarnetSucamec[];
  getCategoriaLabel: (cat: CategoriaSucamec) => string;
  onVerDetalle: (c: CarnetSucamec) => void;
  onReactivar: (c: CarnetSucamec) => void;
}

export function SucamecHistorial({ historial, getCategoriaLabel, onVerDetalle, onReactivar }: Props) {
  if (historial.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de Carnets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N Carnet</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.map(carnet => (
                <TableRow key={carnet.id}>
                  <TableCell className="font-mono text-sm">{carnet.numero_carnet}</TableCell>
                  <TableCell>{getCategoriaLabel(carnet.categoria)}</TableCell>
                  <TableCell>{formatDateSafe(carnet.fecha_vencimiento)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant[carnet.estado]}>{carnet.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    {carnet.documento ? (
                      <a href={carnet.documento.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                        Ver
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onVerDetalle(carnet)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {carnet.estado === 'SUSPENDIDO' && (
                        <Button variant="ghost" size="icon" onClick={() => onReactivar(carnet)} title="Reactivar">
                          <PlayCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
