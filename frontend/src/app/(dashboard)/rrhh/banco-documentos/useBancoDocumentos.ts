'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface VariableInfo {
  key: string;
  descripcion: string;
}

export interface VariablesDisponibles {
  empleado: VariableInfo[];
  laboral: VariableInfo[];
  bancario: VariableInfo[];
  empresa: VariableInfo[];
  sistema: VariableInfo[];
}

export interface PlantillaDocumento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: 'INGRESO' | 'LABORAL' | 'SALIDA';
  tipo_archivo: 'WORD' | 'EXCEL';
  archivo_base_url: string | null;
  variables: string[] | null;
  requiere_firma: boolean;
  es_obligatorio: boolean;
  orden: number;
  activo: boolean;
  _count?: { documentos_generados: number };
}

export const categoriaLabels: Record<string, string> = {
  INGRESO: 'Ingreso',
  LABORAL: 'Laboral',
  SALIDA: 'Salida',
};

export const categoriaColors: Record<string, string> = {
  INGRESO: 'bg-green-100 text-green-800',
  LABORAL: 'bg-blue-100 text-blue-800',
  SALIDA: 'bg-orange-100 text-orange-800',
};

export const plantillaSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20),
  nombre: z.string().min(1, 'Requerido').max(200),
  descripcion: z.string().max(500).optional(),
  categoria: z.enum(['INGRESO', 'LABORAL', 'SALIDA']),
  tipo_archivo: z.enum(['WORD', 'EXCEL']).default('WORD'),
  requiere_firma: z.boolean().default(true),
  es_obligatorio: z.boolean().default(false),
  orden: z.coerce.number().int().min(0).default(0),
});

export type PlantillaFormValues = z.infer<typeof plantillaSchema>;

export function useBancoDocumentos() {
  const [plantillas, setPlantillas] = useState<PlantillaDocumento[]>([]);
  const [variables, setVariables] = useState<VariablesDisponibles | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedPlantilla, setSelectedPlantilla] = useState<PlantillaDocumento | null>(null);
  const [filterCategoria, setFilterCategoria] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PlantillaFormValues>({
    resolver: zodResolver(plantillaSchema) as any,
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'LABORAL',
      tipo_archivo: 'WORD',
      requiere_firma: true,
      es_obligatorio: false,
      orden: 0,
    },
  });

  const tipoArchivo = form.watch('tipo_archivo');

  const fetchPlantillas = async () => {
    try {
      const response = await api.get<PlantillaDocumento[]>(
        `/banco-documentos/plantillas?includeInactive=${showInactive}`
      );
      setPlantillas(response);
    } catch (error) {
      console.error('Error fetching plantillas:', error);
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const fetchVariables = async () => {
    try {
      const response = await api.get<VariablesDisponibles>('/banco-documentos/plantillas/variables');
      setVariables(response);
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  useEffect(() => {
    fetchPlantillas();
    fetchVariables();
  }, [showInactive]);

  const openCreateDialog = () => {
    setSelectedPlantilla(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    form.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'LABORAL',
      tipo_archivo: 'WORD',
      requiere_firma: true,
      es_obligatorio: false,
      orden: 0,
    });
    setExtractedVariables([]);
    setDialogOpen(true);
  };

  const openEditDialog = (plantilla: PlantillaDocumento) => {
    setSelectedPlantilla(plantilla);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    form.reset({
      codigo: plantilla.codigo,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      categoria: plantilla.categoria,
      tipo_archivo: plantilla.tipo_archivo || 'WORD',
      requiere_firma: plantilla.requiere_firma,
      es_obligatorio: plantilla.es_obligatorio,
      orden: plantilla.orden,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (plantilla: PlantillaDocumento) => {
    setSelectedPlantilla(plantilla);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: PlantillaFormValues) => {
    if (!selectedPlantilla && !selectedFile) {
      toast.error('Debe seleccionar un archivo para la nueva plantilla');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof PlantillaFormValues];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      if (selectedFile) formData.append('file', selectedFile);

      if (selectedPlantilla) {
        await api.upload(`/banco-documentos/plantillas/${selectedPlantilla.id}`, formData, 'PATCH');
        toast.success('Plantilla actualizada correctamente');
      } else {
        await api.upload('/banco-documentos/plantillas', formData);
        toast.success('Plantilla creada correctamente');
      }
      setDialogOpen(false);
      fetchPlantillas();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlantilla) return;
    try {
      await api.delete(`/banco-documentos/plantillas/${selectedPlantilla.id}`);
      toast.success('Plantilla eliminada correctamente');
      setDeleteDialogOpen(false);
      fetchPlantillas();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la plantilla');
    }
  };

  const handleToggle = async (plantilla: PlantillaDocumento) => {
    try {
      await api.patch(`/banco-documentos/plantillas/${plantilla.id}/toggle`, {});
      toast.success(plantilla.activo ? 'Plantilla desactivada' : 'Plantilla activada');
      fetchPlantillas();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    }
  };

  const handleDownload = async (plantilla: PlantillaDocumento) => {
    setDownloadingId(plantilla.id);
    try {
      if (plantilla.archivo_base_url) {
        const url = plantilla.archivo_base_url.startsWith('http')
          ? plantilla.archivo_base_url
          : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${plantilla.archivo_base_url}`;
        window.open(url, '_blank');
      }
    } catch (error) {
      toast.error('Error al descargar el documento');
      console.error(error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setSelectedFile(file);
    setExtractedVariables([]);

    if (file) {
      setIsExtracting(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.upload<{ variables: string[] }>('/banco-documentos/extract-variables', formData);
        setExtractedVariables(response.variables || []);
        if ((response.variables || []).length === 0) {
          toast.info('No se detectaron variables en el archivo');
        } else {
          toast.success(`Se detectaron ${response.variables.length} variables`);
        }
      } catch (error: any) {
        console.error('Error extracting variables:', error);
        toast.error('Error al analizar el archivo: ' + (error.message || 'Error desconocido'));
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const getAllVariableKeys = () => {
    if (!variables) return new Set<string>();
    const keys = new Set<string>();
    Object.values(variables).forEach(group => group.forEach((v: VariableInfo) => keys.add(v.key)));
    return keys;
  };

  const filteredPlantillas = plantillas.filter(p =>
    filterCategoria === 'all' || p.categoria === filterCategoria
  );

  return {
    plantillas, variables, loading, saving, dialogOpen, setDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen, downloadingId,
    selectedPlantilla, filterCategoria, setFilterCategoria,
    showInactive, setShowInactive, selectedFile, setSelectedFile,
    extractedVariables, isExtracting, fileInputRef, tipoArchivo,
    form, filteredPlantillas,
    getAllVariableKeys,
    openCreateDialog, openEditDialog, openDeleteDialog,
    onSubmit, handleDelete, handleToggle, handleDownload, handleFileChange,
  };
}
