'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { usePrestamos } from './usePrestamos';
import { PrestamosTable } from './components/PrestamosTable';
import { PrestamoDialog } from './components/PrestamoDialog';
import { AdjuntarConvenioDialog } from './components/AdjuntarConvenioDialog';

export default function PrestamosPage() {
  const {
    prestamos,
    cargando,
    guardando,
    dialogoAbierto,
    setDialogoAbierto,
    dialogoCancelarAbierto,
    setDialogoCancelarAbierto,
    seleccionado,
    nombreEmpleado,
    expandidos,
    alternarDetalle,
    dialogoAdjuntarAbierto,
    setDialogoAdjuntarAbierto,
    adjuntando,
    abrirDialogoAdjuntar,
    adjuntarArchivos,
    filtroBuscar,
    setFiltroBuscar,
    filtroTipo,
    setFiltroTipo,
    filtroEstado,
    setFiltroEstado,
    form,
    abrirDialogoNuevo,
    abrirDialogoEdicion,
    abrirDialogoCancelar,
    guardar,
    confirmarCancelacion,
  } = usePrestamos();

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Préstamos y adelantos</h1>
          <p className="text-muted-foreground">
            Los descuentos se aplican solos en cada cálculo de planilla y el
            saldo se amortiza cuando la planilla se aprueba.
          </p>
        </div>
        <Button onClick={abrirDialogoNuevo}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo préstamo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o documento..."
            value={filtroBuscar}
            onChange={(evento) => setFiltroBuscar(evento.target.value)}
            aria-label="Buscar préstamos por trabajador"
          />
        </div>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            <SelectItem value="PRESTAMO">Préstamo</SelectItem>
            <SelectItem value="ADELANTO_SUELDO">Adelanto de sueldo</SelectItem>
            <SelectItem value="ADELANTO_GRATIFICACION">
              Adelanto de gratificación
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger
            className="w-full sm:w-[180px]"
            aria-label="Filtrar por estado"
          >
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="ACTIVO">Activos</SelectItem>
            <SelectItem value="PAGADO">Pagados</SelectItem>
            <SelectItem value="CANCELADO">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PrestamosTable
        prestamos={prestamos}
        cargando={cargando}
        expandidos={expandidos}
        onAlternarDetalle={alternarDetalle}
        onEditar={abrirDialogoEdicion}
        onCancelar={abrirDialogoCancelar}
        onAdjuntar={abrirDialogoAdjuntar}
      />

      <PrestamoDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        seleccionado={seleccionado}
        nombreEmpleado={nombreEmpleado}
        form={form}
        onSubmit={guardar}
        guardando={guardando}
      />

      <AdjuntarConvenioDialog
        key={`adjuntar-${seleccionado?.id ?? 'ninguno'}`}
        open={dialogoAdjuntarAbierto}
        onOpenChange={setDialogoAdjuntarAbierto}
        prestamo={seleccionado}
        onAdjuntar={adjuntarArchivos}
        adjuntando={adjuntando}
      />

      <AlertDialog
        open={dialogoCancelarAbierto}
        onOpenChange={setDialogoCancelarAbierto}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              El préstamo dejará de descontarse en las próximas planillas. Los
              cargos ya aplicados se conservan en el historial de movimientos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCancelacion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar préstamo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
