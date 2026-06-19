'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Postulante, Vacante, Procedencia } from '@/types';
import { toast } from 'sonner';

export interface PostulantesResponse {
  data: Postulante[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const postulanteSchema = z.object({
  vacante_id: z.string().min(1, 'Seleccione una vacante'),
  tipo_documento: z.string().optional(),
  numero_documento: z.string().min(1, 'El documento es requerido'),
  apellido_paterno: z.string().min(2, 'Minimo 2 caracteres'),
  apellido_materno: z.string().min(2, 'Minimo 2 caracteres'),
  nombres: z.string().min(2, 'Minimo 2 caracteres'),
  fecha_nacimiento: z.string().optional(),
  sexo: z.string().optional(),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  celular: z.string().regex(/^9\d{8}$/, 'Debe tener 9 digitos y empezar con 9').optional().or(z.literal('')),
  pretension_salarial: z.string()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 1130), { message: 'Minimo S/. 1,130 (sueldo minimo)' })
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) <= 100000), { message: 'Maximo S/. 100,000' })
    .optional().or(z.literal('')),
  procedencia_id: z.string().optional(),
}).superRefine((data, ctx) => {
  const tipo = data.tipo_documento || 'DNI';
  const doc = data.numero_documento;
  if (tipo === 'DNI' && !/^\d{8}$/.test(doc)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El DNI debe tener exactamente 8 digitos', path: ['numero_documento'] });
  } else if (tipo === 'CE' && !/^\d{9}$/.test(doc)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El CE debe tener exactamente 9 digitos', path: ['numero_documento'] });
  } else if (tipo === 'PASAPORTE' && !/^[a-zA-Z0-9]{6,12}$/.test(doc)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El pasaporte debe tener entre 6 y 12 caracteres alfanumericos', path: ['numero_documento'] });
  }
});

export type PostulanteFormValues = z.infer<typeof postulanteSchema>;

export function usePostulantes() {
  const router = useRouter();
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [procedencias, setProcedencias] = useState<Procedencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [deletePostulante, setDeletePostulante] = useState<Postulante | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<PostulanteFormValues>({
    resolver: zodResolver(postulanteSchema),
    defaultValues: {
      vacante_id: getFilter('vacante_id'),
      tipo_documento: 'DNI',
      numero_documento: '',
      apellido_paterno: '',
      apellido_materno: '',
      nombres: '',
      fecha_nacimiento: '',
      sexo: '',
      email: '',
      celular: '',
      pretension_salarial: '',
      procedencia_id: '',
    },
  });

  const fetchPostulantes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const vacanteId = getFilter('vacante_id');
      const estado = getFilter('estado');
      if (buscar) params.append('buscar', buscar);
      if (vacanteId) params.append('vacante_id', vacanteId);
      if (estado) params.append('estado', estado);

      const response = await api.get<PostulantesResponse>(`/postulantes?${params.toString()}`);
      setPostulantes(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching postulantes:', error);
      toast.error('Error al cargar los postulantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchVacantes = async () => {
    try {
      const response = await api.get<{ data: Vacante[] }>('/vacantes?limit=100');
      setVacantes(response.data.filter((v) => v.estado === 'PUBLICADA' || v.estado === 'EN_PROCESO'));
    } catch (error) {
      console.error('Error fetching vacantes:', error);
    }
  };

  const fetchProcedencias = async () => {
    try {
      const response = await api.get<Procedencia[]>('/masters/procedencias');
      setProcedencias(response);
    } catch (error) {
      console.error('Error fetching procedencias:', error);
    }
  };

  useEffect(() => {
    fetchVacantes();
    fetchProcedencias();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPostulantes(); }, [filterParams]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    form.reset({
      vacante_id: getFilter('vacante_id'),
      tipo_documento: 'DNI',
      numero_documento: '',
      apellido_paterno: '',
      apellido_materno: '',
      nombres: '',
      fecha_nacimiento: '',
      sexo: '',
      email: '',
      celular: '',
      pretension_salarial: '',
      procedencia_id: '',
    });
  };

  const onSubmit = async (data: PostulanteFormValues) => {
    if (data.tipo_documento === 'DNI' && !/^\d{8}$/.test(data.numero_documento)) {
      toast.error('El DNI debe tener exactamente 8 digitos numericos');
      return;
    }

    setSaving(true);
    try {
      const parseNumber = (val: string | undefined): number | undefined => {
        if (!val) return undefined;
        const num = parseFloat(val);
        return isNaN(num) ? undefined : num;
      };

      const payload = {
        vacante_id: parseInt(data.vacante_id),
        tipo_documento: data.tipo_documento || 'DNI',
        numero_documento: data.numero_documento,
        apellido_paterno: data.apellido_paterno.toUpperCase(),
        apellido_materno: data.apellido_materno.toUpperCase(),
        nombres: data.nombres.toUpperCase(),
        fecha_nacimiento: data.fecha_nacimiento || undefined,
        sexo: data.sexo || undefined,
        email: data.email || undefined,
        celular: data.celular || undefined,
        pretension_salarial: parseNumber(data.pretension_salarial),
        procedencia_id: data.procedencia_id ? parseInt(data.procedencia_id) : undefined,
      };

      await api.post('/postulantes', payload);
      toast.success('Postulante registrado correctamente');
      handleCloseDialog();
      fetchPostulantes();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar el postulante';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePostulante) return;
    setDeleting(true);
    try {
      await api.delete(`/postulantes/${deletePostulante.id}`);
      toast.success('Postulante eliminado correctamente');
      setDeletePostulante(null);
      fetchPostulantes();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar el postulante';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return {
    // State
    postulantes, vacantes, procedencias, loading, saving, deleting,
    dialogOpen, setDialogOpen,
    meta, page, setPage,
    deletePostulante, setDeletePostulante,
    buscarInput, setBuscarInput, debouncedSetBuscar,
    // Form
    form,
    // Handlers
    onSubmit,
    handleCloseDialog,
    handleDelete,
    // Router & filters
    router,
    getFilter, setFilter,
  };
}
