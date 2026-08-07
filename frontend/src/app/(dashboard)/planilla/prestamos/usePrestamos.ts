'use client';

import { useCallback, useEffect, useState } from 'react';
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

export const prestamoSchema = z
  .object({
    empleado_id: z.coerce
      .number()
      .int()
      .positive('Selecciona un trabajador'),
    tipo: z.enum(['PRESTAMO', 'ADELANTO_SUELDO', 'ADELANTO_GRATIFICACION']),
    monto_total: z.string().optional(),
    cuota_mensual: z.coerce
      .number()
      .positive('La cuota debe ser mayor a 0')
      .max(999999.99, 'Monto fuera de rango'),
    fecha_otorgado: z.string().min(1, 'Indica la fecha de otorgamiento'),
    observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
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

export type PrestamoFormValues = z.infer<typeof prestamoSchema>;

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
};

export function usePrestamos() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [dialogoCancelarAbierto, setDialogoCancelarAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Prestamo | null>(null);
  const [nombreEmpleado, setNombreEmpleado] = useState('');

  const [filtroBuscar, setFiltroBuscar] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>(TODOS);
  const [filtroEstado, setFiltroEstado] = useState<string>('ACTIVO');

  const form = useForm<PrestamoFormValues>({
    resolver: zodResolver(prestamoSchema) as Resolver<PrestamoFormValues>,
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

  const abrirDialogoNuevo = () => {
    setSeleccionado(null);
    setNombreEmpleado('');
    form.reset({ ...VALORES_INICIALES, fecha_otorgado: hoyISO() });
    setDialogoAbierto(true);
  };

  const abrirDialogoEdicion = (prestamo: Prestamo) => {
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
    });
    setDialogoAbierto(true);
  };

  const abrirDialogoCancelar = (prestamo: Prestamo) => {
    setSeleccionado(prestamo);
    setDialogoCancelarAbierto(true);
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
        await api.post('/prestamos', {
          empleado_id: valores.empleado_id,
          tipo: valores.tipo,
          monto_total: valores.monto_total
            ? Number(valores.monto_total)
            : undefined,
          cuota_mensual: valores.cuota_mensual,
          fecha_otorgado: valores.fecha_otorgado,
          observaciones: valores.observaciones || undefined,
        });
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
