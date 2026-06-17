'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Eye,
  Trash2,
  File,
  History,
  RefreshCw,
  FolderUp,
  AlertCircle,
} from 'lucide-react';
import type { DocumentoSubido } from './documentos-tab.types';

interface DocumentosSubidosCardProps {
  documentosSubidos: DocumentoSubido[];
  deletingId: number | null;
  getEstadoVencimiento: (fechaVencimiento: string | null) => { estado: string; label: string; color: string };
  onView: (url: string) => void;
  onNuevaVersion: (doc: DocumentoSubido) => void;
  onHistorial: (doc: DocumentoSubido) => void;
  onDelete: (doc: DocumentoSubido) => void;
}

export function DocumentosSubidosCard({
  documentosSubidos,
  deletingId,
  getEstadoVencimiento,
  onView,
  onNuevaVersion,
  onHistorial,
  onDelete,
}: DocumentosSubidosCardProps) {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderUp className="h-4 w-4" />
          Documentos Subidos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {documentosSubidos.map((doc) => {
            const estadoVenc = getEstadoVencimiento(doc.fecha_vencimiento);
            const tieneVersiones = doc.total_versiones > 1;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {doc.tipo_documento_empleado?.nombre || doc.descripcion || 'Documento'}
                      </p>
                      {tieneVersiones && (
                        <Badge variant="outline" className="text-xs">
                          v{doc.version}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doc.archivo_nombre || 'archivo'} - {new Date(doc.fecha_carga).toLocaleDateString()}
                      {doc.subido_por && ` - ${doc.subido_por.nombre_completo}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.fecha_vencimiento && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={
                              estadoVenc.estado === 'vencido'
                                ? 'destructive'
                                : estadoVenc.estado === 'por_vencer'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {estadoVenc.estado === 'vencido' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {estadoVenc.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Vence: {doc.fecha_vencimiento.split('T')[0].split('-').reverse().join('/')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onView(doc.archivo_url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver documento</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onNuevaVersion(doc)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Subir nueva versión</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {tieneVersiones && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onHistorial(doc)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver historial de versiones</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(doc)}
                          disabled={deletingId === doc.id}
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar documento</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
