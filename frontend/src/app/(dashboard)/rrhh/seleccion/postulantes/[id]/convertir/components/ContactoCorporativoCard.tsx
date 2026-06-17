'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ConvertirFormValues } from '../useConvertirPostulante';

interface Props {
  form: UseFormReturn<ConvertirFormValues>;
}

export function ContactoCorporativoCard({ form }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacto Corporativo</CardTitle>
        <CardDescription>Datos de contacto asignados por la empresa</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="celular_asignado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Celular Asignado</FormLabel>
                <FormControl><Input {...field} placeholder="999999999" /></FormControl>
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
                <FormControl><Input {...field} type="email" placeholder="empleado@empresa.com" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
