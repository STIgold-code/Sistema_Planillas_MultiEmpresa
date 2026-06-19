'use client';

import { UseFormReturn } from 'react-hook-form';
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
import { Banco } from '@/types';
import { EmpleadoFormValues, handleNumericInput } from '../useEmpleadoNuevo';

interface TabBancarioProps {
  form: UseFormReturn<EmpleadoFormValues>;
  bancos: Banco[];
}

export function TabBancario({ form, bancos }: TabBancarioProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Datos Bancarios - Haberes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="banco_haberes_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione banco" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bancos.map((banco) => (
                      <SelectItem key={banco.id} value={banco.id.toString()}>
                        {banco.nombre}
                      </SelectItem>
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
                  <Input
                    {...field}
                    maxLength={20}
                    onChange={(e) => handleNumericInput(e, field.onChange)}
                    placeholder="19112345678901"
                  />
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
                  <Input
                    {...field}
                    maxLength={20}
                    onChange={(e) => handleNumericInput(e, field.onChange)}
                    placeholder="00219011234567890123"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Datos Bancarios - CTS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="banco_cts_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco CTS</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione banco" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bancos.map((banco) => (
                      <SelectItem key={banco.id} value={banco.id.toString()}>
                        {banco.nombre}
                      </SelectItem>
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
                  <Input
                    {...field}
                    maxLength={20}
                    onChange={(e) => handleNumericInput(e, field.onChange)}
                    placeholder="19112345678901"
                  />
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
                  <Input
                    {...field}
                    maxLength={20}
                    onChange={(e) => handleNumericInput(e, field.onChange)}
                    placeholder="00219011234567890123"
                  />
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
