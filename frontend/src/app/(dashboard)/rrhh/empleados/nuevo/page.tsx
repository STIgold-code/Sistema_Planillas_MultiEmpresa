'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import { ArrowLeft, Loader2, Save, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PhotocheckPreview } from '@/components/photocheck';
import { useEmpleadoNuevo } from './useEmpleadoNuevo';
import { TabPersonal } from './components/TabPersonal';
import { TabLaboral } from './components/TabLaboral';
import { TabBancario } from './components/TabBancario';
import { TabAdicional } from './components/TabAdicional';
import { SuccessDialog } from './components/SuccessDialog';

export default function NuevoEmpleadoPage() {
  const {
    form,
    loading,
    onSubmit,
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
    consultandoSbs,
    handleConsultarSbs,
    successDialogOpen,
    setSuccessDialogOpen,
    createdEmpleado,
    photocheckOpen,
    setPhotocheckOpen,
    empresa,
    router,
  } = useEmpleadoNuevo();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Nuevo Empleado</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Complete los datos del empleado</p>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Ruta Restringida</AlertTitle>
        <AlertDescription>
          Esta es una ruta de acceso restringido. La forma estandar de agregar empleados es
          mediante el proceso de seleccion:{' '}
          <strong>RRHH → Seleccion → Postulantes → Convertir a Empleado</strong>. Solo usuarios con
          permisos especiales pueden crear empleados directamente.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <TabsTrigger value="personal">Datos Personales</TabsTrigger>
              <TabsTrigger value="laboral">Datos Laborales</TabsTrigger>
              <TabsTrigger value="bancario">Datos Bancarios</TabsTrigger>
              <TabsTrigger value="adicional">Adicional</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <TabPersonal
                form={form}
                loading={loading}
                departamentos={departamentos}
                provincias={provincias}
                distritos={distritos}
                selectedDepartamentoId={selectedDepartamentoId}
                selectedProvinciaId={selectedProvinciaId}
              />
            </TabsContent>

            <TabsContent value="laboral">
              <TabLaboral
                form={form}
                loading={loading}
                areas={areas}
                cargos={cargos}
                sedes={sedes}
                regimenes={regimenes}
                consultandoSbs={consultandoSbs}
                handleConsultarSbs={handleConsultarSbs}
              />
            </TabsContent>

            <TabsContent value="bancario">
              <TabBancario form={form} bancos={bancos} />
            </TabsContent>

            <TabsContent value="adicional">
              <TabAdicional form={form} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 md:gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Empleado
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <SuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        createdEmpleado={createdEmpleado}
        onOpenPhotocheck={() => setPhotocheckOpen(true)}
      />

      {createdEmpleado && (
        <PhotocheckPreview
          open={photocheckOpen}
          onOpenChange={setPhotocheckOpen}
          empleado={createdEmpleado}
          empresaLogo={empresa?.logo_url}
          empresaNombre={empresa?.nombre_comercial || empresa?.razon_social}
          empresaTelefono={empresa?.telefono}
        />
      )}
    </div>
  );
}
