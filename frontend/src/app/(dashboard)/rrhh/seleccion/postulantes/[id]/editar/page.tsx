'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';
import { useEditarPostulante } from './hooks/useEditarPostulante';
import { CardIdentificacion } from './components/CardIdentificacion';
import { CardPersonales } from './components/CardPersonales';
import { CardContactoUbicacion } from './components/CardContactoUbicacion';
import { CardFisicosSeleccion } from './components/CardFisicosSeleccion';

export default function EditarPostulantePage() {
  const {
    postulante,
    procedencias,
    loading,
    saving,
    form,
    departamentoId,
    provinciaId,
    departamentos,
    provinciasFiltradas,
    distritosFiltrados,
    onSubmit,
    router,
  } = useEditarPostulante();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!postulante) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Postulante no encontrado</p>
      </div>
    );
  }

  if (postulante.empleado_id) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">
          Este postulante ya fue convertido a empleado. Edite desde la ficha del empleado.
        </p>
        <Button asChild>
          <Link href={`/rrhh/empleados/${postulante.empleado_id}`}>Ir al Empleado</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Editar Postulante</h1>
          <p className="text-muted-foreground">
            {postulante.apellido_paterno} {postulante.apellido_materno}, {postulante.nombres}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacion de Postulacion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Vacante</p>
              <p className="font-medium">{postulante.vacante?.codigo} - {postulante.vacante?.titulo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="font-medium">{postulante.estado}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha Postulacion</p>
              <p className="font-medium">{formatDateSafe(postulante.fecha_postulacion)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <CardIdentificacion form={form} />
          <CardPersonales form={form} />
          <CardContactoUbicacion
            form={form}
            departamentos={departamentos}
            provinciasFiltradas={provinciasFiltradas}
            distritosFiltrados={distritosFiltrados}
            departamentoId={departamentoId}
            provinciaId={provinciaId}
          />
          <CardFisicosSeleccion form={form} procedencias={procedencias} />

          <div className="flex justify-end gap-2 md:gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
