'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateSafe, parseDateLocal } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';

interface Empleado {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
  area?: { nombre: string };
}

interface PeriodoVacacional {
  id: number;
  numero_periodo: number;
  fecha_inicio_periodo: string;
  fecha_fin_periodo: string;
  fecha_limite_goce: string;
  dias_correspondientes: number;
  dias_gozados: number;
  dias_vendidos: number;
  dias_pendientes: number;
  estado: string;
}

interface SaldoResponse {
  periodos: PeriodoVacacional[];
  total_disponible: number;
  total_periodos: number;
}

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empleadoIdParam = searchParams.get('empleado');

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [empleadoId, setEmpleadoId] = useState(empleadoIdParam || '');
  const [saldo, setSaldo] = useState<SaldoResponse | null>(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [periodoId, setPeriodoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [diasSolicitados, setDiasSolicitados] = useState(0);
  const [incluyeVenta, setIncluyeVenta] = useState(false);
  const [diasVenta, setDiasVenta] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  // Cargar empleados activos
  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const response = await api.get<{ data: Empleado[] }>('/empleados?estado=ACTIVO&limit=500');
        setEmpleados(response.data);
      } catch (error) {
        console.error('Error fetching empleados:', error);
        toast.error('Error al cargar empleados');
      } finally {
        setLoadingEmpleados(false);
      }
    };
    fetchEmpleados();
  }, []);

  // Cargar saldo cuando se selecciona empleado
  useEffect(() => {
    if (!empleadoId) {
      setSaldo(null);
      return;
    }

    const fetchSaldo = async () => {
      setLoadingSaldo(true);
      try {
        const response = await api.get<SaldoResponse>(`/vacaciones/saldo/${empleadoId}`);
        setSaldo(response);

        // Si hay períodos disponibles, seleccionar el primero
        if (response.periodos.length > 0) {
          setPeriodoId(response.periodos[0].id.toString());
        }
      } catch (error: unknown) {
        console.error('Error fetching saldo:', error);
        // Si no hay períodos, intentar generarlos
        if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) {
          try {
            await api.post(`/vacaciones/periodos/generar/${empleadoId}`, {});
            // Reintentar obtener saldo
            const response = await api.get<SaldoResponse>(`/vacaciones/saldo/${empleadoId}`);
            setSaldo(response);
            if (response.periodos.length > 0) {
              setPeriodoId(response.periodos[0].id.toString());
            }
          } catch {
            toast.error('Error al generar períodos vacacionales');
          }
        }
      } finally {
        setLoadingSaldo(false);
      }
    };

    fetchSaldo();
  }, [empleadoId]);

  // Calcular días cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const inicio = parseDateLocal(fechaInicio);
      const fin = parseDateLocal(fechaFin);
      const diffTime = fin.getTime() - inicio.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDiasSolicitados(diffDays > 0 ? diffDays : 0);
    } else {
      setDiasSolicitados(0);
    }
  }, [fechaInicio, fechaFin]);

  const periodoSeleccionado = saldo?.periodos.find((p) => p.id.toString() === periodoId);
  const maxVenta = periodoSeleccionado
    ? Math.floor(periodoSeleccionado.dias_correspondientes * 0.5) - periodoSeleccionado.dias_vendidos
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empleadoId || !periodoId || !fechaInicio || !fechaFin) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    if (diasSolicitados <= 0) {
      toast.error('Las fechas son inválidas');
      return;
    }

    if (periodoSeleccionado && diasSolicitados > periodoSeleccionado.dias_pendientes) {
      toast.error(`Solo tiene ${periodoSeleccionado.dias_pendientes} días disponibles`);
      return;
    }

    setSaving(true);
    try {
      await api.post('/vacaciones/solicitudes', {
        empleado_id: parseInt(empleadoId),
        periodo_vacacional_id: parseInt(periodoId),
        fecha_inicio_solicitada: fechaInicio,
        fecha_fin_solicitada: fechaFin,
        dias_solicitados: diasSolicitados,
        incluye_venta: incluyeVenta,
        dias_venta: incluyeVenta ? diasVenta : 0,
        observaciones,
      });
      toast.success('Solicitud registrada correctamente');
      router.push('/rrhh/vacaciones/solicitudes');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al registrar la solicitud'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Nueva Solicitud de Vacaciones</h1>
          <p className="text-sm text-muted-foreground">
            Registra una solicitud de vacaciones para un empleado
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Selección de Empleado */}
          <Card>
            <CardHeader>
              <CardTitle>Empleado</CardTitle>
              <CardDescription>Selecciona el empleado que solicita vacaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingEmpleados ? 'Cargando...' : 'Seleccionar empleado'} />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.apellido_paterno} {emp.apellido_materno}, {emp.nombres} - {emp.numero_documento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Período Vacacional */}
          {empleadoId && (
            <Card>
              <CardHeader>
                <CardTitle>Período Vacacional</CardTitle>
                <CardDescription>Selecciona el período del cual tomará las vacaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSaldo ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : saldo?.periodos.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="h-5 w-5" />
                    <span>Este empleado no tiene períodos vacacionales disponibles</span>
                  </div>
                ) : (
                  <Select value={periodoId} onValueChange={setPeriodoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      {saldo?.periodos.map((periodo) => (
                        <SelectItem key={periodo.id} value={periodo.id.toString()}>
                          Período {periodo.numero_periodo} - {periodo.dias_pendientes} días disponibles
                          (Vence: {formatDateSafe(periodo.fecha_limite_goce)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fechas */}
          {periodoId && (
            <Card>
              <CardHeader>
                <CardTitle>Fechas de Vacaciones</CardTitle>
                <CardDescription>Indica el período de vacaciones solicitado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_inicio">Fecha de inicio *</Label>
                    <Input
                      id="fecha_inicio"
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_fin">Fecha de fin *</Label>
                    <Input
                      id="fecha_fin"
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      min={fechaInicio}
                      required
                    />
                  </div>
                </div>

                {diasSolicitados > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">{diasSolicitados} días calendario</span>
                    {periodoSeleccionado && diasSolicitados > periodoSeleccionado.dias_pendientes && (
                      <span className="text-red-500 text-sm ml-auto">
                        Excede los {periodoSeleccionado.dias_pendientes} días disponibles
                      </span>
                    )}
                  </div>
                )}

                {/* Venta de vacaciones */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="incluye_venta"
                      checked={incluyeVenta}
                      onCheckedChange={(checked) => setIncluyeVenta(checked as boolean)}
                    />
                    <Label htmlFor="incluye_venta">Incluir venta de vacaciones</Label>
                  </div>

                  {incluyeVenta && (
                    <div className="space-y-2">
                      <Label htmlFor="dias_venta">Días a vender (máx. {maxVenta})</Label>
                      <Input
                        id="dias_venta"
                        type="number"
                        min={0}
                        max={maxVenta}
                        value={diasVenta}
                        onChange={(e) => setDiasVenta(parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Por ley, solo puede vender hasta el 50% de las vacaciones de cada período
                      </p>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    placeholder="Observaciones adicionales..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna Lateral - Resumen */}
        <div className="space-y-4 md:space-y-6">
          {/* Saldo del Empleado */}
          {saldo && (
            <Card>
              <CardHeader>
                <CardTitle>Saldo de Vacaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{saldo.total_disponible}</p>
                  <p className="text-sm text-muted-foreground">días disponibles en total</p>
                </div>

                {saldo.periodos.map((periodo) => (
                  <div
                    key={periodo.id}
                    className={`p-3 rounded-lg border ${
                      periodo.id.toString() === periodoId ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <p className="font-medium">Período {periodo.numero_periodo}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Ganados:</span>
                        <span className="ml-1">{periodo.dias_correspondientes}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gozados:</span>
                        <span className="ml-1">{periodo.dias_gozados}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendidos:</span>
                        <span className="ml-1">{periodo.dias_vendidos}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pendientes:</span>
                        <span className="ml-1 font-medium text-primary">{periodo.dias_pendientes}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Vence: {formatDateSafe(periodo.fecha_limite_goce)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={saving || !empleadoId || !periodoId || diasSolicitados <= 0}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Solicitud
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
