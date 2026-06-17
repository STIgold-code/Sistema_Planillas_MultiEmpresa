'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Download,
  Upload,
  FileCheck,
} from 'lucide-react';
import type { DocumentoGenerado } from './documentos-tab.types';

const estadoConfig = {
  PENDIENTE: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
  FIRMADO: { label: 'Firmado', variant: 'default' as const, icon: CheckCircle },
  RECHAZADO: { label: 'Rechazado', variant: 'destructive' as const, icon: XCircle },
};

const categoriaLabels: Record<string, string> = {
  INGRESO: 'Ingreso',
  LABORAL: 'Laboral',
  SALIDA: 'Salida',
};

interface DocumentosGeneradosSectionProps {
  documentosPorCategoria: Record<string, DocumentoGenerado[]>;
  updatingEstado: number | null;
  uploadingId: number | null;
  deletingId: number | null;
  onUpdateEstado: (docId: number, estado: 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO') => void;
  onPreview: (doc: DocumentoGenerado) => void;
  onDownloadPdf: (doc: DocumentoGenerado) => void;
  onUploadClick: (docId: number) => void;
  onViewFirmado: (url: string) => void;
  onDelete: (doc: DocumentoGenerado) => void;
}

export function DocumentosGeneradosSection({
  documentosPorCategoria,
  updatingEstado,
  uploadingId,
  deletingId,
  onUpdateEstado,
  onPreview,
  onDownloadPdf,
  onUploadClick,
  onViewFirmado,
  onDelete,
}: DocumentosGeneradosSectionProps) {
  return (
    <div className="space-y-6">
      {(['INGRESO', 'LABORAL', 'SALIDA'] as const).map((categoria) => {
        const docs = documentosPorCategoria[categoria];
        if (!docs || docs.length === 0) return null;

        return (
          <Card key={categoria}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">
                Documentos de {categoriaLabels[categoria]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {docs.map((doc) => {
                  const config = estadoConfig[doc.estado];
                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.plantilla_documento.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.plantilla_documento.codigo} -{' '}
                            {new Date(doc.fecha_generacion).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={doc.estado}
                          onValueChange={(value) =>
                            onUpdateEstado(doc.id, value as 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO')
                          }
                          disabled={updatingEstado === doc.id}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {updatingEstado === doc.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <StatusIcon className="h-3 w-3" />
                                )}
                                <span className="text-xs">{config.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDIENTE">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </div>
                            </SelectItem>
                            <SelectItem value="FIRMADO">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" />
                                Firmado
                              </div>
                            </SelectItem>
                            <SelectItem value="RECHAZADO">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-3 w-3" />
                                Rechazado
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onPreview(doc)}
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
                                onClick={() => onDownloadPdf(doc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Descargar PDF</TooltipContent>
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
                                onClick={() => onUploadClick(doc.id)}
                                disabled={uploadingId === doc.id}
                              >
                                {uploadingId === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Subir documento firmado</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {doc.archivo_firmado_url && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700"
                                  onClick={() => onViewFirmado(doc.archivo_firmado_url!)}
                                >
                                  <FileCheck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver documento firmado</TooltipContent>
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
      })}
    </div>
  );
}
