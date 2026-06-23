'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Area, Cargo, Banco, Sede, SbsConsultaResult, Empleado } from '@/types';
import { toast } from 'sonner';
import { useEmpresa } from '@/hooks/useEmpresa';

// Tipos para ubigeos
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

// Validaciones personalizadas
export const soloNumeros = (value: string) => /^\d*$/.test(value);
export const soloLetras = (value: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value);

export const empleadoSchema = z.object({
  // Foto
  foto_url: z.string().optional(),
  // Datos personales
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
  // Dirección
  direccion: z.string().optional(),
  referencia: z.string().optional(),
  departamento_id: z.string().optional(),
  provincia_id: z.string().optional(),
  distrito_id: z.string().optional(),
  // Datos laborales
  area_id: z.string().optional(),
  cargo_id: z.string().optional(),
  sede_id: z.string().optional(),
  fecha_ingreso: z.string().min(1, 'Requerido'),
  fecha_planilla: z.string().optional(),
  sueldo_base: z.coerce.number().min(0, 'Debe ser mayor a 0'),
  tipo_pago: z.enum(['PLANILLA', 'RECIBO']),
  turno: z.enum(['DIA', 'NOCHE']),
  // Pensiones
  regimen_pensionario_id: z.string().optional(),
  cuspp: z.string().optional(),
  // Beneficios
  asignacion_familiar: z.boolean(),
  sctr: z.boolean(),
  es_mype: z.boolean(),
  // Bancos
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
  // Contacto asignado
  celular_asignado: z
    .string()
    .optional()
    .refine((val) => !val || /^\d*$/.test(val), 'Solo números'),
  email_asignado: z.string().email('Email inválido').optional().or(z.literal('')),
  // Datos físicos
  estatura: z.coerce.number().optional(),
  peso: z.coerce.number().optional(),
  categoria_licencia: z.string().optional(),
});

export type EmpleadoFormValues = z.infer<typeof empleadoSchema>;

// Helper para permitir solo números en inputs
export const handleNumericInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
) => {
  const value = e.target.value.replace(/\D/g, '');
  onChange(value);
};

// Helper para permitir solo letras en inputs
export const handleLetterInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
) => {
  const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').toUpperCase();
  onChange(value);
};

export function useEmpleadoNuevo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [regimenes, setRegimenes] = useState<RegimenPensionario[]>([]);

  // Estados para modal de exito
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdEmpleado, setCreatedEmpleado] = useState<Empleado | null>(null);
  const [photocheckOpen, setPhotocheckOpen] = useState(false);

  // Estado para consulta SBS
  const [consultandoSbs, setConsultandoSbs] = useState(false);

  // Datos de empresa para photocheck
  const { empresa } = useEmpresa();

  // Ubigeos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);

  const form = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoSchema) as Resolver<EmpleadoFormValues>,
    defaultValues: {
      foto_url: '',
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
    },
  });

  const selectedDepartamentoId = form.watch('departamento_id');
  const selectedProvinciaId = form.watch('provincia_id');

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [areasRes, cargosRes, sedesRes, bancosRes, regimenesRes, departamentosRes] =
          await Promise.all([
            api.get<Area[]>('/masters/areas'),
            api.get<Cargo[]>('/masters/cargos'),
            api.get<{ data: Sede[] }>('/sedes?limit=100'),
            api.get<Banco[]>('/masters/bancos'),
            api.get<RegimenPensionario[]>('/masters/regimenes-pensionarios'),
            api.get<Departamento[]>('/masters/departamentos'),
          ]);
        setAreas(areasRes);
        setCargos(cargosRes);
        setSedes(sedesRes.data);
        setBancos(bancosRes);
        setRegimenes(regimenesRes);
        setDepartamentos(departamentosRes);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Cargar provincias cuando cambia el departamento
  useEffect(() => {
    const fetchProvincias = async () => {
      if (selectedDepartamentoId) {
        try {
          const response = await api.get<Provincia[]>(
            `/masters/provincias?departamento_id=${selectedDepartamentoId}`,
          );
          setProvincias(response);
          form.setValue('provincia_id', '');
          form.setValue('distrito_id', '');
          setDistritos([]);
        } catch (error) {
          console.error('Error fetching provincias:', error);
        }
      } else {
        setProvincias([]);
        setDistritos([]);
      }
    };
    fetchProvincias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartamentoId]);

  // Cargar distritos cuando cambia la provincia
  useEffect(() => {
    const fetchDistritos = async () => {
      if (selectedProvinciaId) {
        try {
          const response = await api.get<Distrito[]>(
            `/masters/distritos?provincia_id=${selectedProvinciaId}`,
          );
          setDistritos(response);
          form.setValue('distrito_id', '');
        } catch (error) {
          console.error('Error fetching distritos:', error);
        }
      } else {
        setDistritos([]);
      }
    };
    fetchDistritos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvinciaId]);

  // Consultar SBS para obtener AFP y CUSPP
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
        nombres: nombres,
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
    setLoading(true);
    try {
      const payload = {
        ...data,
        foto_url: data.foto_url || undefined,
        area_id: data.area_id ? parseInt(data.area_id) : undefined,
        cargo_id: data.cargo_id ? parseInt(data.cargo_id) : undefined,
        sede_id: data.sede_id ? parseInt(data.sede_id) : undefined,
        banco_haberes_id: data.banco_haberes_id ? parseInt(data.banco_haberes_id) : undefined,
        banco_cts_id: data.banco_cts_id ? parseInt(data.banco_cts_id) : undefined,
        regimen_pensionario_id: data.regimen_pensionario_id
          ? parseInt(data.regimen_pensionario_id)
          : undefined,
        distrito_id: data.distrito_id ? parseInt(data.distrito_id) : undefined,
        // Eliminar campos que ya no existen en el modelo
        departamento_id: undefined,
        provincia_id: undefined,
      };

      const response = await api.post<Empleado>('/empleados', payload);

      // Obtener el empleado completo con relaciones para el photocheck
      const empleadoCompleto = await api.get<Empleado>(`/empleados/${response.id}`);

      setCreatedEmpleado(empleadoCompleto);
      setSuccessDialogOpen(true);
      toast.success('Empleado creado correctamente');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al crear empleado'));
    } finally {
      setLoading(false);
    }
  };

  return {
    // Form
    form,
    loading,
    onSubmit,
    // Maestros
    areas,
    cargos,
    sedes,
    bancos,
    regimenes,
    // Ubigeos
    departamentos,
    provincias,
    distritos,
    selectedDepartamentoId,
    selectedProvinciaId,
    // SBS
    consultandoSbs,
    handleConsultarSbs,
    // Dialogs
    successDialogOpen,
    setSuccessDialogOpen,
    createdEmpleado,
    photocheckOpen,
    setPhotocheckOpen,
    // Empresa
    empresa,
    // Router
    router,
  };
}
