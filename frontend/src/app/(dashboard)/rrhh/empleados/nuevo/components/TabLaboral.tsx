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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { Area, Cargo, Sede } from '@/types';
import { EmpleadoFormValues, RegimenPensionario } from '../useEmpleadoNuevo';

interface TabLaboralProps {
  form: UseFormReturn<EmpleadoFormValues>;
  loading: boolean;
  areas: Area[];
  cargos: Cargo[];
  sedes: Sede[];
  regimenes: RegimenPensionario[];
  consultandoSbs: boolean;
  handleConsultarSbs: () => void;
}

export function TabLaboral({
  form,
  loading,
  areas,
  cargos,
  sedes,
  regimenes,
  consultandoSbs,
  handleConsultarSbs,
}: TabLaboralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos Laborales</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={form.control}
          name="area_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione area" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.nombre}
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
          name="cargo_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione cargo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id.toString()}>
                      {cargo.nombre}
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
          name="sede_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sede</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sede" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id.toString()}>
                      {sede.nombre}
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
          name="fecha_ingreso"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha Ingreso *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fecha_planilla"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha Planilla</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sueldo_base"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sueldo Base *</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo_pago"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Pago *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <FormLabel>Turno *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

        <FormField
          control={form.control}
          name="regimen_pensionario_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regimen Pensionario</FormLabel>
              <div className="flex gap-2">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccione regimen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {regimenes.map((regimen) => (
                      <SelectItem key={regimen.id} value={regimen.id.toString()}>
                        {regimen.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleConsultarSbs}
                  disabled={consultandoSbs || loading}
                  title="Consultar AFP en SBS"
                >
                  {consultandoSbs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
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
              <FormControl>
                <Input {...field} value={field.value || ''} maxLength={12} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-full flex gap-6 mt-4">
          <FormField
            control={form.control}
            name="asignacion_familiar"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Asignacion Familiar</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sctr"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">SCTR</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="es_mype"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Es MYPE</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
