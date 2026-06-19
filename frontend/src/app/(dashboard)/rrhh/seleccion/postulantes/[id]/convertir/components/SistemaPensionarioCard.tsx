'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { ConvertirFormValues, RegimenPensionario } from '../useConvertirPostulante';

interface Props {
  form: UseFormReturn<ConvertirFormValues>;
  regimenes: RegimenPensionario[];
  consultandoSbs: boolean;
  onConsultarSbs: () => void;
}

export function SistemaPensionarioCard({ form, regimenes, consultandoSbs, onConsultarSbs }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sistema Pensionario</CardTitle>
        <CardDescription>Configura el regimen de pension del empleado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="regimen_pensionario_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regimen Pensionario</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regimenes.map(reg => (
                        <SelectItem key={reg.id} value={reg.id.toString()}>
                          {reg.nombre} ({reg.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={onConsultarSbs} disabled={consultandoSbs} title="Consultar SBS">
                    {consultandoSbs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cuspp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CUSPP</FormLabel>
                <FormControl><Input {...field} placeholder="Codigo CUSPP" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-wrap gap-4 md:gap-6">
          <FormField
            control={form.control}
            name="asignacion_familiar"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Asignacion Familiar</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sctr"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">SCTR (Seguro Complementario)</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
