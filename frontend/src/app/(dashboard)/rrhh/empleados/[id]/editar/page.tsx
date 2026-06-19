'use client';

import { useRouter } from 'next/navigation';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEmpleadoEditar } from './useEmpleadoEditar';
import { EmpleadoPersonalTab } from './components/empleado-personal-tab';
import { EmpleadoLaboralTab } from './components/empleado-laboral-tab';
import { EmpleadoBancarioTab } from './components/empleado-bancario-tab';
import { EmpleadoAdicionalTab } from './components/empleado-adicional-tab';
import { EmpleadoCeseDialog } from './components/empleado-cese-dialog';
import { EmpleadoDocumentosTab } from './components/empleado-documentos-tab';

export default function EditarEmpleadoPage() {
  const router = useRouter();
  const {
    form,
    empleadoId,
    loading,
    loadingData,
    activeTab,
    setActiveTab,
    showCeseConfirm,
    setShowCeseConfirm,
    pendingSubmitData,
    areas,
    cargos,
    sedes,
    bancos,
    regimenes,
    departamentos,
    provincias,
    distritos,
    selectedDepartamentoId,
    selectedProvinciaId,
    isNewCese,
    onSubmit,
    onFormError,
    handleConsultarSbs,
    handleConfirmCese,
    handleCancelCese,
    consultandoSbs,
    nombreCompleto,
  } = useEmpleadoEditar();

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length <= 2) {
              router.push(`/rrhh/empleados/${empleadoId}`);
            } else {
              router.back();
            }
          }}
          className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Editar Empleado</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{nombreCompleto}</p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await form.handleSubmit(onSubmit, onFormError)(e);
            } catch (error) {
              console.error('Form submit error:', error);
              console.error('Form values:', JSON.stringify(form.getValues(), null, 2));
              toast.error('Error inesperado al validar el formulario. Revisa la consola.');
            }
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="w-full overflow-x-auto pb-2">
              <TabsList className="inline-flex w-max h-auto p-1 gap-1">
                <TabsTrigger value="personal" className="flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5">Personal</TabsTrigger>
                <TabsTrigger value="laboral" className="flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5">Laboral</TabsTrigger>
                <TabsTrigger value="bancario" className="flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5">Bancario</TabsTrigger>
                <TabsTrigger value="adicional" className="flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5">Adicional</TabsTrigger>
                <TabsTrigger value="documentos" className="flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5">Documentos</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="personal">
              <EmpleadoPersonalTab
                form={form}
                departamentos={departamentos}
                provincias={provincias}
                distritos={distritos}
                selectedDepartamentoId={selectedDepartamentoId}
                selectedProvinciaId={selectedProvinciaId}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="laboral">
              <EmpleadoLaboralTab
                form={form}
                areas={areas}
                cargos={cargos}
                sedes={sedes}
                regimenes={regimenes}
                isNewCese={isNewCese}
                consultandoSbs={consultandoSbs}
                loading={loading}
                onConsultarSbs={handleConsultarSbs}
              />
            </TabsContent>

            <TabsContent value="bancario">
              <EmpleadoBancarioTab form={form} bancos={bancos} />
            </TabsContent>

            <TabsContent value="adicional">
              <EmpleadoAdicionalTab form={form} />
            </TabsContent>

            <TabsContent value="documentos">
              <EmpleadoDocumentosTab empleadoId={empleadoId} />
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <EmpleadoCeseDialog
        open={showCeseConfirm}
        fechaCese={pendingSubmitData?.fecha_cese}
        onOpenChange={setShowCeseConfirm}
        onConfirm={handleConfirmCese}
        onCancel={handleCancelCese}
      />
    </div>
  );
}
