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
import { Loader2, Paperclip } from 'lucide-react';
import { useMemo } from 'react';
import { EmpleadoSelector } from '@/components/empleados/EmpleadoSelector';
import {
  EXTENSIONES_ACEPTADAS,
  Prestamo,
  PrestamoFormValues,
  TIPO_DESCRIPCION,
  TIPO_ETIQUETA,
  TipoPrestamo,
} from '../usePrestamos';
import {
  cuotaDesdeNumeroCuotas,
  numeroCuotasDesdeCuota,
  proyectarCronograma,
} from '../dominio/cronograma-prestamo';
import { AvisoEndeudamiento } from './AvisoEndeudamiento';
import { CronogramaPreview } from './CronogramaPreview';

interface Props {
  open: boolean;
  onOpenChange: (valor: boolean) => void;
  seleccionado: Prestamo | null;
  nombreEmpleado: string;
  form: UseFormReturn<PrestamoFormValues>;
  onSubmit: (valores: PrestamoFormValues) => void;
  guardando: boolean;
  sueldoEmpleado: number | null;
  prestamosActivosEmpleado: Prestamo[];
  cargandoActivosEmpleado: boolean;
  onSeleccionarEmpleado: (empleadoId: number, sueldoBase: unknown) => void;
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
  sueldoEmpleado,
  prestamosActivosEmpleado,
  cargandoActivosEmpleado,
  onSeleccionarEmpleado,
}: Props) {
  const esEdicion = seleccionado !== null;
  const tipoSeleccionado = form.watch('tipo');
  const empleadoId = form.watch('empleado_id');
  const archivosSeleccionados = form.watch('archivos') ?? [];
  const cuotaMensual = Number(form.watch('cuota_mensual')) || 0;
  const montoTotalTexto = form.watch('monto_total') ?? '';
  const fechaOtorgado = form.watch('fecha_otorgado');

  const montoTotal = montoTotalTexto ? Number(montoTotalTexto) : null;
  const montoValido =
    montoTotal !== null && Number.isFinite(montoTotal) && montoTotal > 0
      ? montoTotal
      : null;

  const proyeccion = useMemo(
    () =>
      proyectarCronograma({
        montoTotal: montoValido,
        cuotaMensual,
        tipo: tipoSeleccionado,
        fechaOtorgado,
      }),
    [montoValido, cuotaMensual, tipoSeleccionado, fechaOtorgado],
  );

  /** Al fijar el número de cuotas se deriva la cuota; sigue siendo editable. */
  const alCambiarNumeroCuotas = (texto: string) => {
    form.setValue('numero_cuotas', texto);
    const cuotas = Number(texto);
    if (montoValido === null || !Number.isInteger(cuotas) || cuotas <= 0) return;
    form.setValue('cuota_mensual', cuotaDesdeNumeroCuotas(montoValido, cuotas), {
      shouldValidate: true,
    });
  };

  /**
   * Editar la cuota a mano recalcula cuántas cuotas salen, no al revés. El
   * valor del campo lo sigue guardando react-hook-form: acá solo se sincroniza
   * el número de cuotas para que los dos campos nunca se contradigan.
   */
  const sincronizarNumeroCuotas = (texto: string) => {
    const cuota = Number(texto);
    if (montoValido === null || !Number.isFinite(cuota) || cuota <= 0) return;
    form.setValue(
      'numero_cuotas',
      String(numeroCuotasDesdeCuota(montoValido, cuota)),
    );
  };

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
                          onSeleccionarEmpleado(empleado.id, empleado.sueldo_base)
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

              {!esEdicion && (
                <FormField
                  control={form.control}
                  name="numero_cuotas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de cuotas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Ej. 6"
                          value={field.value ?? ''}
                          onChange={(evento) =>
                            alCambiarNumeroCuotas(evento.target.value)
                          }
                          disabled={montoValido === null}
                        />
                      </FormControl>
                      <FormDescription>
                        {montoValido === null
                          ? 'Indica primero el monto total para repartirlo en cuotas.'
                          : 'Reparte el monto y calcula la cuota mensual.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="cuota_mensual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuota mensual *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(evento) => {
                          field.onChange(evento);
                          if (!esEdicion) {
                            sincronizarNumeroCuotas(evento.target.value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      La última cuota se ajusta sola al saldo pendiente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!esEdicion && (
              <>
                <AvisoEndeudamiento
                  sueldoBase={sueldoEmpleado}
                  cuotaNueva={cuotaMensual}
                  prestamosActivos={prestamosActivosEmpleado}
                  cargandoActivos={cargandoActivosEmpleado}
                />
                <CronogramaPreview
                  proyeccion={proyeccion}
                  fechaOtorgado={fechaOtorgado}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={
                        esEdicion
                          ? 'Si cambias la cuota, explica el motivo del nuevo acuerdo.'
                          : 'Motivo del préstamo, acuerdos con el trabajador, etc.'
                      }
                      {...field}
                    />
                  </FormControl>
                  {esEdicion && (
                    <FormDescription>
                      Cambiar la cuota es renegociar la deuda: el motivo queda
                      registrado en el préstamo.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!esEdicion && (
              <FormField
                control={form.control}
                name="archivos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento de respaldo *</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        multiple
                        accept={EXTENSIONES_ACEPTADAS}
                        onChange={(evento) =>
                          field.onChange(
                            Array.from(evento.target.files ?? []),
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Adjunta el convenio de descuento firmado por el trabajador.
                      Es obligatorio: descontar de la remuneración requiere su
                      autorización escrita. PDF, Word, Excel o imagen (máx. 10 MB
                      por archivo).
                    </FormDescription>
                    {archivosSeleccionados.length > 0 && (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {archivosSeleccionados.map((archivo) => (
                          <li
                            key={archivo.name}
                            className="flex items-center gap-2"
                          >
                            <Paperclip className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{archivo.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
