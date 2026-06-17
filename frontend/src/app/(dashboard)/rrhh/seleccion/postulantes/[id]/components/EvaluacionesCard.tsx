'use client';

import { Postulante, TipoEvaluacionMaestro } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  ClipboardCheck,
  Trash2,
  Upload,
  TrendingUp,
  Eye,
  Download,
  X,
  CheckCircle2,
} from 'lucide-react';

interface EvaluacionesCardProps {
  postulante: Postulante;
  tiposEvaluacion: TipoEvaluacionMaestro[];
  promedio: { promedio: string | null; total_evaluaciones: number } | null;
  evalObligatorias: TipoEvaluacionMaestro[];
  evalsFaltantes: TipoEvaluacionMaestro[];
  puedeEditar: boolean;
  expandedEvalTipoId: number | null;
  setExpandedEvalTipoId: (id: number | null) => void;
  evalFormData: { puntaje: string; comentario: string };
  setEvalFormData: (data: { puntaje: string; comentario: string }) => void;
  evalArchivo: File | null;
  setEvalArchivo: (file: File | null) => void;
  savingEvalTipoId: number | null;
  evalFileInputRef: React.RefObject<HTMLInputElement | null>;
  onGuardarEvaluacion: (tipoEvalId: number) => Promise<void>;
  onEliminarEvaluacion: (id: number) => void;
  onPreview: (url: string, nombre: string) => void;
  onDownload: (url: string, nombre: string) => Promise<void>;
}

export function EvaluacionesCard({
  postulante,
  tiposEvaluacion,
  promedio,
  evalObligatorias,
  evalsFaltantes,
  puedeEditar,
  expandedEvalTipoId,
  setExpandedEvalTipoId,
  evalFormData,
  setEvalFormData,
  evalArchivo,
  setEvalArchivo,
  savingEvalTipoId,
  evalFileInputRef,
  onGuardarEvaluacion,
  onEliminarEvaluacion,
  onPreview,
  onDownload,
}: EvaluacionesCardProps) {
  const isSavingEval = savingEvalTipoId !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Evaluaciones</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {promedio && promedio.total_evaluaciones > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Promedio: {promedio.promedio || 'N/A'}
                </span>
              </div>
            )}
            {evalObligatorias.length > 0 && (
              <Badge variant={evalsFaltantes.length === 0 ? 'default' : 'secondary'}>
                {evalObligatorias.length - evalsFaltantes.length} de {evalObligatorias.length} obligatorias
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tiposEvaluacion.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No hay tipos de evaluacion configurados</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <div className="inline-block min-w-full align-middle px-4 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Tipo de Evaluacion</TableHead>
                    <TableHead className="min-w-[80px]">Estado</TableHead>
                    <TableHead className="min-w-[80px] hidden md:table-cell">Puntaje</TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">Comentario</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...tiposEvaluacion]
                    .sort((a, b) => {
                      if (a.es_obligatorio !== b.es_obligatorio) return a.es_obligatorio ? -1 : 1;
                      return a.orden - b.orden;
                    })
                    .map((tipo) => {
                      const evaluacion = (postulante.evaluaciones_detalle || []).find(
                        e => e.tipo_evaluacion_id === tipo.id,
                      );
                      const isExpanded = expandedEvalTipoId === tipo.id;
                      const isSaving = savingEvalTipoId === tipo.id;

                      return (
                        <TableRow
                          key={tipo.id}
                          className={!evaluacion && tipo.es_obligatorio ? 'bg-amber-50/50 dark:bg-amber-950/20' : undefined}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {evaluacion ? (
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
                            {tipo.puntaje_maximo && (
                              <span className="text-xs text-muted-foreground ml-6 block">
                                Puntaje max: {Number(tipo.puntaje_maximo).toFixed(0)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {evaluacion ? (
                              <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                                Completada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {evaluacion?.puntaje != null ? (
                              <span className="text-sm font-medium">
                                {Number(evaluacion.puntaje).toFixed(1)}
                                {tipo.puntaje_maximo ? ` / ${Number(tipo.puntaje_maximo).toFixed(0)}` : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {evaluacion?.comentario ? (
                              <p className="text-sm truncate max-w-[200px]">{evaluacion.comentario}</p>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              {evaluacion ? (
                                <>
                                  {evaluacion.archivo_url && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 sm:h-8 sm:w-8"
                                        onClick={() => onPreview(evaluacion.archivo_url!, evaluacion.archivo_nombre || 'archivo')}
                                        title="Ver archivo"
                                      >
                                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 sm:h-8 sm:w-8"
                                        onClick={() => onDownload(evaluacion.archivo_url!, evaluacion.archivo_nombre || 'archivo')}
                                        title="Descargar"
                                      >
                                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {puedeEditar && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                                      onClick={() => onEliminarEvaluacion(evaluacion.id)}
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </Button>
                                  )}
                                </>
                              ) : puedeEditar ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedEvalTipoId(isExpanded ? null : tipo.id);
                                    setEvalFormData({ puntaje: '', comentario: '' });
                                    setEvalArchivo(null);
                                  }}
                                >
                                  <ClipboardCheck className="mr-2 h-3.5 w-3.5" />
                                  {isExpanded ? 'Cancelar' : 'Registrar'}
                                </Button>
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

        {expandedEvalTipoId && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-3">
              Registrar: {tiposEvaluacion.find(t => t.id === expandedEvalTipoId)?.nombre}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">Puntaje</label>
                <Input
                  type="number"
                  min="0"
                  max={tiposEvaluacion.find(t => t.id === expandedEvalTipoId)?.puntaje_maximo || 100}
                  step="0.1"
                  value={evalFormData.puntaje}
                  onChange={(e) => setEvalFormData({ ...evalFormData, puntaje: e.target.value })}
                  placeholder={`0 - ${tiposEvaluacion.find(t => t.id === expandedEvalTipoId)?.puntaje_maximo || 100}`}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Archivo (opcional)</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={evalFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => setEvalArchivo(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => evalFileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{evalArchivo ? evalArchivo.name : 'Seleccionar archivo'}</span>
                  </Button>
                  {evalArchivo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEvalArchivo(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground">Comentario</label>
                <Textarea
                  value={evalFormData.comentario}
                  onChange={(e) => setEvalFormData({ ...evalFormData, comentario: e.target.value })}
                  placeholder="Observaciones de la evaluacion..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setExpandedEvalTipoId(null); setEvalArchivo(null); }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => onGuardarEvaluacion(expandedEvalTipoId)}
                disabled={isSavingEval}
              >
                {isSavingEval && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
