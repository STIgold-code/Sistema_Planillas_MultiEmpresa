'use client';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ArrowLeft, Loader2, UserCheck } from 'lucide-react';
import { useConvertirPostulante } from './useConvertirPostulante';
import { DatosPostulanteCard } from './components/DatosPostulanteCard';
import { DatosLaboralesCard } from './components/DatosLaboralesCard';
import { SistemaPensionarioCard } from './components/SistemaPensionarioCard';
import { BonosCard } from './components/BonosCard';
import { DatosBancariosCard } from './components/DatosBancariosCard';
import { ContactoCorporativoCard } from './components/ContactoCorporativoCard';

export default function ConvertirEmpleadoPage() {
  const {
    postulante, areas, cargos, sedes, regimenes, bancos,
    loading, saving, consultandoSbs,
    form, onSubmit, handleConsultarSbs,
    router,
  } = useConvertirPostulante();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!postulante) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Convertir a Empleado</h1>
          <p className="text-muted-foreground">
            {postulante.apellido_paterno} {postulante.apellido_materno}, {postulante.nombres}
          </p>
        </div>
      </div>

      <DatosPostulanteCard postulante={postulante} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <DatosLaboralesCard form={form} areas={areas} cargos={cargos} sedes={sedes} />
          <SistemaPensionarioCard
            form={form}
            regimenes={regimenes}
            consultandoSbs={consultandoSbs}
            onConsultarSbs={handleConsultarSbs}
          />
          <BonosCard form={form} />
          <DatosBancariosCard form={form} bancos={bancos} />
          <ContactoCorporativoCard form={form} />

          <div className="flex justify-end gap-2 md:gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserCheck className="mr-2 h-4 w-4" />
              Crear Empleado
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
