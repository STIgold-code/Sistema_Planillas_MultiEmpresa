'use client';

import { UseFormReturn } from 'react-hook-form';
import { Empleado } from '@/types';
import { FamiliarFormValues } from '../hooks/useEmpleadoDetalle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface TabFamiliaresProps {
  empleado: Empleado;
  formatDate: (date: string | null | undefined) => string;
  // dialog
  familiarDialogOpen: boolean;
  setFamiliarDialogOpen: (open: boolean) => void;
  familiarForm: UseFormReturn<FamiliarFormValues>;
  savingFamiliar: boolean;
  deletingFamiliarId: number | null;
  handleOpenFamiliarDialog: () => void;
  handleSaveFamiliar: (data: FamiliarFormValues) => Promise<void>;
  handleDeleteFamiliar: (id: number) => Promise<void>;
}

export function TabFamiliares({
  empleado,
  formatDate,
  familiarDialogOpen,
  setFamiliarDialogOpen,
  familiarForm,
  savingFamiliar,
  deletingFamiliarId,
  handleOpenFamiliarDialog,
  handleSaveFamiliar,
  handleDeleteFamiliar,
}: TabFamiliaresProps) {
  return (
    <>
      <TabsContent value="familiares">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <CardTitle className="text-base sm:text-lg">Familiares</CardTitle>
            <Button size="sm" onClick={handleOpenFamiliarDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Familiar
            </Button>
          </CardHeader>
          <CardContent>
            {empleado.familiares && empleado.familiares.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Parentesco</TableHead>
                        <TableHead className="min-w-[150px]">Nombres</TableHead>
                        <TableHead className="min-w-[100px]">Documento</TableHead>
                        <TableHead className="min-w-[100px] hidden sm:table-cell">Fecha Nac.</TableHead>
                        <TableHead className="min-w-[80px] hidden md:table-cell">Dependiente</TableHead>
                        <TableHead className="w-[60px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empleado.familiares.map((familiar) => (
                        <TableRow key={familiar.id}>
                          <TableCell className="text-sm">{familiar.parentesco}</TableCell>
                          <TableCell className="text-sm">{familiar.nombres_apellidos}</TableCell>
                          <TableCell className="font-mono text-xs">{familiar.numero_documento || '-'}</TableCell>
                          <TableCell className="text-sm hidden sm:table-cell">{formatDate(familiar.fecha_nacimiento)}</TableCell>
                          <TableCell className="text-sm hidden md:table-cell">{familiar.es_dependiente ? 'Si' : 'No'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFamiliar(familiar.id)}
                              disabled={deletingFamiliarId === familiar.id}
                            >
                              {deletingFamiliarId === familiar.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">No hay familiares registrados</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dialog agregar familiar */}
      <Dialog open={familiarDialogOpen} onOpenChange={setFamiliarDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Agregar Familiar</DialogTitle>
            <DialogDescription className="text-sm">
              Complete los datos del familiar del empleado
            </DialogDescription>
          </DialogHeader>
          <Form {...familiarForm}>
            <form onSubmit={familiarForm.handleSubmit(handleSaveFamiliar)} className="space-y-4">
              <FormField
                control={familiarForm.control}
                name="parentesco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parentesco *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione parentesco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONYUGE">Conyuge</SelectItem>
                        <SelectItem value="HIJO/A">Hijo/a</SelectItem>
                        <SelectItem value="PADRE">Padre</SelectItem>
                        <SelectItem value="MADRE">Madre</SelectItem>
                        <SelectItem value="HERMANO/A">Hermano/a</SelectItem>
                        <SelectItem value="ABUELO/A">Abuelo/a</SelectItem>
                        <SelectItem value="OTRO">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={familiarForm.control}
                name="nombres_apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres y Apellidos *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Juan Perez Garcia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={familiarForm.control}
                  name="tipo_documento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DNI">DNI</SelectItem>
                          <SelectItem value="CE">CE</SelectItem>
                          <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={familiarForm.control}
                  name="numero_documento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Documento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345678" maxLength={12} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={familiarForm.control}
                  name="fecha_nacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={familiarForm.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="987654321" maxLength={9} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={familiarForm.control}
                name="es_dependiente"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0 text-sm">Es dependiente (para asignacion familiar)</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setFamiliarDialogOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingFamiliar} className="w-full sm:w-auto">
                  {savingFamiliar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
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
