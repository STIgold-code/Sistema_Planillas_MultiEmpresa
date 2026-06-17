'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmpleadoFormValues } from '../useEmpleadoEditar';
import { handleNumericInput } from '../useEmpleadoEditar';

interface Props {
  form: UseFormReturn<EmpleadoFormValues>;
}

export function EmpleadoAdicionalTab({ form }: Props) {
  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">Contacto Asignado por la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="celular_asignado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Celular Asignado</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={9} onChange={(e) => handleNumericInput(e, field.onChange)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email_asignado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Corporativo</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">Datos Fisicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="estatura"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estatura (m)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="1.70" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="peso"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="70" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoria_licencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria Licencia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="A-I">A-I</SelectItem>
                    <SelectItem value="A-IIa">A-IIa</SelectItem>
                    <SelectItem value="A-IIb">A-IIb</SelectItem>
                    <SelectItem value="A-IIIa">A-IIIa</SelectItem>
                    <SelectItem value="A-IIIb">A-IIIb</SelectItem>
                    <SelectItem value="A-IIIc">A-IIIc</SelectItem>
                    <SelectItem value="B-I">B-I</SelectItem>
                    <SelectItem value="B-IIa">B-IIa</SelectItem>
                    <SelectItem value="B-IIb">B-IIb</SelectItem>
                    <SelectItem value="B-IIc">B-IIc</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </>
  );
}
