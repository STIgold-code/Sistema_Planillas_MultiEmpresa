'use client';

import { Postulante, TipoDocumentoEmpleado, PostulanteDocumento } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  XCircle,
  Trash2,
  Upload,
  Eye,
  Download,
  RefreshCw,
  History,
  CheckCircle2,
} from 'lucide-react';

interface DocumentosCardProps {
  postulante: Postulante;
  tiposDocumento: TipoDocumentoEmpleado[];
  documentos: PostulanteDocumento[];
  obligatorios: TipoDocumentoEmpleado[];
  docsFaltantes: TipoDocumentoEmpleado[];
  uploadingTipoId: number | null;
  deletingDocId: number | null;
  onDirectUpload: (tipoDocId: number, file: File | undefined) => Promise<void>;
  onDeleteDoc: (doc: PostulanteDocumento) => void;
  onOpenNuevaVersion: (doc: PostulanteDocumento) => void;
  onVerHistorial: (doc: PostulanteDocumento) => Promise<void>;
  onPreview: (url: string, nombre: string) => void;
  onDownload: (url: string, nombre: string) => Promise<void>;
}

export function DocumentosCard({
  postulante,
  tiposDocumento,
  documentos,
  obligatorios,
  docsFaltantes,
  uploadingTipoId,
  deletingDocId,
  onDirectUpload,
  onDeleteDoc,
  onOpenNuevaVersion,
  onVerHistorial,
  onPreview,
  onDownload,
}: DocumentosCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Documentos</CardTitle>
          {obligatorios.length > 0 && (
            <Badge variant={docsFaltantes.length === 0 ? 'default' : 'secondary'}>
              {obligatorios.length - docsFaltantes.length} de {obligatorios.length} obligatorios
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tiposDocumento.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            No hay tipos de documento configurados para seleccion
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <div className="inline-block min-w-full align-middle px-4 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Tipo de Documento</TableHead>
                    <TableHead className="min-w-[80px]">Estado</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">Archivo</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...tiposDocumento]
                    .sort((a, b) => {
                      if (a.es_obligatorio !== b.es_obligatorio) return a.es_obligatorio ? -1 : 1;
                      return a.orden - b.orden;
                    })
                    .map((tipo) => {
                      const uploaded = documentos.find(d => d.tipo_documento_empleado_id === tipo.id);
                      const isUploading = uploadingTipoId === tipo.id;
                      return (
                        <TableRow
                          key={tipo.id}
                          className={!uploaded && tipo.es_obligatorio ? 'bg-amber-50/50 dark:bg-amber-950/20' : undefined}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {uploaded ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              ) : tipo.es_obligatorio ? (
                                <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                              )}
                              <span className="font-medium text-sm">{tipo.nombre}</span>
                            </div>
                            {tipo.es_obligatorio && (
                              <span className="text-xs text-destructive ml-6">Obligatorio</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {uploaded ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                                  Subido
                                </Badge>
                                {uploaded.total_versiones > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    v{uploaded.version}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {uploaded ? (
                              <div>
                                <p className="text-sm truncate max-w-[200px]">
                                  {uploaded.archivo_nombre || 'Documento'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(uploaded.fecha_carga).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sin subir</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              {uploaded ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => onPreview(uploaded.archivo_url, uploaded.archivo_nombre || tipo.nombre)}
                                    title="Ver"
                                  >
                                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => onDownload(uploaded.archivo_url, uploaded.archivo_nombre || tipo.nombre)}
                                    title="Descargar"
                                  >
                                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                  {postulante.estado !== 'APROBADO' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8"
                                      onClick={() => onOpenNuevaVersion(uploaded)}
                                      title="Nueva version"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                  )}
                                  {uploaded.total_versiones > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8"
                                      onClick={() => onVerHistorial(uploaded)}
                                      title="Historial"
                                    >
                                      <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                  )}
                                  {postulante.estado !== 'APROBADO' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                      onClick={() => onDeleteDoc(uploaded)}
                                      disabled={deletingDocId === uploaded.id}
                                      title="Eliminar"
                                    >
                                      {deletingDocId === uploaded.id ? (
                                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      )}
                                    </Button>
                                  )}
                                </>
                              ) : postulante.estado !== 'APROBADO' ? (
                                <label className="cursor-pointer">
                                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                                    <span>
                                      {isUploading ? (
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Upload className="mr-2 h-3.5 w-3.5" />
                                      )}
                                      {isUploading ? 'Subiendo...' : 'Subir'}
                                    </span>
                                  </Button>
                                  {!isUploading && (
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      onChange={(e) => {
                                        onDirectUpload(tipo.id, e.target.files?.[0]);
                                        e.target.value = '';
                                      }}
                                    />
                                  )}
                                </label>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
