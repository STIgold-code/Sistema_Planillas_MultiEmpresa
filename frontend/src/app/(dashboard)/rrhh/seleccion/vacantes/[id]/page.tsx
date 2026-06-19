'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateSafe } from '@/lib/utils';
import { Vacante, Postulante, EstadoPostulante } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ArrowLeft, Loader2, Play, XCircle, Eye, Users, Pencil, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const estadoPostulanteBadge: Record<EstadoPostulante, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EN_PROCESO: 'secondary',
  APROBADO: 'default',
  RECHAZADO: 'destructive',
};

export default function VacanteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [vacante, setVacante] = useState<Vacante | null>(null);
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [estadisticas, setEstadisticas] = useState<{ total: number; por_estado: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  const fetchData = async () => {
    try {
      const [vacanteRes, postulantesRes, statsRes] = await Promise.all([
        api.get<Vacante>(`/vacantes/${id}`),
        api.get<{ data: Postulante[] }>(`/postulantes?vacante_id=${id}&limit=100`),
        api.get<{ total: number; por_estado: Record<string, number> }>(`/vacantes/${id}/estadisticas`),
      ]);
      setVacante(vacanteRes);
      setPostulantes(postulantesRes.data);
      setEstadisticas(statsRes);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/vacantes/${id}/${action}`, {});
      const mensajes: Record<string, string> = {
        publicar: 'publicada',
        cerrar: 'cerrada',
        cancelar: 'cancelada',
        reactivar: 'reactivada',
      };
      toast.success(`Vacante ${mensajes[action] || action} correctamente`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la vacante');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, action: '' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vacante) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vacante no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold">{vacante.titulo}</h1>
              <Badge variant={vacante.estado === 'PUBLICADA' || vacante.estado === 'EN_PROCESO' ? 'default' : 'outline'}>
                {vacante.estado}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{vacante.codigo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Botón Editar - disponible en BORRADOR, PUBLICADA y EN_PROCESO */}
          {(vacante.estado === 'BORRADOR' || vacante.estado === 'PUBLICADA' || vacante.estado === 'EN_PROCESO') && (
            <Button variant="outline" asChild>
              <Link href={`/rrhh/seleccion/vacantes/${vacante.id}/editar`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
          {vacante.estado === 'BORRADOR' && (
            <Button onClick={() => setConfirmDialog({ open: true, action: 'publicar' })} disabled={actionLoading}>
              <Play className="mr-2 h-4 w-4" />
              Publicar
            </Button>
          )}
          {(vacante.estado === 'PUBLICADA' || vacante.estado === 'EN_PROCESO') && (
            <>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: true, action: 'cerrar' })} disabled={actionLoading}>
                Cerrar
              </Button>
              <Button variant="destructive" onClick={() => setConfirmDialog({ open: true, action: 'cancelar' })} disabled={actionLoading}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}
          {(vacante.estado === 'CERRADA' || vacante.estado === 'CANCELADA') && (
            <Button variant="outline" onClick={() => setConfirmDialog({ open: true, action: 'reactivar' })} disabled={actionLoading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reactivar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Puestos Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{vacante.cantidad_puestos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Postulantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{estadisticas?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600">{estadisticas?.por_estado?.APROBADO || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Vacante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Area</p>
              <p className="font-medium">{vacante.area?.nombre || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sede</p>
              <p className="font-medium">{vacante.sede?.nombre || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cargo</p>
              <p className="font-medium">{vacante.cargo?.nombre || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sueldo Ofrecido</p>
              <p className="font-medium">
                {vacante.sueldo_ofrecido ? `S/. ${Number(vacante.sueldo_ofrecido).toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
              <p className="font-medium">{vacante.tipo_contrato || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modalidad</p>
              <p className="font-medium">{vacante.modalidad || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Cierre</p>
              <p className="font-medium">
                {vacante.fecha_cierre ? formatDateSafe(vacante.fecha_cierre) : '-'}
              </p>
            </div>
          </div>
          {vacante.descripcion && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Descripcion</p>
              <p className="mt-1 whitespace-pre-wrap">{vacante.descripcion}</p>
            </div>
          )}
          {vacante.requisitos && vacante.requisitos.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Requisitos</p>
              <ul className="space-y-2">
                {vacante.requisitos.map((req, idx) => {
                  const isString = typeof req === 'string';
                  const tipo = isString ? '' : req.tipo;
                  const descripcion = isString ? req : req.descripcion;
                  const obligatorio = isString ? false : req.obligatorio;
                  return (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        {tipo && <span className="text-sm font-medium">{tipo}: </span>}
                        <span className="text-sm">{descripcion || '-'}</span>
                        {obligatorio && <Badge variant="outline" className="ml-2 text-xs">Obligatorio</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Postulantes</CardTitle>
              <CardDescription>Lista de candidatos para esta vacante</CardDescription>
            </div>
            {(vacante.estado === 'PUBLICADA' || vacante.estado === 'EN_PROCESO') && (
              <Button asChild>
                <Link href={`/rrhh/seleccion/postulantes?vacante_id=${vacante.id}`}>
                  <Users className="mr-2 h-4 w-4" />
                  Ver Todos
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {postulantes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay postulantes registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Documento</TableHead>
                  <TableHead className="min-w-[200px]">Nombre Completo</TableHead>
                  <TableHead className="min-w-[100px]">Email</TableHead>
                  <TableHead className="min-w-[100px]">Celular</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postulantes.map((postulante) => (
                  <TableRow key={postulante.id}>
                    <TableCell className="font-mono">{postulante.numero_documento}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {postulante.apellido_paterno} {postulante.apellido_materno}, {postulante.nombres}
                    </TableCell>
                    <TableCell className="text-sm">{postulante.email || '-'}</TableCell>
                    <TableCell className="text-sm">{postulante.celular || '-'}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={estadoPostulanteBadge[postulante.estado]}>{postulante.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/rrhh/seleccion/postulantes/${postulante.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">
              {confirmDialog.action === 'publicar' && 'Publicar Vacante'}
              {confirmDialog.action === 'cerrar' && 'Cerrar Vacante'}
              {confirmDialog.action === 'cancelar' && 'Cancelar Vacante'}
              {confirmDialog.action === 'reactivar' && 'Reactivar Vacante'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmDialog.action === 'publicar' && 'La vacante sera visible para recibir postulaciones.'}
              {confirmDialog.action === 'cerrar' && 'No se podran recibir mas postulaciones.'}
              {confirmDialog.action === 'cancelar' && 'La vacante sera cancelada. Podra reactivarse posteriormente.'}
              {confirmDialog.action === 'reactivar' && 'La vacante volvera a estado borrador y podra ser editada y publicada nuevamente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction(confirmDialog.action)}
              className={confirmDialog.action === 'cancelar' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
