'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePostulantes } from './hooks/usePostulantes';
import { PostulantesTabla } from './components/PostulantesTabla';
import { NuevoPostulanteDialog } from './components/NuevoPostulanteDialog';

export default function PostulantesPage() {
  const hook = usePostulantes();

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Postulantes</h1>
          <p className="text-muted-foreground">Gestiona los candidatos a las vacantes</p>
        </div>
        <Button onClick={() => hook.setDialogOpen(true)} disabled={hook.vacantes.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Postulante
        </Button>
      </div>

      {hook.vacantes.length === 0 && !hook.loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Debes tener al menos una vacante publicada para registrar postulantes.
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por documento o nombre..."
            value={hook.buscarInput}
            onChange={(e) => { hook.setBuscarInput(e.target.value); hook.debouncedSetBuscar(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={hook.getFilter('vacante_id')} onValueChange={(v) => hook.setFilter('vacante_id', v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Vacante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {hook.vacantes.map((v) => (
              <SelectItem key={v.id} value={v.id.toString()}>
                {v.codigo} - {v.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hook.getFilter('estado')} onValueChange={(v) => hook.setFilter('estado', v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
            <SelectItem value="APROBADO">Aprobado</SelectItem>
            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PostulantesTabla
        postulantes={hook.postulantes}
        loading={hook.loading}
        onView={(id) => hook.router.push(`/rrhh/seleccion/postulantes/${id}`)}
        onEdit={(id) => hook.router.push(`/rrhh/seleccion/postulantes/${id}/editar`)}
        onDelete={hook.setDeletePostulante}
      />

      {hook.meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {hook.postulantes.length} de {hook.meta.total} postulantes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => hook.setPage(hook.page - 1)}
              disabled={hook.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pagina {hook.page} de {hook.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => hook.setPage(hook.page + 1)}
              disabled={hook.page >= hook.meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <NuevoPostulanteDialog
        open={hook.dialogOpen}
        onOpenChange={hook.setDialogOpen}
        form={hook.form}
        onSubmit={hook.onSubmit}
        saving={hook.saving}
        vacantes={hook.vacantes}
        procedencias={hook.procedencias}
        onClose={hook.handleCloseDialog}
      />

      <AlertDialog open={!!hook.deletePostulante} onOpenChange={(open) => !open && hook.setDeletePostulante(null)}>
        <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Postulante</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar al postulante{' '}
              <strong>
                {hook.deletePostulante?.apellido_paterno} {hook.deletePostulante?.apellido_materno}, {hook.deletePostulante?.nombres}
              </strong>
              ? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={hook.handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={hook.deleting}
            >
              {hook.deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
