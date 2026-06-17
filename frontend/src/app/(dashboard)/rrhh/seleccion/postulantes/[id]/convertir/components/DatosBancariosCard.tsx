'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConvertirFormValues, Banco } from '../useConvertirPostulante';

interface CuentaProps {
  form: UseFormReturn<ConvertirFormValues>;
  bancos: Banco[];
  title: string;
  bancoField: 'banco_haberes_id' | 'banco_cts_id';
  cuentaField: 'nro_cuenta_haberes' | 'nro_cuenta_cts';
  cciField: 'cci_haberes' | 'cci_cts';
}

function CuentaBancaria({ form, bancos, title, bancoField, cuentaField, cciField }: CuentaProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium text-sm">{title}</h4>
      <FormField
        control={form.control}
        name={bancoField}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Banco</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Seleccione banco" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {bancos.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={cuentaField}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nro. Cuenta</FormLabel>
            <FormControl><Input {...field} placeholder="Numero de cuenta" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={cciField}
        render={({ field }) => (
          <FormItem>
            <FormLabel>CCI</FormLabel>
            <FormControl><Input {...field} placeholder="Codigo Interbancario" maxLength={20} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface Props {
  form: UseFormReturn<ConvertirFormValues>;
  bancos: Banco[];
}

export function DatosBancariosCard({ form, bancos }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos Bancarios</CardTitle>
        <CardDescription>Cuentas para deposito de haberes y CTS</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <CuentaBancaria
            form={form}
            bancos={bancos}
            title="Cuenta de Haberes"
            bancoField="banco_haberes_id"
            cuentaField="nro_cuenta_haberes"
            cciField="cci_haberes"
          />
          <CuentaBancaria
            form={form}
            bancos={bancos}
            title="Cuenta CTS"
            bancoField="banco_cts_id"
            cuentaField="nro_cuenta_cts"
            cciField="cci_cts"
          />
        </div>
      </CardContent>
    </Card>
  );
}
