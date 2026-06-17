'use client';

import { UseFormReturn } from 'react-hook-form';
import { Empleado } from '@/types';
import { MovimientoFormValues, tiposMovimiento } from '../hooks/useEmpleadoDetalle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus } from 'lucide-react';

interface TabMovimientosProps {
  empleado: Empleado;
  formatDate: (date: string | null | undefined) => string;
  // dialog
  movimientoDialogOpen: boolean;
  setMovimientoDialogOpen: (open: boolean) => void;
  movimientoForm: UseFormReturn<MovimientoFormValues>;
  savingMovimiento: boolean;
  handleOpenMovimientoDialog: () => void;
  handleSaveMovimiento: (data: MovimientoFormValues) => Promise<void>;
}

export function TabMovimientos({
  empleado,
  formatDate,
  movimientoDialogOpen,
  setMovimientoDialogOpen,
  movimientoForm,
  savingMovimiento,
  handleOpenMovimientoDialog,
  handleSaveMovimiento,
}: TabMovimientosProps) {
  return (
    <>
      <TabsContent value="movimientos">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <CardTitle className="text-base sm:text-lg">Historial de Movimientos</CardTitle>
            <Button size="sm" onClick={handleOpenMovimientoDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Movimiento
            </Button>
          </CardHeader>
          <CardContent>
            {empleado.movimientos && empleado.movimientos.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Tipo</TableHead>
                        <TableHead className="min-w-[90px]">Fecha</TableHead>
                        <TableHead className="min-w-[120px] hidden sm:table-cell">Motivo</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Registrado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empleado.movimientos.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{mov.tipo_movimiento}</Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{formatDate(mov.fecha_movimiento)}</TableCell>
                          <TableCell className="text-sm hidden sm:table-cell">{mov.motivo || '-'}</TableCell>
                          <TableCell className="text-sm hidden md:table-cell">{mov.usuario?.nombre_completo || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">No hay movimientos registrados</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dialog registrar movimiento */}
      <Dialog open={movimientoDialogOpen} onOpenChange={setMovimientoDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar Movimiento</DialogTitle>
            <DialogDescription className="text-sm">
              Registre un movimiento laboral para el empleado
            </DialogDescription>
          </DialogHeader>
          <Form {...movimientoForm}>
            <form onSubmit={movimientoForm.handleSubmit(handleSaveMovimiento)} className="space-y-4">
              <FormField
                control={movimientoForm.control}
                name="tipo_movimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimiento *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposMovimiento.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            <div className="flex flex-col">
                              <span>{tipo.label}</span>
                              <span className="text-xs text-muted-foreground">{tipo.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={movimientoForm.control}
                name="fecha_movimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha del Movimiento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={movimientoForm.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Termino de contrato, Renuncia voluntaria..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={movimientoForm.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Observaciones adicionales..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Nota:</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Al registrar este movimiento, el estado del empleado se actualizara automaticamente segun el tipo de movimiento seleccionado.
                </p>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setMovimientoDialogOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingMovimiento} className="w-full sm:w-auto">
                  {savingMovimiento ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
