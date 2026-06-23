'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { hasPermission } from '@/lib/auth';
import { toDateString } from '@/lib/utils';
import { Empleado, TipoDocumentoEmpleado } from '@/types';
import { useUser } from '@/contexts/user-context';
import { useAuthImage } from '@/hooks/useAuthImage';
import { toast } from 'sonner';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const familiarSchema = z.object({
  parentesco: z.string().min(1, 'Requerido'),
  nombres_apellidos: z.string().min(2, 'Mínimo 2 caracteres'),
  tipo_documento: z.enum(['DNI', 'CE', 'PASAPORTE']),
  numero_documento: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  telefono: z.string().optional(),
  es_dependiente: z.boolean(),
});

export const movimientoSchema = z.object({
  tipo_movimiento: z.enum(['ALTA', 'BAJA', 'RENUNCIA', 'VACACIONES', 'SUSPENSION', 'REINCORPORACION']),
  fecha_movimiento: z.string().min(1, 'Requerido'),
  motivo: z.string().optional(),
  observaciones: z.string().optional(),
});

export const documentoSchema = z.object({
  tipo_documento_empleado_id: z.number().min(1, 'Seleccione un tipo'),
  descripcion: z.string().optional().or(z.literal('')),
  fecha_emision: z.string().optional().or(z.literal('')),
  fecha_vencimiento: z.string().optional().or(z.literal('')),
});

