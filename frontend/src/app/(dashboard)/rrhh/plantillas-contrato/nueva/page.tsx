'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { VariablesDisponibles } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Loader2, Upload, FileText, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAccessToken } from '@/lib/api';

interface VariableValidation {
  valid: string[];
  invalid: Array<{ variable: string; suggestion: string | null }>;
  hasErrors: boolean;
  summary: string;
}

const plantillaSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(200),
  descripcion: z.string().max(500).optional(),
  tipo_contrato: z.string().min(1, 'Seleccione un tipo de contrato'),
  es_predeterminada: z.boolean(),
});

type PlantillaForm = z.infer<typeof plantillaSchema>;

const TIPOS_CONTRATO = [
  { value: 'SUJETO_A_MODALIDAD', label: 'Sujeto a Modalidad' },
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'LOCACION', label: 'Locación de Servicios' },
  { value: 'OBRA_SERVICIO', label: 'Obra o Servicio' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
];

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
  const [extractingVariables, setExtractingVariables] = useState(false);
  const [variables, setVariables] = useState<VariablesDisponibles | null>(null);
  const [validation, setValidation] = useState<VariableValidation | null>(null);
  const [forceInvalid, setForceInvalid] = useState(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [previewUnreplaced, setPreviewUnreplaced] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSeen, setPreviewSeen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PlantillaForm>({
    resolver: zodResolver(plantillaSchema),
    defaultValues: {
      es_predeterminada: false,
    },
  });

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        const response = await api.get<VariablesDisponibles>('/plantillas-contrato/variables');
        setVariables(response);
      } catch (error) {
        console.error('Error fetching variables:', error);
      }
    };
    fetchVariables();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      toast.error('Solo se permiten archivos Word (.docx)');
      return;
    }

    setFile(selectedFile);
    setExtractedVariables([]);
    setValidation(null);
    setForceInvalid(false);
    setPreviewSeen(false);
    setPreviewText('');
    setPreviewUnreplaced([]);

    // Extraer variables del archivo
    setExtractingVariables(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/extract-variables`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al extraer variables');
      }

      const data = await response.json();
      setExtractedVariables(data.variables || []);
      if (data.validation) {
        setValidation(data.validation);
      }
    } catch (error) {
      console.error('Error extracting variables:', error);
      toast.error('Error al extraer variables del documento');
    } finally {
      setExtractingVariables(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setExtractedVariables([]);
    setValidation(null);
    setForceInvalid(false);
    setPreviewSeen(false);
    setPreviewText('');
    setPreviewUnreplaced([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/preview-file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Error al generar preview');

      const data = await response.json();
      setPreviewText(data.text || '');
      setPreviewUnreplaced(data.unreplacedVariables || []);
      setPreviewOpen(true);
      setPreviewSeen(true);
    } catch {
      toast.error('Error al generar preview del documento');
    } finally {
      setLoadingPreview(false);
    }
  };

  const onSubmit = async (data: PlantillaForm) => {
    if (!file) {
      toast.error('Debe seleccionar un archivo Word');
      return;
    }

    // Bloquear si hay variables inválidas y no se forzó
    if (validation?.hasErrors && !forceInvalid) {
      toast.error('Corrige las variables no reconocidas o marca la casilla para continuar de todas formas');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre', data.nombre);
      formData.append('descripcion', data.descripcion || '');
      formData.append('tipo_contrato', data.tipo_contrato);
      formData.append('es_predeterminada', data.es_predeterminada.toString());
      if (forceInvalid) {
        formData.append('force_invalid_variables', 'true');
      }

      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la plantilla');
      }

      toast.success('Plantilla creada correctamente');
      router.push('/rrhh/plantillas-contrato');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al crear la plantilla'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rrhh/plantillas-contrato">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Plantilla</h1>
          <p className="text-muted-foreground">Sube un archivo Word con variables</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Plantilla *</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Contrato Plazo Fijo - Vigilancia"
                      {...register('nombre')}
                    />
                    {errors.nombre && (
                      <p className="text-sm text-red-500">{errors.nombre.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_contrato">Tipo de Contrato *</Label>
                    <Controller
                      name="tipo_contrato"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CONTRATO.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.tipo_contrato && (
                      <p className="text-sm text-red-500">{errors.tipo_contrato.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Descripción breve de la plantilla..."
                    rows={2}
                    {...register('descripcion')}
                  />
                </div>

                <Controller
                  name="es_predeterminada"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label>Plantilla predeterminada para este tipo</Label>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Archivo Word</CardTitle>
                <CardDescription>
                  Sube un archivo Word (.docx) con variables en formato {'{{variable}}'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!file ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">
                      Haz clic para seleccionar un archivo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solo archivos Word (.docx)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {extractingVariables && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extrayendo variables del documento...
                      </div>
                    )}

                    {validation && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">
                          Variables detectadas ({extractedVariables.length}):
                        </p>

                        {/* Variables válidas */}
                        {validation.valid.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {validation.valid.map((v) => (
                              <span
                                key={v}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              >
                                {v}
                                <Check className="inline h-3 w-3 ml-1" />
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Variables inválidas con sugerencias */}
                        {validation.invalid.length > 0 && (
                          <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-950 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                              <AlertTriangle className="h-4 w-4" />
                              {validation.invalid.length} variable(s) no reconocida(s)
                            </div>
                            <div className="space-y-1.5">
                              {validation.invalid.map((item) => (
                                <div key={item.variable} className="text-xs">
                                  <span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-mono">
                                    {item.variable}
                                  </span>
                                  {item.suggestion && (
                                    <span className="text-red-600 dark:text-red-400 ml-2">
                                      → ¿Quisiste decir{' '}
                                      <code className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded">
                                        {item.suggestion}
                                      </code>
                                      ?
                                    </span>
                                  )}
                                  {!item.suggestion && (
                                    <span className="text-red-500 dark:text-red-400 ml-2">
                                      — No se encontró ninguna variable similar
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Corrige el documento Word y vuelve a subirlo, o marca la casilla de abajo para guardar de todas formas.
                            </p>
                            <label className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={forceInvalid}
                                onChange={(e) => setForceInvalid(e.target.checked)}
                                className="rounded border-red-300"
                              />
                              Entiendo que estas variables no se reemplazarán y quiero continuar
                            </label>
                          </div>
                        )}

                        {/* Leyenda */}
                        {!validation.hasErrors && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {validation.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral - Variables disponibles */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variables Disponibles</CardTitle>
                <CardDescription>
                  Usa estas variables en tu documento Word
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {variables ? (
                  <ScrollArea className="h-[500px]">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-muted-foreground">Empleado</h4>
                        <div className="space-y-1">
                          {variables.empleado.map((v) => (
                            <div key={v.key} className="text-xs">
                              <code className="bg-muted px-1 py-0.5 rounded">{v.key}</code>
                              <span className="text-muted-foreground ml-2">{v.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-muted-foreground">Contrato</h4>
                        <div className="space-y-1">
                          {variables.contrato.map((v) => (
                            <div key={v.key} className="text-xs">
                              <code className="bg-muted px-1 py-0.5 rounded">{v.key}</code>
                              <span className="text-muted-foreground ml-2">{v.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-muted-foreground">Empresa</h4>
                        <div className="space-y-1">
                          {variables.empresa.map((v) => (
                            <div key={v.key} className="text-xs">
                              <code className="bg-muted px-1 py-0.5 rounded">{v.key}</code>
                              <span className="text-muted-foreground ml-2">{v.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-muted-foreground">Sistema</h4>
                        <div className="space-y-1">
                          {variables.sistema.map((v) => (
                            <div key={v.key} className="text-xs">
                              <code className="bg-muted px-1 py-0.5 rounded">{v.key}</code>
                              <span className="text-muted-foreground ml-2">{v.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex flex-col gap-2">
              {file && !previewSeen && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handlePreview}
                  disabled={loadingPreview || (validation?.hasErrors && !forceInvalid)}
                >
                  {loadingPreview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando preview...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Preview (obligatorio)
                    </>
                  )}
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || !file || !previewSeen || (validation?.hasErrors && !forceInvalid)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Crear Plantilla'
                )}
              </Button>
              {file && !previewSeen && (
                <p className="text-xs text-muted-foreground text-center">
                  Debes ver el preview antes de poder guardar
                </p>
              )}
              <Button type="button" variant="outline" asChild className="w-full">
                <Link href="/rrhh/plantillas-contrato">Cancelar</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Dialog de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview del Contrato</DialogTitle>
            <DialogDescription>
              Así se verá el contrato con datos de ejemplo. Verifica que las variables se reemplazaron correctamente.
            </DialogDescription>
          </DialogHeader>

          {previewUnreplaced.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-950">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                <AlertTriangle className="h-4 w-4" />
                Variables sin reemplazar detectadas:
              </div>
              <div className="flex flex-wrap gap-1">
                {previewUnreplaced.map((v) => (
                  <span key={v} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-mono">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="h-[50vh] border rounded-lg p-4 bg-white dark:bg-gray-950">
            <div className="whitespace-pre-wrap text-sm leading-relaxed font-serif">
              {previewText.split(/(\{\{[^}]+\}\})/).map((part, i) =>
                part.match(/^\{\{[^}]+\}\}$/) ? (
                  <mark key={i} className="bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 px-1 rounded">
                    {part}
                  </mark>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>
              {previewUnreplaced.length > 0 ? 'Cerrar y corregir' : 'Listo, todo se ve bien'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
