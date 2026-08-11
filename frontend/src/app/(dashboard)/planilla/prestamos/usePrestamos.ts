'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

export type TipoPrestamo =
  | 'PRESTAMO'
  | 'ADELANTO_SUELDO'
  | 'ADELANTO_GRATIFICACION';

export type EstadoPrestamo = 'ACTIVO' | 'PAGADO' | 'CANCELADO';

export type TipoMovimientoPrestamo =
  | 'CARGO_PLANILLA'
  | 'ABONO_MANUAL'
  | 'AJUSTE';

export interface MovimientoPrestamo {
  id: number;
  planilla_id: number | null;
  monto: string;
  tipo: TipoMovimientoPrestamo;
  fecha: string;
  observaciones: string | null;
}

export interface ArchivoPrestamo {
  id: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo: string | null;
  archivo_tamano: number | null;
  created_at: string;
}

export interface EmpleadoDePrestamo {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
}

export interface Prestamo {
  id: number;
  empleado_id: number;
  tipo: TipoPrestamo;
  monto_total: string | null;
  cuota_mensual: string;
  saldo: string | null;
  estado: EstadoPrestamo;
  fecha_otorgado: string;
  observaciones: string | null;
  empleado: EmpleadoDePrestamo;
  movimientos: MovimientoPrestamo[];
  archivos: ArchivoPrestamo[];
}

