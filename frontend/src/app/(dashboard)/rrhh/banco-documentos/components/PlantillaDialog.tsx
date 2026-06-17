'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Loader2, FileText, Upload, X, Copy, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PlantillaDocumento, VariablesDisponibles, VariableInfo, PlantillaFormValues } from '../useBancoDocumentos';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedPlantilla: PlantillaDocumento | null;
  form: UseFormReturn<PlantillaFormValues>;
  onSubmit: (data: PlantillaFormValues) => void;
  saving: boolean;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  extractedVariables: string[];
  isExtracting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  tipoArchivo: string;
  variables: VariablesDisponibles | null;
  getAllVariableKeys: () => Set<string>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PlantillaDialog({
  open, onOpenChange, selectedPlantilla, form, onSubmit, saving,
  selectedFile, setSelectedFile, extractedVariables, isExtracting,
  fileInputRef, tipoArchivo, variables, getAllVariableKeys, onFileChange,
}: Props) {
  const availableKeys = getAllVariableKeys();
  const hasFile = selectedFile || selectedPlantilla?.archivo_base_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
          <DialogDescription>
            {selectedPlantilla
              ? 'Modifica los datos de la plantilla y sube un nuevo archivo si es necesario'
              : 'Crea una nueva plantilla de documento subiendo un archivo base'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codigo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DJ-DOM" className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INGRESO">Ingreso</SelectItem>
                        <SelectItem value="LABORAL">Laboral</SelectItem>
                        <SelectItem value="SALIDA">Salida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_archivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formato del Archivo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WORD">Microsoft Word (.docx)</SelectItem>
                        <SelectItem value="EXCEL">Microsoft Excel (.xlsx)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Plantilla *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: Declaracion Jurada de Domicilio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="orden"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden de Aparicion</FormLabel>
                    <FormControl><Input {...field} type="number" min={0} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion Opcional</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Breve descripcion de para que sirve este documento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-8 p-4 bg-muted/30 rounded-lg">
              <FormField
                control={form.control}
                name="requiere_firma"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">El empleado debe firmar este documento</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="es_obligatorio"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Documento obligatorio al ingreso</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
              <div className="space-y-6">
                <FormItem>
                  <FormLabel className="text-base font-semibold">Subir Archivo Base ({tipoArchivo}) *</FormLabel>
                  <FormControl>
                    <div>
                      {!hasFile ? (
                        <div
                          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/10"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                          <p className="text-sm font-medium mb-1">Haz clic para seleccionar un archivo</p>
                          <p className="text-xs text-muted-foreground">
                            Solo archivos {tipoArchivo === 'WORD' ? 'Word (.docx)' : 'Excel (.xlsx)'}
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={tipoArchivo === 'WORD' ? '.docx' : '.xlsx'}
                            className="hidden"
                            onChange={onFileChange}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 border-blue-100">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-blue-600" />
                              <div className="overflow-hidden">
                                <p className="font-medium text-sm truncate max-w-[200px]">
                                  {selectedFile ? selectedFile.name : selectedPlantilla?.archivo_base_url?.split('/').pop()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Archivo actual en servidor'}
                                </p>
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {hasFile && (
                        <div className="mt-2 text-right">
                          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Reemplazar archivo
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={tipoArchivo === 'WORD' ? '.docx' : '.xlsx'}
                            className="hidden"
                            onChange={onFileChange}
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Instrucciones
                  </h4>
                  <ul className="text-xs text-amber-700 list-disc pl-4 space-y-2">
                    <li>Prepare su documento en {tipoArchivo === 'WORD' ? 'Word' : 'Excel'}.</li>
                    <li>Copie las variables del panel derecho (ej: <code className="bg-amber-100 px-1 rounded">{'{{nombres}}'}</code>) y peguelas en su documento.</li>
                    <li>El sistema reemplazara estas etiquetas con los datos reales de cada empleado.</li>
                  </ul>
                </div>

                {(selectedFile || (selectedPlantilla?.variables && selectedPlantilla.variables.length > 0)) && (
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <h4 className="text-sm font-semibold mb-3 flex items-center justify-between">
                      <span>Variables Detectadas</span>
                      {isExtracting && <Loader2 className="h-4 w-4 animate-spin" />}
                    </h4>
                    {!isExtracting && (
                      <div className="flex flex-wrap gap-2">
                        {(extractedVariables.length > 0 ? extractedVariables : (selectedPlantilla?.variables || [])).map((v) => {
                          const exists = availableKeys.has(v);
                          return (
                            <Badge
                              key={v}
                              variant={exists ? 'secondary' : 'destructive'}
                              className={exists ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}
                            >
                              {v}
                              {!exists && <span className="ml-1 text-[10px]">(?)</span>}
                            </Badge>
                          );
                        })}
                        {extractedVariables.length === 0 && (!selectedPlantilla?.variables || selectedPlantilla.variables.length === 0) && (
                          <p className="text-xs text-muted-foreground italic">No se encontraron variables en el documento.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <FormLabel className="text-base font-semibold mb-2 block">Variables Disponibles</FormLabel>
                <div className="border rounded-md p-2 h-[400px] overflow-y-auto bg-slate-50">
                  <Tabs defaultValue="empleado" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="empleado" className="text-xs">Personal</TabsTrigger>
                      <TabsTrigger value="laboral" className="text-xs">Laboral</TabsTrigger>
                      <TabsTrigger value="sistema" className="text-xs">Sistema</TabsTrigger>
                    </TabsList>
                    {variables && (
                      <>
                        <TabsContent value="empleado" className="space-y-1 mt-2">
                          <VariableList items={variables.empleado} />
                        </TabsContent>
                        <TabsContent value="laboral" className="space-y-1 mt-2">
                          <VariableList items={[...variables.laboral, ...variables.bancario]} />
                        </TabsContent>
                        <TabsContent value="sistema" className="space-y-1 mt-2">
                          <VariableList items={[...variables.empresa, ...variables.sistema]} />
                        </TabsContent>
                      </>
                    )}
                  </Tabs>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedPlantilla ? 'Guardar Cambios' : 'Crear Plantilla'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function VariableList({ items }: { items: VariableInfo[] }) {
  return (
    <>
      {items.map((v) => (
        <div
          key={v.key}
          className="w-full text-left text-xs p-2 rounded bg-white border mb-1 flex items-center justify-between group hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => {
            navigator.clipboard.writeText(`{{${v.key}}}`);
            toast.success(`Variable {{${v.key}}} copiada`);
          }}
        >
          <div>
            <span className="font-mono font-bold text-blue-700">{'{' + '{' + v.key + '}' + '}'}</span>
            <p className="text-[10px] text-muted-foreground">{v.descripcion}</p>
          </div>
          <Copy className="h-3 w-3 text-muted-foreground group-hover:text-blue-600" />
        </div>
      ))}
    </>
  );
}
