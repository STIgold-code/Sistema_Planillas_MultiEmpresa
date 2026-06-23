'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PlantillaContrato, VariablesDisponibles } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Loader2, Upload, FileText, Check, X, Info, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAccessToken } from '@/lib/api';

const plantillaSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(200),
  descripcion: z.string().max(500).optional(),
  tipo_contrato: z.string().min(1, 'Seleccione un tipo de contrato'),
  activo: z.boolean(),
  es_predeterminada: z.boolean(),
});

type PlantillaForm = z.infer<typeof plantillaSchema>;

interface VariableValidation {
  valid: string[];
  invalid: Array<{ variable: string; suggestion: string | null }>;
  hasErrors: boolean;
  summary: string;
}

const TIPOS_CONTRATO = [
  { value: 'SUJETO_A_MODALIDAD', label: 'Sujeto a Modalidad' },
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'LOCACION', label: 'Locación de Servicios' },
  { value: 'OBRA_SERVICIO', label: 'Obra o Servicio' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
];

export default function EditarPlantillaPage() {
  const router = useRouter();
  const params = useParams();
  const plantillaId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [plantilla, setPlantilla] = useState<PlantillaContrato | null>(null);
  const [variables, setVariables] = useState<VariablesDisponibles | null>(null);

  // Estado para archivo nuevo
  const [newFile, setNewFile] = useState<File | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
  const [extractingVariables, setExtractingVariables] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [validation, setValidation] = useState<VariableValidation | null>(null);
  const [forceInvalid, setForceInvalid] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PlantillaForm>({
    resolver: zodResolver(plantillaSchema),
    defaultValues: {
      activo: true,
      es_predeterminada: false,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [plantillaRes, variablesRes] = await Promise.all([
          api.get<PlantillaContrato>(`/plantillas-contrato/${plantillaId}`),
          api.get<VariablesDisponibles>('/plantillas-contrato/variables'),
        ]);

        setPlantilla(plantillaRes);
        setExtractedVariables((plantillaRes.variables as string[]) || []);

        reset({
          nombre: plantillaRes.nombre,
          descripcion: plantillaRes.descripcion || '',
          tipo_contrato: plantillaRes.tipo_contrato,
          activo: plantillaRes.activo,
          es_predeterminada: plantillaRes.es_predeterminada,
        });

        setVariables(variablesRes);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'Error al cargar la plantilla'));
        router.push('/rrhh/plantillas-contrato');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [plantillaId, reset, router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      toast.error('Solo se permiten archivos Word (.docx)');
      return;
    }

    setNewFile(selectedFile);
    setValidation(null);
    setForceInvalid(false);

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

  const removeNewFile = () => {
    setNewFile(null);
    setValidation(null);
    setForceInvalid(false);
    // Restaurar variables originales
    setExtractedVariables((plantilla?.variables as string[]) || []);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadNewFile = async () => {
    if (!newFile) return;

    if (validation?.hasErrors && !forceInvalid) {
      toast.error('Corrige las variables no reconocidas o marca la casilla para continuar');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', newFile);
      if (forceInvalid) {
        formData.append('force_invalid_variables', 'true');
      }

      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/${plantillaId}/upload`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir archivo');
      }

      const updatedPlantilla = await response.json();
      setPlantilla(updatedPlantilla);
      setNewFile(null);
      setValidation(null);
      setForceInvalid(false);
      toast.success('Archivo actualizado correctamente');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al subir archivo'));
    } finally {
      setUploadingFile(false);
    }
  };

  const onSubmit = async (data: PlantillaForm) => {
    setLoading(true);
    try {
      await api.patch(`/plantillas-contrato/${plantillaId}`, data);
      toast.success('Plantilla actualizada correctamente');
      router.push('/rrhh/plantillas-contrato');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar la plantilla'));
    } finally {
      setLoading(false);
    }
  };

  // Verificar si una variable extraída está en las disponibles
  const isKnownVariable = (variable: string): boolean => {
    if (!variables) return false;
    const allKnownVars = [
      ...variables.empleado.map(v => v.key),
      ...variables.contrato.map(v => v.key),
      ...variables.empresa.map(v => v.key),
      ...variables.sistema.map(v => v.key),
    ];
    return allKnownVars.includes(variable);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rrhh/plantillas-contrato">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Plantilla</h1>
          <p className="text-muted-foreground">Modifica el modelo de contrato</p>
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

                <div className="flex items-center gap-6">
                  <Controller
                    name="activo"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label>Activa</Label>
                      </div>
                    )}
                  />

                  <Controller
                    name="es_predeterminada"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label>Plantilla predeterminada</Label>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Archivo Word</CardTitle>
                <CardDescription>
                  Archivo actual o nuevo archivo para reemplazar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Archivo actual */}
                {plantilla?.archivo_base_url && !newFile && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Archivo actual</p>
                        <p className="text-xs text-muted-foreground">
                          {plantilla.archivo_base_url.split('/').pop()}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reemplazar
                    </Button>
                  </div>
                )}

                {/* Nuevo archivo seleccionado */}
                {newFile && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Nuevo archivo</p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {newFile.name} ({(newFile.size / 1024).toFixed(1)} KB)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeNewFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUploadNewFile}
                          disabled={uploadingFile || (validation?.hasErrors && !forceInvalid)}
                        >
                          {uploadingFile ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Subir
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Área para subir si no hay archivo */}
                {!plantilla?.archivo_base_url && !newFile && (
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
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {extractingVariables && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extrayendo variables del documento...
                  </div>
                )}

                {/* Variables detectadas con validación */}
                {validation && newFile && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      Variables en el documento ({extractedVariables.length}):
                    </p>

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
                              {item.suggestion ? (
                                <span className="text-red-600 dark:text-red-400 ml-2">
                                  → ¿Quisiste decir{' '}
                                  <code className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded">
                                    {item.suggestion}
                                  </code>
                                  ?
                                </span>
                              ) : (
                                <span className="text-red-500 dark:text-red-400 ml-2">
                                  — No se encontró ninguna variable similar
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Corrige el documento Word y vuelve a subirlo, o marca la casilla de abajo para subir de todas formas.
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

                    {!validation.hasErrors && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {validation.summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Variables originales cuando no hay archivo nuevo */}
                {extractedVariables.length > 0 && !newFile && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Variables en el documento ({extractedVariables.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {extractedVariables.map((v) => (
                        <span
                          key={v}
                          className={`text-xs px-2 py-1 rounded ${
                            isKnownVariable(v)
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {v}
                          {isKnownVariable(v) ? (
                            <Check className="inline h-3 w-3 ml-1" />
                          ) : (
                            <Info className="inline h-3 w-3 ml-1" />
                          )}
                        </span>
                      ))}
                    </div>
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
                  Referencia de variables para el documento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {variables ? (
                  <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-muted-foreground">Empleado</h4>
                        <div className="space-y-1">
                          {variables.empleado.map((v) => (
                            <div key={v.key} className="text-xs">
                              <code className="bg-muted px-1 py-0.5 rounded">{v.key}</code>
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
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              <Button type="button" variant="outline" asChild className="w-full">
                <Link href="/rrhh/plantillas-contrato">Cancelar</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
