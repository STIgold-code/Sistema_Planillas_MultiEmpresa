'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Area, Cargo, Banco, Empleado, Sede, SbsConsultaResult } from '@/types';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Departamento {
  id: number;
  nombre: string;
}

export interface Provincia {
  id: number;
  nombre: string;
  departamento_id: number;
}

export interface Distrito {
  id: number;
  nombre: string;
  provincia_id: number;
}

export interface RegimenPensionario {
  id: number;
  nombre: string;
  tipo: string;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

export const empleadoSchema = z.object({
  tipo_documento: z.enum(['DNI', 'CE', 'PASAPORTE']),
  numero_documento: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(12, 'Máximo 12 caracteres')
    .regex(/^\d+$/, 'Solo números'),
  apellido_paterno: z
    .string()
    .min(2, 'Requerido')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras'),
  apellido_materno: z
    .string()
    .min(2, 'Requerido')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras'),
  nombres: z
    .string()
    .min(2, 'Requerido')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras'),
  fecha_nacimiento: z.string().min(1, 'Requerido'),
  sexo: z.enum(['M', 'F']),
  estado_civil: z.string().optional(),
  nacionalidad: z.string().optional(),
  telefono: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  celular: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  referencia: z.string().optional(),
  departamento_id: z.string().optional(),
  provincia_id: z.string().optional(),
  distrito_id: z.string().optional(),
  area_id: z.string().optional(),
  cargo_id: z.string().optional(),
  sede_id: z.string().optional(),
  fecha_ingreso: z.string().min(1, 'Requerido'),
  fecha_planilla: z.string().optional(),
  fecha_cese: z.string().optional(),
  sueldo_base: z.coerce.number().min(0, 'Debe ser mayor a 0'),
  tipo_pago: z.enum(['PLANILLA', 'RECIBO']),
  turno: z.enum(['DIA', 'NOCHE']),
  regimen_pensionario_id: z.string().optional(),
  cuspp: z.string().optional(),
  asignacion_familiar: z.boolean(),
  sctr: z.boolean(),
  es_mype: z.boolean(),
  banco_haberes_id: z.string().optional(),
  nro_cuenta_haberes: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  cci_haberes: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  banco_cts_id: z.string().optional(),
  nro_cuenta_cts: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  cci_cts: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  celular_asignado: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  email_asignado: z.string().email('Email inválido').optional().or(z.literal('')),
  estatura: z.coerce.number().optional(),
  peso: z.coerce.number().optional(),
  categoria_licencia: z.string().optional(),
  foto_url: z.string().optional().nullable(),
});

export type EmpleadoFormValues = z.infer<typeof empleadoSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const handleNumericInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
) => {
  const value = e.target.value.replace(/\D/g, '');
  onChange(value);
};

export const handleLetterInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
) => {
  const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase();
  onChange(value);
};

const fieldToTab: Record<string, string> = {
  tipo_documento: 'personal', numero_documento: 'personal', apellido_paterno: 'personal',
  apellido_materno: 'personal', nombres: 'personal', fecha_nacimiento: 'personal',
  sexo: 'personal', estado_civil: 'personal', nacionalidad: 'personal',
  telefono: 'personal', celular: 'personal', email: 'personal',
  direccion: 'personal', referencia: 'personal',
  departamento_id: 'personal', provincia_id: 'personal', distrito_id: 'personal',
  area_id: 'laboral', cargo_id: 'laboral', sede_id: 'laboral',
  fecha_ingreso: 'laboral', fecha_planilla: 'laboral', fecha_cese: 'laboral',
  sueldo_base: 'laboral', tipo_pago: 'laboral', turno: 'laboral',
  regimen_pensionario_id: 'laboral', cuspp: 'laboral',
  asignacion_familiar: 'laboral', sctr: 'laboral', es_mype: 'laboral',
  banco_haberes_id: 'bancario', nro_cuenta_haberes: 'bancario', cci_haberes: 'bancario',
  banco_cts_id: 'bancario', nro_cuenta_cts: 'bancario', cci_cts: 'bancario',
  celular_asignado: 'adicional', email_asignado: 'adicional',
  estatura: 'adicional', peso: 'adicional', categoria_licencia: 'adicional',
};

