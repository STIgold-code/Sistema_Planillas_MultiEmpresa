'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ConvertirFormValues } from '../useConvertirPostulante';

const BONOS = [
  { name: 'bono_productividad' as const, label: 'Bono Productividad (S/.)' },
  { name: 'bono_desempeno' as const, label: 'Bono Desempeno (S/.)' },
  { name: 'bono_movilidad' as const, label: 'Bono Movilidad (S/.)' },
  { name: 'bono_refrigerio' as const, label: 'Bono Refrigerio (S/.)' },
  { name: 'bono_armado' as const, label: 'Bono Armado (S/.)' },
  { name: 'asignacion_cliente' as const, label: 'Asignacion Cliente (S/.)' },
];

interface Props {
  form: UseFormReturn<ConvertirFormValues>;
}

export function BonosCard({ form }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bonos y Asignaciones</CardTitle>
        <CardDescription>Configura los bonos mensuales del empleado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BONOS.map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
