'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Postulante, Procedencia } from '@/types';
import { useUbigeo } from '@/hooks/useUbigeo';
import { toast } from 'sonner';

const editarSchema = z.object({
  tipo_documento: z.string().optional(),
  numero_documento: z.string().min(8, 'El documento debe tener al menos 8 caracteres'),
  apellido_paterno: z.string().min(2, 'Minimo 2 caracteres'),
  apellido_materno: z.string().min(2, 'Minimo 2 caracteres'),
  nombres: z.string().min(2, 'Minimo 2 caracteres'),
  fecha_nacimiento: z.string().optional(),
  sexo: z.string().optional(),
  estado_civil: z.string().optional(),
  nacionalidad: z.string().optional(),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  celular: z.string().optional(),
  telefono: z.string().optional(),
  foto_url: z.string().optional(),
  direccion: z.string().optional(),
  referencia: z.string().optional(),
  departamento_id: z.string().optional(),
  provincia_id: z.string().optional(),
  distrito_id: z.string().optional(),
  estatura: z.string().optional(),
  peso: z.string().optional(),
  categoria_licencia: z.string().optional(),
  pretension_salarial: z.string().optional(),
  procedencia_id: z.string().optional(),
});

export type EditarFormValues = z.infer<typeof editarSchema>;

export function useEditarPostulante() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [postulante, setPostulante] = useState<Postulante | null>(null);
  const [procedencias, setProcedencias] = useState<Procedencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<EditarFormValues>({
    resolver: zodResolver(editarSchema),
    defaultValues: {
      tipo_documento: 'DNI',
      numero_documento: '',
      apellido_paterno: '',
      apellido_materno: '',
      nombres: '',
      fecha_nacimiento: '',
      sexo: '',
      estado_civil: '',
      nacionalidad: '',
      email: '',
      celular: '',
      telefono: '',
      foto_url: '',
      direccion: '',
      referencia: '',
      departamento_id: '',
      provincia_id: '',
      distrito_id: '',
      estatura: '',
      peso: '',
      categoria_licencia: '',
      pretension_salarial: '',
      procedencia_id: '',
    },
  });

  const departamentoId = form.watch('departamento_id');
  const provinciaId = form.watch('provincia_id');

  const { departamentos, provinciasFiltradas, distritosFiltrados } = useUbigeo({
    departamentoId,
    provinciaId,
  });

  useEffect(() => {
    if (departamentoId && postulante) {
      const currentProvincia = form.getValues('provincia_id');
      if (currentProvincia && !provinciasFiltradas.find((p) => p.id === parseInt(currentProvincia))) {
        form.setValue('provincia_id', '');
        form.setValue('distrito_id', '');
      }
    }
  }, [departamentoId, provinciasFiltradas]);

  useEffect(() => {
    if (provinciaId && postulante) {
      const currentDistrito = form.getValues('distrito_id');
      if (currentDistrito && !distritosFiltrados.find((d) => d.id === parseInt(currentDistrito))) {
        form.setValue('distrito_id', '');
      }
    }
  }, [provinciaId, distritosFiltrados]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postulanteRes, procedenciasRes] = await Promise.all([
          api.get<Postulante>(`/postulantes/${id}`),
          api.get<Procedencia[]>('/masters/procedencias'),
        ]);

        setPostulante(postulanteRes);
        setProcedencias(procedenciasRes);

        let deptId = '';
        let provId = '';
        const distId = postulanteRes.distrito_id?.toString() || '';

        if (postulanteRes.distrito?.provincia) {
          provId = postulanteRes.distrito.provincia.id.toString();
          if (postulanteRes.distrito.provincia.departamento) {
            deptId = postulanteRes.distrito.provincia.departamento.id.toString();
          }
        }

        form.reset({
          tipo_documento: postulanteRes.tipo_documento || 'DNI',
          numero_documento: postulanteRes.numero_documento,
          apellido_paterno: postulanteRes.apellido_paterno,
          apellido_materno: postulanteRes.apellido_materno,
          nombres: postulanteRes.nombres,
          fecha_nacimiento: postulanteRes.fecha_nacimiento?.split('T')[0] || '',
          sexo: postulanteRes.sexo || '',
          estado_civil: postulanteRes.estado_civil || '',
          nacionalidad: postulanteRes.nacionalidad || '',
          email: postulanteRes.email || '',
          celular: postulanteRes.celular || '',
          telefono: postulanteRes.telefono || '',
          foto_url: postulanteRes.foto_url || '',
          direccion: postulanteRes.direccion || '',
          referencia: postulanteRes.referencia || '',
          departamento_id: deptId,
          provincia_id: provId,
          distrito_id: distId,
          estatura: postulanteRes.estatura?.toString() || '',
          peso: postulanteRes.peso?.toString() || '',
          categoria_licencia: postulanteRes.categoria_licencia || '',
          pretension_salarial: postulanteRes.pretension_salarial?.toString() || '',
          procedencia_id: postulanteRes.procedencia_id?.toString() || '',
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const onSubmit = async (data: EditarFormValues) => {
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
        tipo_documento: data.tipo_documento || 'DNI',
        numero_documento: data.numero_documento,
        apellido_paterno: data.apellido_paterno.toUpperCase(),
        apellido_materno: data.apellido_materno.toUpperCase(),
        nombres: data.nombres.toUpperCase(),
        fecha_nacimiento: data.fecha_nacimiento || undefined,
        sexo: data.sexo || undefined,
        estado_civil: data.estado_civil || undefined,
        nacionalidad: data.nacionalidad || undefined,
        email: data.email || undefined,
        celular: data.celular || undefined,
        telefono: data.telefono || undefined,
        foto_url: data.foto_url || undefined,
        direccion: data.direccion || undefined,
        referencia: data.referencia || undefined,
        distrito_id: data.distrito_id ? parseInt(data.distrito_id) : undefined,
        estatura: parseNumber(data.estatura),
        peso: parseNumber(data.peso),
        categoria_licencia: data.categoria_licencia || undefined,
        pretension_salarial: parseNumber(data.pretension_salarial),
        procedencia_id: data.procedencia_id ? parseInt(data.procedencia_id) : undefined,
      };

      await api.patch(`/postulantes/${id}`, payload);
      toast.success('Postulante actualizado correctamente');
      router.push(`/rrhh/seleccion/postulantes/${id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar los cambios';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return {
    postulante,
    procedencias,
    loading,
    saving,
    form,
    departamentoId,
    provinciaId,
    departamentos,
    provinciasFiltradas,
    distritosFiltrados,
    onSubmit,
    router,
  };
}