const validTabs = ['personal', 'laboral', 'bancario', 'adicional', 'documentos'];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEmpleadoEditar() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const empleadoId = params.id as string;

  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'personal';

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showCeseConfirm, setShowCeseConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<EmpleadoFormValues | null>(null);

  const [areas, setAreas] = useState<Area[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [regimenes, setRegimenes] = useState<RegimenPensionario[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [consultandoSbs, setConsultandoSbs] = useState(false);

  const form = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoSchema) as Resolver<EmpleadoFormValues>,
    defaultValues: {
      tipo_documento: 'DNI',
      numero_documento: '',
      apellido_paterno: '',
      apellido_materno: '',
      nombres: '',
      fecha_nacimiento: '',
      sexo: 'M',
      estado_civil: '',
      nacionalidad: 'PERUANA',
      telefono: '',
      celular: '',
      email: '',
      direccion: '',
      referencia: '',
      departamento_id: '',
      provincia_id: '',
      distrito_id: '',
      area_id: '',
      cargo_id: '',
      sede_id: '',
      fecha_ingreso: '',
      fecha_planilla: '',
      fecha_cese: '',
      sueldo_base: 1130,
      tipo_pago: 'PLANILLA',
      turno: 'DIA',
      regimen_pensionario_id: '',
      cuspp: '',
      asignacion_familiar: false,
      sctr: false,
      es_mype: false,
      banco_haberes_id: '',
      nro_cuenta_haberes: '',
      cci_haberes: '',
      banco_cts_id: '',
      nro_cuenta_cts: '',
      cci_cts: '',
      celular_asignado: '',
      email_asignado: '',
      estatura: undefined,
      peso: undefined,
      categoria_licencia: '',
      foto_url: null,
    },
  });

  const selectedAreaId = form.watch('area_id');
  const selectedDepartamentoId = form.watch('departamento_id');
  const selectedProvinciaId = form.watch('provincia_id');
  const watchedFechaCese = form.watch('fecha_cese');

  const isNewCese = !empleado?.fecha_cese && !!watchedFechaCese;

  // ── Load initial data ────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empleadoRes, areasRes, cargosRes, sedesRes, bancosRes, regimenesRes, departamentosRes] =
          await Promise.all([
            api.get<Empleado>(`/empleados/${empleadoId}`),
            api.get<Area[]>('/masters/areas'),
            api.get<Cargo[]>('/masters/cargos'),
            api.get<{ data: Sede[] }>('/sedes?limit=100'),
            api.get<Banco[]>('/masters/bancos'),
            api.get<RegimenPensionario[]>('/masters/regimenes-pensionarios'),
            api.get<Departamento[]>('/masters/departamentos'),
          ]);

        setEmpleado(empleadoRes);
        setAreas(areasRes);
        setCargos(cargosRes);
        setSedes(sedesRes.data);
        setBancos(bancosRes);
        setRegimenes(regimenesRes);
        setDepartamentos(departamentosRes);

        if (empleadoRes.distrito?.provincia?.departamento?.id) {
          const depId = empleadoRes.distrito.provincia.departamento.id;
          const provId = empleadoRes.distrito.provincia.id;
          const [provinciasRes, distritosRes] = await Promise.all([
            api.get<Provincia[]>(`/masters/provincias?departamento_id=${depId}`),
            api.get<Distrito[]>(`/masters/distritos?provincia_id=${provId}`),
          ]);
          setProvincias(provinciasRes);
          setDistritos(distritosRes);
        }

        const formatDate = (date: string | undefined) => (!date ? '' : date.split('T')[0]);
        const onlyDigits = (val: string | null | undefined) => (val ? val.replace(/\D/g, '') : '');

        form.reset({
          tipo_documento: empleadoRes.tipo_documento,
          numero_documento: empleadoRes.numero_documento,
          apellido_paterno: empleadoRes.apellido_paterno,
          apellido_materno: empleadoRes.apellido_materno,
          nombres: empleadoRes.nombres,
          fecha_nacimiento: formatDate(empleadoRes.fecha_nacimiento),
          sexo: empleadoRes.sexo,
          estado_civil: empleadoRes.estado_civil || '',
          nacionalidad: empleadoRes.nacionalidad || 'PERUANA',
          telefono: onlyDigits(empleadoRes.telefono),
          celular: onlyDigits(empleadoRes.celular),
          email: empleadoRes.email || '',
          direccion: empleadoRes.direccion || '',
          referencia: empleadoRes.referencia || '',
          departamento_id: empleadoRes.distrito?.provincia?.departamento?.id?.toString() || '',
          provincia_id: empleadoRes.distrito?.provincia?.id?.toString() || '',
          distrito_id: empleadoRes.distrito_id?.toString() || '',
          area_id: empleadoRes.area_id?.toString() || '',
          cargo_id: empleadoRes.cargo_id?.toString() || '',
          sede_id: empleadoRes.sede_id?.toString() || '',
          fecha_ingreso: formatDate(empleadoRes.fecha_ingreso),
          fecha_planilla: formatDate(empleadoRes.fecha_planilla),
          fecha_cese: formatDate(empleadoRes.fecha_cese),
          sueldo_base: empleadoRes.sueldo_base,
          tipo_pago: empleadoRes.tipo_pago,
          turno: empleadoRes.turno,
          regimen_pensionario_id: empleadoRes.regimen_pensionario_id?.toString() || '',
          cuspp: empleadoRes.cuspp || '',
          asignacion_familiar: empleadoRes.asignacion_familiar,
          sctr: empleadoRes.sctr,
          es_mype: empleadoRes.es_mype,
          banco_haberes_id: empleadoRes.banco_haberes_id?.toString() || '',
          nro_cuenta_haberes: onlyDigits(empleadoRes.nro_cuenta_haberes),
          cci_haberes: onlyDigits(empleadoRes.cci_haberes),
          banco_cts_id: empleadoRes.banco_cts_id?.toString() || '',
          nro_cuenta_cts: onlyDigits(empleadoRes.nro_cuenta_cts),
          cci_cts: onlyDigits(empleadoRes.cci_cts),
          celular_asignado: onlyDigits(empleadoRes.celular_asignado),
          email_asignado: empleadoRes.email_asignado || '',
          estatura: empleadoRes.estatura || undefined,
          peso: empleadoRes.peso || undefined,
          categoria_licencia: empleadoRes.categoria_licencia || '',
          foto_url: empleadoRes.foto_url || null,
        });
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'Error al cargar datos'));
        router.push('/rrhh/empleados');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [empleadoId, router, form]);

  // ── Cascade ubigeo ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProvincias = async () => {
      if (selectedDepartamentoId && !loadingData) {
        try {
          const response = await api.get<Provincia[]>(
            `/masters/provincias?departamento_id=${selectedDepartamentoId}`,
          );
          setProvincias(response);
          if (
            selectedDepartamentoId !==
            empleado?.distrito?.provincia?.departamento?.id?.toString()
          ) {
            form.setValue('provincia_id', '');
            form.setValue('distrito_id', '');
            setDistritos([]);
          }
        } catch (error) {
          console.error('Error fetching provincias:', error);
        }
      }
    };
    fetchProvincias();
  }, [selectedDepartamentoId, loadingData, empleado?.distrito?.provincia?.departamento?.id, form]);

  useEffect(() => {
    const fetchDistritos = async () => {
      if (selectedProvinciaId && !loadingData) {
        try {
          const response = await api.get<Distrito[]>(
            `/masters/distritos?provincia_id=${selectedProvinciaId}`,
          );
          setDistritos(response);
          if (selectedProvinciaId !== empleado?.distrito?.provincia?.id?.toString()) {
            form.setValue('distrito_id', '');
          }
        } catch (error) {
          console.error('Error fetching distritos:', error);
        }
      }
    };
    fetchDistritos();
  }, [selectedProvinciaId, loadingData, empleado?.distrito?.provincia?.id, form]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const onFormError = useCallback(
    (errors: FieldErrors<EmpleadoFormValues>) => {
      const firstErrorField = Object.keys(errors)[0] as keyof EmpleadoFormValues | undefined;
      if (firstErrorField) {
        const tab = fieldToTab[firstErrorField];
        if (tab) setActiveTab(tab);
        const errorMessage = errors[firstErrorField]?.message;
        toast.error(
          errorMessage
            ? `${firstErrorField}: ${errorMessage}`
            : 'Hay campos con errores de validación',
        );
      }
    },
    [],
  );

  const handleConsultarSbs = async () => {
    const tipoDoc = form.getValues('tipo_documento');
    const numDoc = form.getValues('numero_documento');
    const apellidoPaterno = form.getValues('apellido_paterno');
    const apellidoMaterno = form.getValues('apellido_materno');
    const nombres = form.getValues('nombres');

    if (!numDoc || numDoc.length < 8) {
      toast.error('Ingrese un numero de documento valido (minimo 8 digitos)');
      return;
    }
    if (!apellidoPaterno || !apellidoMaterno || !nombres) {
      toast.error('Complete los apellidos y nombres antes de consultar');
      return;
    }
    if (tipoDoc !== 'DNI' && tipoDoc !== 'CE') {
      toast.error('La consulta SBS solo esta disponible para DNI y CE');
      return;
    }

    setConsultandoSbs(true);
    try {
      const result = await api.post<SbsConsultaResult>('/empleados/consultar-sbs', {
        tipo_documento: tipoDoc,
        numero_documento: numDoc,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        nombres,
      });

      if (result.afp && result.regimen_pensionario_id) {
        form.setValue('regimen_pensionario_id', result.regimen_pensionario_id.toString());
        toast.success(`AFP encontrada: ${result.afp}`);
      } else if (result.afp) {
        toast.warning(`AFP ${result.afp} no encontrada en el sistema. Seleccione manualmente.`);
      } else {
        toast.info(result.mensaje || 'No se encontro informacion de afiliacion');
      }

      if (result.cuspp) {
        form.setValue('cuspp', result.cuspp);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al consultar SBS'));
    } finally {
      setConsultandoSbs(false);
    }
  };

  const onSubmit = async (data: EmpleadoFormValues) => {
    const isAddingCese = !empleado?.fecha_cese && !!data.fecha_cese;
    if (isAddingCese && !showCeseConfirm) {
      setPendingSubmitData(data);
      setShowCeseConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        area_id: data.area_id ? parseInt(data.area_id) : null,
        cargo_id: data.cargo_id ? parseInt(data.cargo_id) : null,
        sede_id: data.sede_id ? parseInt(data.sede_id) : null,
        banco_haberes_id: data.banco_haberes_id ? parseInt(data.banco_haberes_id) : null,
        banco_cts_id: data.banco_cts_id ? parseInt(data.banco_cts_id) : null,
        regimen_pensionario_id: data.regimen_pensionario_id
          ? parseInt(data.regimen_pensionario_id)
          : null,
        distrito_id: data.distrito_id ? parseInt(data.distrito_id) : null,
        fecha_cese: data.fecha_cese || null,
        foto_url: data.foto_url || null,
        departamento_id: undefined,
        provincia_id: undefined,
      };

      await api.patch(`/empleados/${empleadoId}`, payload);
      toast.success('Empleado actualizado correctamente');
      router.push(`/rrhh/empleados/${empleadoId}`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar empleado'));
    } finally {
      setLoading(false);
      setShowCeseConfirm(false);
      setPendingSubmitData(null);
    }
  };

  const handleConfirmCese = () => {
    if (pendingSubmitData) onSubmit(pendingSubmitData);
  };

  const handleCancelCese = () => {
    setShowCeseConfirm(false);
    setPendingSubmitData(null);
    form.setValue('fecha_cese', '');
  };

  const nombreCompleto = empleado
    ? `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`
    : '';

  return {
    form,
    empleadoId,
    empleado,
    loading,
    loadingData,
    activeTab,
    setActiveTab,
    showCeseConfirm,
    setShowCeseConfirm,
    pendingSubmitData,
    // Masters
    areas,
    cargos,
    sedes,
    bancos,
    regimenes,
    departamentos,
    provincias,
    distritos,
    // Watchers
    selectedAreaId,
    selectedDepartamentoId,
    selectedProvinciaId,
    isNewCese,
    // Handlers
    onSubmit,
    onFormError,
    handleConsultarSbs,
    handleConfirmCese,
    handleCancelCese,
    consultandoSbs,
    nombreCompleto,
  };
}