interface RespuestaPrestamos {
  data: Prestamo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const TIPO_ETIQUETA: Record<TipoPrestamo, string> = {
  PRESTAMO: 'Préstamo',
  ADELANTO_SUELDO: 'Adelanto de sueldo',
  ADELANTO_GRATIFICACION: 'Adelanto de gratificación',
};

export const TIPO_DESCRIPCION: Record<TipoPrestamo, string> = {
  PRESTAMO: 'Se descuenta todos los meses hasta cancelar el saldo.',
  ADELANTO_SUELDO: 'Se descuenta como adelanto de quincena todos los meses.',
  ADELANTO_GRATIFICACION:
    'Se descuenta únicamente en las planillas de julio y diciembre.',
};

export const MOVIMIENTO_ETIQUETA: Record<TipoMovimientoPrestamo, string> = {
  CARGO_PLANILLA: 'Descuento en planilla',
  ABONO_MANUAL: 'Abono manual',
  AJUSTE: 'Ajuste de saldo',
};

export const ESTADO_ETIQUETA: Record<EstadoPrestamo, string> = {
  ACTIVO: 'Activo',
  PAGADO: 'Pagado',
  CANCELADO: 'Cancelado',
};

export const ESTADO_COLOR: Record<EstadoPrestamo, string> = {
  ACTIVO: 'bg-blue-100 text-blue-800',
  PAGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-gray-100 text-gray-800',
};

const TODOS = 'TODOS';

/** Espejo de ALLOWED_EXTENSIONS del backend (uploads.config.ts). */
export const EXTENSIONES_ACEPTADAS =
  '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';

/**
 * `z.custom` guarda el predicado sin evaluar `File` al cargar el módulo, así que
 * es seguro durante el render en servidor (donde `File` no existe).
 */
const esArchivo = z.custom<File>((valor) => valor instanceof File, {
  message: 'Archivo inválido',
});

/**
 * El convenio firmado solo se exige al OTORGAR. Al editar únicamente se tocan
 * la cuota y las observaciones, así que no se vuelve a pedir el documento.
 */
function construirEsquemaPrestamo(exigeConvenio: boolean) {
  return z
    .object({
      empleado_id: z.coerce.number().int().positive('Selecciona un trabajador'),
      tipo: z.enum(['PRESTAMO', 'ADELANTO_SUELDO', 'ADELANTO_GRATIFICACION']),
      monto_total: z.string().optional(),
      cuota_mensual: z.coerce
        .number()
        .positive('La cuota debe ser mayor a 0')
        .max(999999.99, 'Monto fuera de rango'),
      fecha_otorgado: z.string().min(1, 'Indica la fecha de otorgamiento'),
      observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
      archivos: exigeConvenio
        ? z
            .array(esArchivo)
            .min(1, 'Adjunta el convenio de descuento firmado por el trabajador')
        : z.array(esArchivo),
    })
    .refine(
      (valores) => {
        if (!valores.monto_total) return true;
        const total = Number(valores.monto_total);
        return Number.isFinite(total) && total > 0;
      },
      { message: 'El monto total debe ser mayor a 0', path: ['monto_total'] },
    )
    .refine(
      (valores) => {
        if (!valores.monto_total) return true;
        const total = Number(valores.monto_total);
        return !Number.isFinite(total) || valores.cuota_mensual <= total;
      },
      {
        message: 'La cuota no puede superar el monto total',
        path: ['cuota_mensual'],
      },
    );
}

export const prestamoCrearSchema = construirEsquemaPrestamo(true);
export const prestamoEditarSchema = construirEsquemaPrestamo(false);

export type PrestamoFormValues = z.infer<typeof prestamoCrearSchema>;

const resolverCrear = zodResolver(
  prestamoCrearSchema,
) as Resolver<PrestamoFormValues>;
const resolverEditar = zodResolver(
  prestamoEditarSchema,
) as Resolver<PrestamoFormValues>;

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const VALORES_INICIALES: PrestamoFormValues = {
  empleado_id: 0,
  tipo: 'PRESTAMO',
  monto_total: '',
  cuota_mensual: 0,
  fecha_otorgado: hoyISO(),
  observaciones: '',
  archivos: [],
};

export function usePrestamos() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [dialogoCancelarAbierto, setDialogoCancelarAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Prestamo | null>(null);
  const [nombreEmpleado, setNombreEmpleado] = useState('');
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [dialogoAdjuntarAbierto, setDialogoAdjuntarAbierto] = useState(false);
  const [adjuntando, setAdjuntando] = useState(false);

  const [filtroBuscar, setFiltroBuscar] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>(TODOS);
  const [filtroEstado, setFiltroEstado] = useState<string>('ACTIVO');

  // El resolver se elige en cada validación: al editar no se exige el convenio.
  // Va por ref para que el `useForm` no arrastre el modo del primer render.
  const modoEdicionRef = useRef(false);

  const form = useForm<PrestamoFormValues>({
    resolver: (valores, contexto, opciones) =>
      (modoEdicionRef.current ? resolverEditar : resolverCrear)(
        valores,
        contexto,
        opciones,
      ),
    defaultValues: VALORES_INICIALES,
  });

  const cargarPrestamos = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filtroBuscar.trim()) params.set('buscar', filtroBuscar.trim());
      if (filtroTipo !== TODOS) params.set('tipo', filtroTipo);
      if (filtroEstado !== TODOS) params.set('estado', filtroEstado);

