'use client';

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2 } from 'lucide-react';
import { EmpleadoSelector } from '@/components/empleados/EmpleadoSelector';
import {
  Prestamo,
  PrestamoFormValues,
  TIPO_DESCRIPCION,
  TIPO_ETIQUETA,
  TipoPrestamo,
} from '../usePrestamos';

interface Props {
  open: boolean;
  onOpenChange: (valor: boolean) => void;
  seleccionado: Prestamo | null;
  nombreEmpleado: string;
  form: UseFormReturn<PrestamoFormValues>;
  onSubmit: (valores: PrestamoFormValues) => void;
  guardando: boolean;
}

const TIPOS: TipoPrestamo[] = [
  'PRESTAMO',
  'ADELANTO_SUELDO',
  'ADELANTO_GRATIFICACION',
];

export function PrestamoDialog({
  open,
  onOpenChange,
  seleccionado,
  nombreEmpleado,
  form,
  onSubmit,
  guardando,
}: Props) {
  const esEdicion = seleccionado !== null;
  const tipoSeleccionado = form.watch('tipo');
  const empleadoId = form.watch('empleado_id');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? 'Editar préstamo' : 'Nuevo préstamo o adelanto'}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? 'Puedes ajustar la cuota mensual y las observaciones. El trabajador, el tipo y el monto total no se modifican.'
              : 'El descuento se aplica automáticamente en cada cálculo de planilla y el saldo se amortiza al aprobarla.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 py-2"
          >
            <FormField
              control={form.control}
              name="empleado_id"
              render={() => (
                <FormItem>
                  <FormLabel>Trabajador *</FormLabel>
                  <FormControl>
                    {esEdicion ? (
                      <Input value={nombreEmpleado} disabled readOnly />
                    ) : (
                      <EmpleadoSelector
                        selectedId={empleadoId || null}
                        onSelect={(empleado) =>
                          form.setValue('empleado_id', empleado.id, {
                            shouldValidate: true,
                          })
                        }
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={esEdicion}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {TIPO_ETIQUETA[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {TIPO_DESCRIPCION[tipoSeleccionado]}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha_otorgado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de otorgamiento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={esEdicion} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monto_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto total</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Opcional"
                        {...field}
                        disabled={esEdicion}
                      />
                    </FormControl>
                    <FormDescription>
                      Déjalo vacío para un descuento recurrente sin monto
                      definido: se descuenta cada mes hasta que lo canceles.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cuota_mensual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuota mensual *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      La última cuota se ajusta sola al saldo pendiente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Motivo del préstamo, acuerdos con el trabajador, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {esEdicion ? 'Guardar cambios' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
