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
import type { Banco } from '@/types';

interface Props {
  form: UseFormReturn<EmpleadoFormValues>;
  bancos: Banco[];
}

export function EmpleadoBancarioTab({ form, bancos }: Props) {
  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">Datos Bancarios - Haberes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="banco_haberes_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione banco" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bancos.map((banco) => (
                      <SelectItem key={banco.id} value={banco.id.toString()}>{banco.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nro_cuenta_haberes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero de Cuenta</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={20} onChange={(e) => handleNumericInput(e, field.onChange)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cci_haberes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CCI</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={20} onChange={(e) => handleNumericInput(e, field.onChange)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">Datos Bancarios - CTS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="banco_cts_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco CTS</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Seleccione banco" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bancos.map((banco) => (
                      <SelectItem key={banco.id} value={banco.id.toString()}>{banco.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nro_cuenta_cts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero de Cuenta CTS</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={20} onChange={(e) => handleNumericInput(e, field.onChange)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cci_cts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CCI CTS</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={20} onChange={(e) => handleNumericInput(e, field.onChange)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </>
  );
}
