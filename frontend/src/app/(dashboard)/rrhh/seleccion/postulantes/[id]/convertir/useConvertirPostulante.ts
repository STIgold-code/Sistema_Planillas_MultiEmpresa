'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { toDateString } from '@/lib/utils';
import { Postulante } from '@/types';
import { toast } from 'sonner';

export interface Area { id: number; nombre: string; }
export interface Cargo { id: number; nombre: string; }
export interface Sede { id: number; nombre: string; }
export interface RegimenPensionario { id: number; nombre: string; tipo: string; }
export interface Banco { id: number; nombre: string; }

interface SbsConsultaResult {
  afp: string | null;
  cuspp: string | null;
  regimen_pensionario_id: number | null;
  mensaje: string;
}

export const convertirSchema = z.object({
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es requerida'),
  area_id: z.string().optional(),
  cargo_id: z.string().optional(),
  sede_id: z.string().optional(),
  sueldo_base: z.string().min(1, 'El sueldo es requerido'),
  tipo_pago: z.string().optional(),
  turno: z.string().optional(),
  tipo_contrato: z.string().min(1, 'El tipo de contrato es requerido'),
  modalidad_contrato: z.string().min(1, 'La modalidad es requerida'),
  fecha_inicio_contrato: z.string().min(1, 'La fecha de inicio del contrato es requerida'),
  fecha_fin_contrato: z.string().min(1, 'La fecha de fin del contrato es requerida'),
  regimen_pensionario_id: z.string().optional(),
  cuspp: z.string().optional(),
  asignacion_familiar: z.boolean().optional(),
  sctr: z.boolean().optional(),
  bono_productividad: z.string().optional(),
  bono_desempeno: z.string().optional(),
  bono_movilidad: z.string().optional(),
  bono_refrigerio: z.string().optional(),
  bono_armado: z.string().optional(),
  asignacion_cliente: z.string().optional(),
  banco_haberes_id: z.string().optional(),
  nro_cuenta_haberes: z.string().optional(),
  cci_haberes: z.string().optional(),
  banco_cts_id: z.string().optional(),
  nro_cuenta_cts: z.string().optional(),
  cci_cts: z.string().optional(),
  celular_asignado: z.string().optional(),
  email_asignado: z.string().optional(),
});

export type ConvertirFormValues = z.infer<typeof convertirSchema>;