export type FamiliarFormValues = z.infer<typeof familiarSchema>;
export type MovimientoFormValues = z.infer<typeof movimientoSchema>;
export type DocumentoFormValues = z.infer<typeof documentoSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const tiposMovimiento = [
  { value: 'ALTA', label: 'Alta', description: 'Ingreso del empleado' },
  { value: 'BAJA', label: 'Baja', description: 'Cese por decision de la empresa' },
  { value: 'RENUNCIA', label: 'Renuncia', description: 'Cese voluntario del empleado' },
  { value: 'VACACIONES', label: 'Vacaciones', description: 'Inicio de periodo vacacional' },
  { value: 'SUSPENSION', label: 'Suspension', description: 'Suspension temporal' },
  { value: 'REINCORPORACION', label: 'Reincorporacion', description: 'Retorno de vacaciones o suspension' },
];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEmpleadoDetalle() {
  const router = useRouter();
  const params = useParams();
  const usuario = useUser();

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const fotoUrl = useAuthImage(empleado?.foto_url);

  // Familiar dialog state
  const [familiarDialogOpen, setFamiliarDialogOpen] = useState(false);
  const [savingFamiliar, setSavingFamiliar] = useState(false);
  const [deletingFamiliarId, setDeletingFamiliarId] = useState<number | null>(null);

  // Movimiento dialog state
  const [movimientoDialogOpen, setMovimientoDialogOpen] = useState(false);
  const [savingMovimiento, setSavingMovimiento] = useState(false);

  // Documento state
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoEmpleado[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<number | string | null>(null);
  const [documentoDialogOpen, setDocumentoDialogOpen] = useState(false);
  const [savingDocumento, setSavingDocumento] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number>(-1);

  // Forms
  const familiarForm = useForm<FamiliarFormValues>({
    resolver: zodResolver(familiarSchema),
    defaultValues: {
      parentesco: '',
      nombres_apellidos: '',
      tipo_documento: 'DNI',
      numero_documento: '',
      fecha_nacimiento: '',
      telefono: '',
      es_dependiente: false,
    },
  });

  const movimientoForm = useForm<MovimientoFormValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      tipo_movimiento: 'ALTA',
      fecha_movimiento: '',
      motivo: '',
      observaciones: '',
    },
  });

  const documentoForm = useForm<DocumentoFormValues>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      tipo_documento_empleado_id: 0,
      descripcion: '',
      fecha_emision: '',
      fecha_vencimiento: '',
    },
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTiposDocumento = useCallback(async () => {
    try {
      const response = await api.get<TipoDocumentoEmpleado[]>('/masters/tipos-documento-empleado');
      setTiposDocumento(response.filter(t => t.activo));
    } catch (error) {
      console.error('Error fetching tipos documento:', error);
    }
  }, []);

  const fetchEmpleado = useCallback(async () => {
    try {
      const response = await api.get<Empleado>(`/empleados/${params.id}`);
      setEmpleado(response);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar empleado'));
      router.push('/rrhh/empleados');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchEmpleado();
      fetchTiposDocumento();
    }
  }, [params.id, fetchEmpleado, fetchTiposDocumento]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    const [y, m, d] = date.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  // ─── Familiar handlers ───────────────────────────────────────────────────────

  const handleOpenFamiliarDialog = () => {
    familiarForm.reset({
      parentesco: '',
      nombres_apellidos: '',
      tipo_documento: 'DNI',
      numero_documento: '',
      fecha_nacimiento: '',
      telefono: '',
      es_dependiente: false,
    });
    setFamiliarDialogOpen(true);
  };

  const handleSaveFamiliar = async (data: FamiliarFormValues) => {
    if (!empleado) return;
    setSavingFamiliar(true);
    try {
      await api.post(`/empleados/${empleado.id}/familiares`, {
        ...data,
        fecha_nacimiento: data.fecha_nacimiento || null,
        numero_documento: data.numero_documento || null,
        telefono: data.telefono || null,
      });
      toast.success('Familiar agregado correctamente');
      setFamiliarDialogOpen(false);
      fetchEmpleado();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al agregar familiar'));
    } finally {
      setSavingFamiliar(false);
    }
  };

  const handleDeleteFamiliar = async (familiarId: number) => {
    if (!empleado) return;
    setDeletingFamiliarId(familiarId);
    try {
      await api.delete(`/empleados/${empleado.id}/familiares/${familiarId}`);
      toast.success('Familiar eliminado');
      fetchEmpleado();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar familiar'));
    } finally {
      setDeletingFamiliarId(null);
    }
  };

  // ─── Movimiento handlers ──────────────────────────────────────────────────────

  const handleOpenMovimientoDialog = () => {
    movimientoForm.reset({
      tipo_movimiento: 'ALTA',
      fecha_movimiento: toDateString(new Date()),
      motivo: '',
      observaciones: '',
    });
    setMovimientoDialogOpen(true);
  };

  const handleSaveMovimiento = async (data: MovimientoFormValues) => {
    if (!empleado) return;
    setSavingMovimiento(true);
    try {
      await api.post(`/empleados/${empleado.id}/movimientos`, {
        ...data,
        motivo: data.motivo || null,
        observaciones: data.observaciones || null,
      });
      toast.success('Movimiento registrado correctamente');
      setMovimientoDialogOpen(false);
      fetchEmpleado();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al registrar movimiento'));
    } finally {
      setSavingMovimiento(false);
    }
  };

  // ─── Documento handlers ───────────────────────────────────────────────────────

  const handleOpenDocumentoDialog = () => {
    documentoForm.reset({ tipo_documento_empleado_id: 0, descripcion: '' });
    setSelectedFile(null);
    setDocumentoDialogOpen(true);
  };

  const handleSaveDocumento = async (data: DocumentoFormValues) => {
    if (!empleado) return;
    if (!selectedFile) {
      toast.error('Seleccione un archivo');
      return;
    }
    setSavingDocumento(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tipo_documento_empleado_id', String(data.tipo_documento_empleado_id));
      if (data.descripcion) formData.append('descripcion', data.descripcion);
      if (data.fecha_emision) formData.append('fecha_emision', data.fecha_emision);
      if (data.fecha_vencimiento) formData.append('fecha_vencimiento', data.fecha_vencimiento);

      await api.upload(`/empleados/${empleado.id}/documentos`, formData);
      toast.success('Documento subido correctamente');
      setDocumentoDialogOpen(false);
      fetchEmpleado();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al subir documento'));
    } finally {
      setSavingDocumento(false);
    }
  };

  const handleDeleteDocumento = async (docId: number) => {
    if (!empleado) return;
    setDeletingDocId(docId);
    try {
      await api.delete(`/empleados/${empleado.id}/documentos/${docId}`);
      toast.success('Documento eliminado');
      fetchEmpleado();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar documento'));
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleVerDocumento = (url: string) => {
    const docs = [...docsSeleccion, ...docsRRHH];
    const index = docs.findIndex(d => d.archivo_url === url);
    setPreviewDocIndex(index >= 0 ? index : 0);
  };

  const handleDescargarDocumento = async (url: string, nombre: string) => {
    try {
      const blob = await api.getBlob(url.replace(process.env.NEXT_PUBLIC_API_URL || '', ''));
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nombre || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error al descargar documento:', error);
      toast.error('No se pudo descargar el documento');
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────────

  const docsSeleccion = useMemo(
    () => (empleado?.documentos || []).filter(d => d.origen === 'SELECCION'),
    [empleado?.documentos],
  );

  const docsRRHH = useMemo(
    () => (empleado?.documentos || []).filter(d => d.origen !== 'SELECCION'),
    [empleado?.documentos],
  );

  const categoriasSeleccion = useMemo(() => {
    const tipos = tiposDocumento.filter(t => t.aplica_seleccion);
    const cats: { key: string; nombre: string; tipoId: number | null; count: number }[] = tipos.map(tipo => ({
      key: `tipo-${tipo.id}`,
      nombre: tipo.nombre,
      tipoId: tipo.id,
      count: docsSeleccion.filter(d => d.tipo_documento_empleado_id === tipo.id).length,
    }));
    const sinClasificar = docsSeleccion.filter(d => !d.tipo_documento_empleado_id).length;
    if (sinClasificar > 0) {
      cats.push({ key: 'sin-clasificar', nombre: 'Sin clasificar', tipoId: null, count: sinClasificar });
    }
    return cats;
  }, [tiposDocumento, docsSeleccion]);

  const categoriasRRHH = useMemo(() => {
    const tipos = tiposDocumento.filter(t => t.aplica_rrhh);
    const cats: { key: string; nombre: string; tipoId: number | null; count: number }[] = tipos.map(tipo => ({
      key: `tipo-${tipo.id}`,
      nombre: tipo.nombre,
      tipoId: tipo.id,
      count: docsRRHH.filter(d => d.tipo_documento_empleado_id === tipo.id).length,
    }));
    const sinClasificar = docsRRHH.filter(d => !d.tipo_documento_empleado_id).length;
    if (sinClasificar > 0) {
      cats.push({ key: 'sin-clasificar', nombre: 'Sin clasificar', tipoId: null, count: sinClasificar });
    }
    return cats;
  }, [tiposDocumento, docsRRHH]);

  const docsSeleccionFiltrados = useMemo(() => {
    if (tipoFiltro === null) return docsSeleccion;
    if (typeof tipoFiltro === 'string') {
      if (tipoFiltro === 'SEL:sin-clasificar') return docsSeleccion.filter(d => !d.tipo_documento_empleado_id);
      if (tipoFiltro.startsWith('SEL:tipo-')) {
        const tipoId = parseInt(tipoFiltro.slice(9), 10);
        return docsSeleccion.filter(d => d.tipo_documento_empleado_id === tipoId);
      }
      return docsSeleccion;
    }
    return [];
  }, [docsSeleccion, tipoFiltro]);

  const docsRRHHFiltrados = useMemo(() => {
    if (tipoFiltro === null) return docsRRHH;
    if (typeof tipoFiltro === 'string') {
      if (tipoFiltro === 'RRHH:sin-clasificar') return docsRRHH.filter(d => !d.tipo_documento_empleado_id);
      if (tipoFiltro.startsWith('RRHH:tipo-')) {
        const tipoId = parseInt(tipoFiltro.slice(10), 10);
        return docsRRHH.filter(d => d.tipo_documento_empleado_id === tipoId);
      }
      return [];
    }
    return docsRRHH;
  }, [docsRRHH, tipoFiltro]);

  const canEditSeleccionDocs = hasPermission(usuario, 'documentos_seleccion:editar');

  return {
    // core
    router,
    empleado,
    loading,
    fotoUrl,
    fetchEmpleado,
    // helpers
    formatDate,
    formatCurrency,
    // familiar
    familiarForm,
    familiarDialogOpen,
    setFamiliarDialogOpen,
    savingFamiliar,
    deletingFamiliarId,
    handleOpenFamiliarDialog,
    handleSaveFamiliar,
    handleDeleteFamiliar,
    // movimiento
    movimientoForm,
    movimientoDialogOpen,
    setMovimientoDialogOpen,
    savingMovimiento,
    handleOpenMovimientoDialog,
    handleSaveMovimiento,
    // documento
    tiposDocumento,
    tipoFiltro,
    setTipoFiltro,
    documentoForm,
    documentoDialogOpen,
    setDocumentoDialogOpen,
    savingDocumento,
    selectedFile,
    setSelectedFile,
    deletingDocId,
    previewDocIndex,
    setPreviewDocIndex,
    handleOpenDocumentoDialog,
    handleSaveDocumento,
    handleDeleteDocumento,
    handleVerDocumento,
    handleDescargarDocumento,
    // derived
    docsSeleccion,
    docsRRHH,
    docsSeleccionFiltrados,
    docsRRHHFiltrados,
    categoriasSeleccion,
    categoriasRRHH,
    canEditSeleccionDocs,
  };
}
