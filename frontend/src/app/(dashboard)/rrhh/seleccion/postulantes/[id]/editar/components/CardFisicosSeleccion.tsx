'use client';

import { UseFormReturn } from 'react-hook-form';
import { Procedencia } from '@/types';
import { EditarFormValues } from '../hooks/useEditarPostulante';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CardFisicosSeleccionProps {
  form: UseFormReturn<EditarFormValues>;
  procedencias: Procedencia[];
}

export function CardFisicosSeleccion({ form, procedencias }: CardFisicosSeleccionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Datos Fisicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="estatura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estatura (m)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="1.70" />
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
                    <Input {...field} type="number" step="0.1" placeholder="70.5" />
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
                  <FormLabel>Licencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos de Seleccion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="pretension_salarial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pretension Salarial (S/.)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="2500.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="procedencia_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {procedencias.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