export function useConvertirPostulante() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [postulante, setPostulante] = useState<Postulante | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [regimenes, setRegimenes] = useState<RegimenPensionario[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consultandoSbs, setConsultandoSbs] = useState(false);

  const form = useForm<ConvertirFormValues>({
    resolver: zodResolver(convertirSchema),
    defaultValues: {
      fecha_ingreso: toDateString(new Date()),
      area_id: '',
      cargo_id: '',
      sede_id: '',
      sueldo_base: '1130',
      tipo_pago: 'PLANILLA',
      turno: 'DIA',
      tipo_contrato: 'SUJETO_A_MODALIDAD',
      modalidad_contrato: 'TIEMPO_COMPLETO',
      fecha_inicio_contrato: '',
      fecha_fin_contrato: '',
      regimen_pensionario_id: '',
      cuspp: '',
      asignacion_familiar: false,
      sctr: false,
      bono_productividad: '',
      bono_desempeno: '',
      bono_movilidad: '',
      bono_refrigerio: '',
      bono_armado: '',
      asignacion_cliente: '',
      banco_haberes_id: '',
      nro_cuenta_haberes: '',
      cci_haberes: '',
      banco_cts_id: '',
      nro_cuenta_cts: '',
      cci_cts: '',
      celular_asignado: '',
      email_asignado: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postulanteRes, areasRes, cargosRes, sedesRes, regimenesRes, bancosRes] = await Promise.all([
          api.get<Postulante>(`/postulantes/${id}`),
          api.get<Area[]>('/masters/areas'),
          api.get<Cargo[]>('/masters/cargos'),
          api.get<{ data: Sede[] }>('/sedes?limit=100'),
          api.get<RegimenPensionario[]>('/masters/regimenes-pensionarios'),
          api.get<Banco[]>('/masters/bancos'),
        ]);

        setPostulante(postulanteRes);
        setAreas(areasRes);
        setCargos(cargosRes);
        setSedes(sedesRes.data);
        setRegimenes(regimenesRes);
        setBancos(bancosRes);

        if (postulanteRes.estado !== 'APROBADO') {
          toast.error('Solo se pueden convertir postulantes aprobados');
          router.back();
          return;
        }

        if (postulanteRes.empleado_id) {
          toast.error('Este postulante ya fue convertido a empleado');
          router.back();
          return;
        }

        if (postulanteRes.vacante?.area_id) form.setValue('area_id', postulanteRes.vacante.area_id.toString());
        if (postulanteRes.vacante?.cargo_id) form.setValue('cargo_id', postulanteRes.vacante.cargo_id.toString());
        if (postulanteRes.vacante?.sede_id) form.setValue('sede_id', postulanteRes.vacante.sede_id.toString());
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // form (React Hook Form) tiene referencia estable; se omite a propósito para
    // que la carga inicial solo dependa de id y router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const handleConsultarSbs = async () => {
    if (!postulante) return;

    const { tipo_documento: tipoDoc, numero_documento: numDoc, apellido_paterno, apellido_materno, nombres } = postulante;

    if (!tipoDoc || !numDoc || !apellido_paterno || !apellido_materno || !nombres) {
      toast.error('Faltan datos del postulante para consultar SBS');
      return;
    }

    if (!['DNI', 'CE'].includes(tipoDoc)) {
      toast.error('Tipo de documento no soportado para consulta SBS. Solo DNI o CE.');
      return;
    }

    setConsultandoSbs(true);
    try {
      const result = await api.post<SbsConsultaResult>('/empleados/consultar-sbs', {
        tipo_documento: tipoDoc,
        numero_documento: numDoc,
        apellido_paterno,
        apellido_materno,
        nombres,
      });

      if (result.afp && result.regimen_pensionario_id) {
        form.setValue('regimen_pensionario_id', result.regimen_pensionario_id.toString());
        toast.success(`AFP encontrada: ${result.afp}`);
      } else if (result.mensaje.includes('No se encontraron')) {
        toast.info('No se encontró afiliación AFP en SBS (puede estar en ONP)');
      } else {
        toast.warning(result.mensaje);
      }

      if (result.cuspp) form.setValue('cuspp', result.cuspp);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al consultar SBS';
      toast.error(message);
    } finally {
      setConsultandoSbs(false);
    }
  };

  const onSubmit = async (data: ConvertirFormValues) => {
    setSaving(true);
    try {
      const payload = {
        fecha_ingreso: data.fecha_ingreso,
        area_id: data.area_id ? parseInt(data.area_id) : undefined,
        cargo_id: data.cargo_id ? parseInt(data.cargo_id) : undefined,
        sede_id: data.sede_id ? parseInt(data.sede_id) : undefined,
        sueldo_base: parseFloat(data.sueldo_base),
        tipo_pago: data.tipo_pago || 'PLANILLA',
        turno: data.turno || 'DIA',
        tipo_contrato: data.tipo_contrato,
        modalidad_contrato: data.modalidad_contrato,
        fecha_inicio_contrato: data.fecha_inicio_contrato,
        fecha_fin_contrato: data.fecha_fin_contrato,
        regimen_pensionario_id: data.regimen_pensionario_id ? parseInt(data.regimen_pensionario_id) : undefined,
        cuspp: data.cuspp || undefined,
        asignacion_familiar: data.asignacion_familiar || false,
        sctr: data.sctr || false,
        bono_productividad: data.bono_productividad ? parseFloat(data.bono_productividad) : undefined,
        bono_desempeno: data.bono_desempeno ? parseFloat(data.bono_desempeno) : undefined,
        bono_movilidad: data.bono_movilidad ? parseFloat(data.bono_movilidad) : undefined,
        bono_refrigerio: data.bono_refrigerio ? parseFloat(data.bono_refrigerio) : undefined,
        bono_armado: data.bono_armado ? parseFloat(data.bono_armado) : undefined,
        asignacion_cliente: data.asignacion_cliente ? parseFloat(data.asignacion_cliente) : undefined,
        banco_haberes_id: data.banco_haberes_id ? parseInt(data.banco_haberes_id) : undefined,
        nro_cuenta_haberes: data.nro_cuenta_haberes || undefined,
        cci_haberes: data.cci_haberes || undefined,
        banco_cts_id: data.banco_cts_id ? parseInt(data.banco_cts_id) : undefined,
        nro_cuenta_cts: data.nro_cuenta_cts || undefined,
        cci_cts: data.cci_cts || undefined,
        celular_asignado: data.celular_asignado || undefined,
        email_asignado: data.email_asignado || undefined,
      };

      const empleado = await api.post<{ id: number }>(`/postulantes/${id}/convertir`, payload);
      toast.success('Empleado creado correctamente');
      router.push(`/rrhh/empleados/${empleado.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al convertir a empleado';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return {
    postulante, areas, cargos, sedes, regimenes, bancos,
    loading, saving, consultandoSbs,
    form, onSubmit, handleConsultarSbs,
    router,
  };
}
