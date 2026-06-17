'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { TareoJustificacion } from '@/types';
import { getTipoJustificacionInfo } from './JustificacionModal';
import {
  Plus,
  Loader2,
  FileText,
  Trash2,
  Pencil,
  Calendar,
  User,
  Paperclip,
  Eye,
} from 'lucide-react';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

interface JustificacionesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: number;
  empleadoNombre: string;
  tareoId: number;
  periodoInfo: { mes: number; anio: number };
  onNuevaJustificacion: () => void;
  onEditarJustificacion: (justificacion: TareoJustificacion) => void;
  onJustificacionDeleted: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function JustificacionesDrawer({
  open,
  onOpenChange,
  empleadoId,
  empleadoNombre,
  tareoId,
  periodoInfo,
  onNuevaJustificacion,
  onEditarJustificacion,
  onJustificacionDeleted,
}: JustificacionesDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [justificaciones, setJustificaciones] = useState<TareoJustificacion[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Vista previa de archivos
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ archivo_url: string; archivo_nombre: string; archivo_tipo?: string }[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Cargar justificaciones cuando se abre el drawer
  useEffect(() => {
    if (open && empleadoId) {
      loadJustificaciones();
    }
  }, [open, empleadoId]);

  const loadJustificaciones = async () => {
    setLoading(true);
    try {
      const data = await api.get<TareoJustificacion[]>(
        `/tareo/justificaciones/empleado/${empleadoId}?anio=${periodoInfo.anio}`
      );
      setJustificaciones(data);
    } catch (error) {
      console.error('Error al cargar justificaciones:', error);
      toast.error('Error al cargar justificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete(`/tareo/justificaciones/${deleteId}`);
      toast.success('Justificación eliminada');
      setDeleteId(null);
      loadJustificaciones();
      onJustificacionDeleted();
    } catch (error) {
      console.error('Error al eliminar justificación:', error);
      toast.error('Error al eliminar justificación');
    } finally {
      setDeleting(false);
    }
  };

  // Agrupar justificaciones por mes
  const justificacionesPorMes = justificaciones.reduce((acc, j) => {
    const mes = j.tareo?.periodo?.mes || periodoInfo.mes;
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(j);
    return acc;
  }, {} as Record<number, TareoJustificacion[]>);

  const formatDias = (diaInicio: number, diaFin: number) => {
    if (diaInicio === diaFin) return `Día ${diaInicio}`;
    return `Días ${diaInicio} - ${diaFin}`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Justificaciones
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{empleadoNombre}</p>
            <p className="text-xs text-muted-foreground">
              Año {periodoInfo.anio}
            </p>
          </SheetHeader>

          <div className="mt-6">
            <Button onClick={onNuevaJustificacion} className="w-full mb-4">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Justificación
            </Button>

            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : justificaciones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay justificaciones registradas</p>
                </div>
              ) : (
                <div className="space-y-6 pr-4">
                  {Object.entries(justificacionesPorMes)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([mes, items]) => (
                      <div key={mes}>
                        <h3 className="font-medium text-sm text-muted-foreground mb-3">
                          {MESES[Number(mes) - 1]} {periodoInfo.anio}
                        </h3>
                        <div className="space-y-3">
                          {items.map((j) => {
                            const tipoInfo = getTipoJustificacionInfo(j.tipo);
                            return (
                              <div
                                key={j.id}
                                className="bg-muted/50 rounded-lg p-3 border hover:border-primary/50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={tipoInfo.color}>
                                      {tipoInfo.icon}
                                    </span>
                                    <span className="font-medium text-sm">
                                      {tipoInfo.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => onEditarJustificacion(j)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => setDeleteId(j.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDias(j.dia_inicio, j.dia_fin)}</span>
                                  </div>
                                  {/* Mostrar tipo de documento y código para certificados médicos */}
                                  {(j.tipo === 'CERTIFICADO_MEDICO' || j.tipo === 'DESCANSO_MEDICO') && j.tipo_documento && j.tipo_documento !== 'OTROS' && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-[10px] h-5">
                                        {j.tipo_documento === 'CCI' ? 'EsSalud (CCI)' : 'Privado'}
                                      </Badge>
                                      {j.codigo_certificado && (
                                        <span className="text-gray-600 font-mono">Código: {j.codigo_certificado}</span>
                                      )}
                                    </div>
                                  )}
                                  {j.descripcion && (
                                    <p className="text-gray-600 mt-1">{j.descripcion}</p>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    <span>{j.archivos.length} archivo(s)</span>
                                  </div>
                                  {j.usuario && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>Por: {j.usuario.nombre_completo}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Lista de archivos */}
                                {j.archivos.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {j.archivos.map((archivo, idx) => (
                                      <button
                                        key={archivo.id}
                                        onClick={() => {
                                          setPreviewFiles(j.archivos.map(a => ({
                                            archivo_url: a.archivo_url,
                                            archivo_nombre: a.archivo_nombre,
                                            archivo_tipo: a.archivo_tipo,
                                          })));
                                          setPreviewIndex(idx);
                                          setPreviewOpen(true);
                                        }}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline w-full text-left"
                                      >
                                        <Eye className="h-3 w-3" />
                                        {archivo.archivo_nombre}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar justificación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar esta justificación? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de vista previa de archivos */}
      <FilePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        files={previewFiles}
        initialIndex={previewIndex}
      />
    </>
  );
}
