'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Download, Pencil, Power, Trash2, FileCheck } from 'lucide-react';
import { PlantillaDocumento, categoriaLabels, categoriaColors } from '../useBancoDocumentos';

interface Props {
  loading: boolean;
  filteredPlantillas: PlantillaDocumento[];
  downloadingId: number | null;
  onDownload: (p: PlantillaDocumento) => void;
  onEdit: (p: PlantillaDocumento) => void;
  onToggle: (p: PlantillaDocumento) => void;
  onDelete: (p: PlantillaDocumento) => void;
}

export function PlantillasTable({
  loading, filteredPlantillas, downloadingId,
  onDownload, onEdit, onToggle, onDelete,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden md:rounded-lg border-0 md:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Codigo</TableHead>
                <TableHead className="min-w-[150px]">Nombre</TableHead>
                <TableHead className="min-w-[120px]">Formato</TableHead>
                <TableHead className="min-w-[120px]">Categoria</TableHead>
                <TableHead className="text-center min-w-[100px]">Obligatorio</TableHead>
                <TableHead className="text-center min-w-[100px]">Firma</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="w-[150px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Cargando plantillas...
                  </TableCell>
                </TableRow>
              ) : filteredPlantillas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay plantillas registradas
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlantillas.map(plantilla => (
                  <TableRow key={plantilla.id} className={!plantilla.activo ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm">{plantilla.codigo}</TableCell>
                    <TableCell className="text-sm max-w-[220px]" title={plantilla.nombre}>
                      <div>
                        <span className="font-medium truncate block">{plantilla.nombre}</span>
                        {plantilla.descripcion && (
                          <p className="text-xs text-muted-foreground truncate">{plantilla.descripcion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary" className={categoriaColors[plantilla.categoria]}>
                        {categoriaLabels[plantilla.categoria]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {plantilla.es_obligatorio ? (
                        <FileCheck className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {plantilla.requiere_firma ? 'Si' : 'No'}
                    </TableCell>
                    <TableCell className="text-center">
                      {plantilla._count?.documentos_generados || 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={plantilla.activo ? 'default' : 'secondary'}>
                        {plantilla.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onDownload(plantilla)} disabled={downloadingId === plantilla.id}>
                              {downloadingId === plantilla.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Download className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Descargar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onEdit(plantilla)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onToggle(plantilla)}>
                              <Power className={`h-4 w-4 ${plantilla.activo ? 'text-orange-500' : 'text-green-500'}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{plantilla.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(plantilla)}
                              disabled={(plantilla._count?.documentos_generados || 0) > 0}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {(plantilla._count?.documentos_generados || 0) > 0
                              ? 'No se puede eliminar (tiene documentos)'
                              : 'Eliminar'}
                          </TooltipContent>
                        </Tooltip>
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
