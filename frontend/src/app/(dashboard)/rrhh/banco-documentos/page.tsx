'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { useBancoDocumentos } from './useBancoDocumentos';
import { PlantillasTable } from './components/PlantillasTable';
import { PlantillaDialog } from './components/PlantillaDialog';

export default function BancoDocumentosPage() {
  const {
    variables, loading, saving, dialogOpen, setDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen, downloadingId,
    selectedPlantilla, filterCategoria, setFilterCategoria,
    showInactive, setShowInactive, selectedFile, setSelectedFile,
    extractedVariables, isExtracting, fileInputRef, tipoArchivo,
    form, filteredPlantillas, getAllVariableKeys,
    openCreateDialog, openEditDialog, openDeleteDialog,
    onSubmit, handleDelete, handleToggle, handleDownload, handleFileChange,
  } = useBancoDocumentos();

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 min-h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Banco de Documentos</h1>
            <p className="text-muted-foreground">
              Gestiona los archivos Word y Excel para generar documentos de empleados
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorias</SelectItem>
              <SelectItem value="INGRESO">Ingreso</SelectItem>
              <SelectItem value="LABORAL">Laboral</SelectItem>
              <SelectItem value="SALIDA">Salida</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              id="showInactive"
              checked={showInactive}
              onCheckedChange={checked => setShowInactive(checked as boolean)}
            />
            <label htmlFor="showInactive" className="text-sm">Mostrar inactivas</label>
          </div>
        </div>

        <PlantillasTable
          loading={loading}
          filteredPlantillas={filteredPlantillas}
          downloadingId={downloadingId}
          onDownload={handleDownload}
          onEdit={openEditDialog}
          onToggle={handleToggle}
          onDelete={openDeleteDialog}
        />

        <PlantillaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedPlantilla={selectedPlantilla}
          form={form}
          onSubmit={onSubmit}
          saving={saving}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          extractedVariables={extractedVariables}
          isExtracting={isExtracting}
          fileInputRef={fileInputRef}
          tipoArchivo={tipoArchivo}
          variables={variables}
          getAllVariableKeys={getAllVariableKeys}
          onFileChange={handleFileChange}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Plantilla</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estas seguro de eliminar la plantilla "{selectedPlantilla?.nombre}"?
                Esta accion no se puede deshacer y eliminara el archivo base asociado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
