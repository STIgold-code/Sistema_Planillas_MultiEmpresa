'use client';

import { UseFormReturn } from 'react-hook-form';
import { TipoDocumentoEmpleado } from '@/types';
import { DocumentoFormValues } from '../hooks/useEmpleadoDetalle';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, Upload } from 'lucide-react';

interface DocUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiposDocumento: TipoDocumentoEmpleado[];
  documentoForm: UseFormReturn<DocumentoFormValues>;
  savingDocumento: boolean;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleSaveDocumento: (data: DocumentoFormValues) => Promise<void>;
}

export function DocUploadDialog({
  open,
  onOpenChange,
  tiposDocumento,
  documentoForm,
  savingDocumento,
  selectedFile,
  setSelectedFile,
  handleSaveDocumento,
}: DocUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[450px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header fijo */}
        <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b shrink-0">
          <DialogTitle className="text-base sm:text-lg">Subir Documento</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Seleccione el tipo de documento y el archivo a subir
          </DialogDescription>
        </DialogHeader>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          <Form {...documentoForm}>
            <form id="documento-form" onSubmit={documentoForm.handleSubmit(handleSaveDocumento)} className="space-y-4">
              <FormField
                control={documentoForm.control}
                name="tipo_documento_empleado_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Tipo de Documento <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {tiposDocumento.map((tipo) => (
                          <SelectItem key={tipo.id} value={String(tipo.id)}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {tipo.codigo}
                              </span>
                              <span className="text-sm truncate">{tipo.nombre}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selector de archivo */}
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">
                  Archivo <span className="text-destructive">*</span>
                </FormLabel>
                <div className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50 hover:bg-muted/30">
                  {selectedFile ? (
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight break-all line-clamp-2" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedFile.size < 1024 * 1024
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="shrink-0 h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block text-center py-2">
                      <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Clic para seleccionar</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG, PNG (max 5MB)</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('El archivo no debe superar 5MB');
                              e.target.value = '';
                              return;
                            }
                            setSelectedFile(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <FormField
                control={documentoForm.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Descripcion</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descripcion opcional del documento"
                        rows={2}
                        className="text-sm resize-none min-h-[60px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <FormField
                  control={documentoForm.control}
                  name="fecha_emision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Fecha de emision</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10 text-sm [&::-webkit-calendar-picker-indicator]:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={documentoForm.control}
                  name="fecha_vencimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Fecha de vencimiento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10 text-sm [&::-webkit-calendar-picker-indicator]:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        {/* Footer fijo */}
        <DialogFooter className="px-4 py-3 sm:px-6 sm:py-4 border-t shrink-0 bg-muted/30">
          <div className="flex flex-col-reverse min-[400px]:flex-row gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="documento-form"
              disabled={savingDocumento || !selectedFile}
              className="flex-1 h-10 text-sm"
            >
              {savingDocumento ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir documento
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