      const respuesta = await api.get<RespuestaPrestamos>(
        `/prestamos?${params.toString()}`,
      );
      setPrestamos(respuesta.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron cargar los préstamos'));
    } finally {
      setCargando(false);
    }
  }, [filtroBuscar, filtroTipo, filtroEstado]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargarPrestamos();
    }, 250);
    return () => clearTimeout(timer);
  }, [cargarPrestamos]);

  const alternarDetalle = (id: number) => {
    setExpandidos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }
      return siguiente;
    });
  };

  const abrirDialogoNuevo = () => {
    modoEdicionRef.current = false;
    setSeleccionado(null);
    setNombreEmpleado('');
    form.reset({ ...VALORES_INICIALES, fecha_otorgado: hoyISO() });
    setDialogoAbierto(true);
  };

  const abrirDialogoEdicion = (prestamo: Prestamo) => {
    modoEdicionRef.current = true;
    setSeleccionado(prestamo);
    setNombreEmpleado(
      `${prestamo.empleado.apellido_paterno} ${prestamo.empleado.apellido_materno}, ${prestamo.empleado.nombres}`,
    );
    form.reset({
      empleado_id: prestamo.empleado_id,
      tipo: prestamo.tipo,
      monto_total: prestamo.monto_total ?? '',
      cuota_mensual: Number(prestamo.cuota_mensual),
      fecha_otorgado: prestamo.fecha_otorgado.slice(0, 10),
      observaciones: prestamo.observaciones ?? '',
      archivos: [],
    });
    setDialogoAbierto(true);
  };

  const abrirDialogoCancelar = (prestamo: Prestamo) => {
    setSeleccionado(prestamo);
    setDialogoCancelarAbierto(true);
  };

  const abrirDialogoAdjuntar = (prestamo: Prestamo) => {
    setSeleccionado(prestamo);
    setDialogoAdjuntarAbierto(true);
  };

  const guardar = async (valores: PrestamoFormValues) => {
    setGuardando(true);
    try {
      if (seleccionado) {
        // Editar: solo la cuota y las observaciones son modificables.
        await api.patch(`/prestamos/${seleccionado.id}`, {
          cuota_mensual: valores.cuota_mensual,
          observaciones: valores.observaciones || undefined,
        });
        toast.success('Préstamo actualizado');
      } else {
        // El alta es multipart: el convenio firmado viaja con el préstamo.
        const datos = new FormData();
        datos.append('empleado_id', String(valores.empleado_id));
        datos.append('tipo', valores.tipo);
        datos.append('cuota_mensual', String(valores.cuota_mensual));
        datos.append('fecha_otorgado', valores.fecha_otorgado);
        if (valores.monto_total) datos.append('monto_total', valores.monto_total);
        if (valores.observaciones) {
          datos.append('observaciones', valores.observaciones);
        }
        valores.archivos.forEach((archivo) => datos.append('files', archivo));

        await api.upload('/prestamos', datos);
        toast.success('Préstamo registrado');
      }
      setDialogoAbierto(false);
      await cargarPrestamos();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo guardar el préstamo'));
    } finally {
      setGuardando(false);
    }
  };

  /** Regularización: sube el convenio de un préstamo que se registró sin él. */
  const adjuntarArchivos = async (archivos: File[]) => {
    if (!seleccionado || archivos.length === 0) return;
    setAdjuntando(true);
    try {
      const datos = new FormData();
      archivos.forEach((archivo) => datos.append('files', archivo));

      await api.upload(`/prestamos/${seleccionado.id}/archivos`, datos);
      toast.success('Documento adjuntado');
      setDialogoAdjuntarAbierto(false);
      setSeleccionado(null);
      await cargarPrestamos();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'No se pudo adjuntar el documento'),
      );
    } finally {
      setAdjuntando(false);
    }
  };

  const confirmarCancelacion = async () => {
    if (!seleccionado) return;
    try {
      await api.patch(`/prestamos/${seleccionado.id}/cancelar`, {});
      toast.success('Préstamo cancelado');
      setDialogoCancelarAbierto(false);
      setSeleccionado(null);
      await cargarPrestamos();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo cancelar el préstamo'));
    }
  };

  return {
    prestamos,
    cargando,
    guardando,
    dialogoAbierto,
    setDialogoAbierto,
    dialogoCancelarAbierto,
    setDialogoCancelarAbierto,
    seleccionado,
    nombreEmpleado,
    expandidos,
    alternarDetalle,
    dialogoAdjuntarAbierto,
    setDialogoAdjuntarAbierto,
    adjuntando,
    abrirDialogoAdjuntar,
    adjuntarArchivos,
    filtroBuscar,
    setFiltroBuscar,
    filtroTipo,
    setFiltroTipo,
    filtroEstado,
    setFiltroEstado,
    form,
    abrirDialogoNuevo,
    abrirDialogoEdicion,
    abrirDialogoCancelar,
    guardar,
    confirmarCancelacion,
  };
}
