'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ConvertirFormValues } from '../useConvertirPostulante';
import { Area, Cargo, Sede } from '../useConvertirPostulante';

interface Props {
  form: UseFormReturn<ConvertirFormValues>;
  areas: Area[];
  cargos: Cargo[];
  sedes: Sede[];
}

export function DatosLaboralesCard({ form, areas, cargos, sedes }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos Laborales</CardTitle>
        <CardDescription>Configura los datos de ingreso del nuevo empleado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="fecha_ingreso"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Ingreso *</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sueldo_base"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sueldo Base (S/.) *</FormLabel>
                <FormControl><Input {...field} type="number" step="0.01" placeholder="1130.00" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="area_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cargo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cargos.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sede_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sede</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sedes.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-2 md:gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="tipo_pago"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Pago</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PLANILLA">Planilla</SelectItem>
                    <SelectItem value="RECIBO">Recibo por Honorarios</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="turno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Turno</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DIA">Dia</SelectItem>
                    <SelectItem value="NOCHE">Noche</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border-t my-4" />

        <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FormField
            control={form.control}
            name="tipo_contrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Contrato *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SUJETO_A_MODALIDAD">Sujeto a Modalidad</SelectItem>
                    <SelectItem value="INDEFINIDO">Indefinido</SelectItem>
                    <SelectItem value="LOCACION">Locacion de Servicios</SelectItem>
                    <SelectItem value="OBRA_SERVICIO">Obra o Servicio</SelectItem>
                    <SelectItem value="TIEMPO_PARCIAL">Tiempo Parcial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="modalidad_contrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidad *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TIEMPO_COMPLETO">Tiempo Completo</SelectItem>
                    <SelectItem value="TIEMPO_PARCIAL">Tiempo Parcial</SelectItem>
                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                    <SelectItem value="REMOTO">Remoto</SelectItem>
                    <SelectItem value="HIBRIDO">Hibrido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fecha_inicio_contrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Inicio Contrato *</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fecha_fin_contrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Fin Contrato *</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
