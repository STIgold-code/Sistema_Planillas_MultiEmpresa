import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api, getAccessToken } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

// Tipos de configuración
interface ConfiguracionTareo {
  tiempo_limite_minutos: number;
  requiere_corrector: boolean;
  sesiones_por_dia: number;
  sesiones_por_periodo: number | null;
  dias_post_cierre: number;
  hora_limite_diaria: string | null;
  requiere_aprobacion_extension: boolean;
  max_extensiones_periodo: number;
  notificar_email: boolean;
  notificar_sistema: boolean;
}

export interface SesionTareoResponse {
  id: number;
  periodo_id: number;
  usuario_id: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  tiempo_limite_minutos: number;
  estado: 'ACTIVA' | 'FINALIZADA' | 'EXPIRADA' | 'CORRECTOR';
  tiempo_restante_segundos: number;
  puede_editar: boolean;
}

interface EstadoSesionResponse {
  sesion: SesionTareoResponse | null;
  es_admin: boolean;
  es_corrector: boolean;
  requiere_sesion: boolean;
}

interface SolicitudExtension {
  id: number;
  periodo_id: number;
  motivo: string;
  tiempo_solicitado_min: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fecha_solicitud: string;
  fecha_respuesta: string | null;
  comentario_respuesta: string | null;
}

interface VerificacionInicioResponse {
  puede: boolean;
  motivo?: string;
}

interface UseSesionTareoReturn {
  // Estado de sesión
  sesion: SesionTareoResponse | null;
  esAdmin: boolean;
  esCorrector: boolean;
  requiereSesion: boolean;
  puedeEditar: boolean;
  tiempoRestante: number;
  tiempoFormateado: string;
  cargando: boolean;
  error: string | null;

  // Configuración
  configuracion: ConfiguracionTareo | null;

  // Verificación de inicio
  puedeIniciarSesion: boolean;
  motivoNoInicio: string | null;

  // Solicitudes de extensión
  solicitudPendiente: SolicitudExtension | null;
  misSolicitudes: SolicitudExtension[];

  // Acciones
  iniciarSesion: () => Promise<void>;
  finalizarSesion: () => Promise<void>;
  solicitarExtension: (motivo: string, tiempoMin?: number) => Promise<void>;
  refrescar: () => Promise<void>;
  cargarMisSolicitudes: () => Promise<void>;
}

export function useSesionTareo(periodoId: number | null): UseSesionTareoReturn {
  const [sesion, setSesion] = useState<SesionTareoResponse | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [esCorrector, setEsCorrector] = useState(false);
  const [requiereSesion, setRequiereSesion] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nuevos estados
  const [configuracion, setConfiguracion] = useState<ConfiguracionTareo | null>(null);
  const [puedeIniciarSesion, setPuedeIniciarSesion] = useState(true);
  const [motivoNoInicio, setMotivoNoInicio] = useState<string | null>(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudExtension | null>(null);
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudExtension[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Formatear tiempo restante
  const tiempoFormateado = useMemo(() => {
    if (tiempoRestante < 0) return 'Sin límite';
    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }, [tiempoRestante]);

  // Obtener configuración
  const obtenerConfiguracion = useCallback(async () => {
    try {
      const response = await api.get<ConfiguracionTareo>('/tareo/sesiones/configuracion');
      setConfiguracion(response);
    } catch (err) {
      console.error('Error al obtener configuración:', err);
    }
  }, []);

  // Verificar si puede iniciar sesión
  const verificarPuedeIniciar = useCallback(async () => {
    if (!periodoId) return;

    try {
      const response = await api.get<VerificacionInicioResponse>(
        `/tareo/sesiones/periodo/${periodoId}/puede-iniciar`
      );
      setPuedeIniciarSesion(response.puede);
      setMotivoNoInicio(response.motivo || null);
    } catch (err) {
      console.error('Error al verificar inicio:', err);
    }
  }, [periodoId]);

  // Verificar solicitud pendiente
  const verificarSolicitudPendiente = useCallback(async () => {
    if (!periodoId) return;

    try {
      const response = await api.get<{ pendiente: boolean }>(
        `/tareo/extensiones/periodo/${periodoId}/pendiente`
      );

      if (response.pendiente) {
        // Cargar detalles de mis solicitudes para obtener la pendiente
        const solicitudes = await api.get<SolicitudExtension[]>('/tareo/extensiones/mis-solicitudes');
        const pendiente = solicitudes.find(
          s => s.periodo_id === periodoId && s.estado === 'PENDIENTE'
        );
        setSolicitudPendiente(pendiente || null);
      } else {
        setSolicitudPendiente(null);
      }
    } catch (err) {
      console.error('Error al verificar solicitud pendiente:', err);
    }
  }, [periodoId]);

  // Cargar mis solicitudes
  const cargarMisSolicitudes = useCallback(async () => {
    try {
      const response = await api.get<SolicitudExtension[]>('/tareo/extensiones/mis-solicitudes');
      setMisSolicitudes(response);
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
    }
  }, []);

  // Obtener estado de sesión
  const obtenerEstado = useCallback(async () => {
    if (!periodoId) return;

    try {
      setError(null);
      const response = await api.get<EstadoSesionResponse>(
        `/tareo/sesiones/periodo/${periodoId}/estado`
      );

      setSesion(response.sesion);
      setEsAdmin(response.es_admin);
      setEsCorrector(response.es_corrector);
      setRequiereSesion(response.requiere_sesion);

      if (response.sesion) {
        setTiempoRestante(response.sesion.tiempo_restante_segundos);
      } else {
        setTiempoRestante(0);
      }

      // Si requiere sesión y no tiene activa, verificar si puede iniciar
      if (response.requiere_sesion && response.sesion?.estado !== 'ACTIVA') {
        await verificarPuedeIniciar();
        await verificarSolicitudPendiente();
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al obtener estado de sesión'));
    } finally {
      setCargando(false);
    }
  }, [periodoId, verificarPuedeIniciar, verificarSolicitudPendiente]);

  // Iniciar sesión
  const iniciarSesion = useCallback(async () => {
    if (!periodoId) return;

    try {
      setCargando(true);
      setError(null);
      const response = await api.post<SesionTareoResponse>('/tareo/sesiones/iniciar', {
        periodo_id: periodoId,
      });

      setSesion(response);
      setTiempoRestante(response.tiempo_restante_segundos);
      setPuedeIniciarSesion(true);
      setMotivoNoInicio(null);
    } catch (err: unknown) {
      const mensaje = getApiErrorMessage(err, 'Error al iniciar sesión');
      setError(mensaje);
      // Si el error es por límite, actualizar estado
      if (mensaje.includes('límite') || mensaje.includes('hora')) {
        setPuedeIniciarSesion(false);
        setMotivoNoInicio(mensaje);
      }
      throw err;
    } finally {
      setCargando(false);
    }
  }, [periodoId]);

  // Finalizar sesión
  const finalizarSesion = useCallback(async () => {
    if (!sesion) return;

    try {
      setCargando(true);
      setError(null);
      const response = await api.post<SesionTareoResponse>(
        `/tareo/sesiones/${sesion.id}/finalizar`
      );

      setSesion(response);
      setTiempoRestante(0);

      // Verificar si puede iniciar otra sesión
      await verificarPuedeIniciar();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al finalizar sesión'));
      throw err;
    } finally {
      setCargando(false);
    }
  }, [sesion, verificarPuedeIniciar]);

  // Solicitar extensión
  const solicitarExtension = useCallback(async (motivo: string, tiempoMin: number = 30) => {
    if (!periodoId) return;

    try {
      setCargando(true);
      setError(null);
      const response = await api.post<SolicitudExtension>('/tareo/extensiones', {
        periodo_id: periodoId,
        motivo,
        tiempo_solicitado_min: tiempoMin,
      });

      setSolicitudPendiente(response);
      await cargarMisSolicitudes();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al solicitar extensión'));
      throw err;
    } finally {
      setCargando(false);
    }
  }, [periodoId, cargarMisSolicitudes]);

  // Refrescar todo
  const refrescar = useCallback(async () => {
    await Promise.all([
      obtenerEstado(),
      obtenerConfiguracion(),
    ]);
  }, [obtenerEstado, obtenerConfiguracion]);

  // Cargar estado inicial
  useEffect(() => {
    if (periodoId) {
      refrescar();
    }
  }, [periodoId, refrescar]);

  // Contador regresivo
  useEffect(() => {
    // Limpiar intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Solo contar si hay sesión activa con tiempo límite
    if (sesion?.estado === 'ACTIVA' && tiempoRestante > 0) {
      intervalRef.current = setInterval(() => {
        setTiempoRestante((prev) => {
          if (prev <= 1) {
            // Sesión expirada
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Actualizar estado de sesión localmente
            setSesion((s) => (s ? { ...s, estado: 'EXPIRADA', puede_editar: false } : null));

            // Notificar al backend que la sesión expiró
            if (sesion?.id) {
              api.post(`/tareo/sesiones/${sesion.id}/expirar`).catch(() => {
                // Ignorar errores, el backend también detectará la expiración
              });
            }

            // Verificar si puede iniciar nueva sesión
            verificarPuedeIniciar();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // tiempoRestante se lee solo para decidir si arrancar el intervalo (> 0). El conteo
    // usa setTiempoRestante(prev => ...); incluirlo recrearia el intervalo cada segundo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.estado, sesion?.id, verificarPuedeIniciar]);

  // Sincronizar con servidor cada 5 minutos para corregir drift del timer
  // (Se reduce a 10 segundos si hay solicitud pendiente para notificación rápida - ERR-004)
  useEffect(() => {
    if (sesion?.estado !== 'ACTIVA' && !solicitudPendiente) return;

    // Polling más rápido si hay solicitud pendiente
    const intervalo = solicitudPendiente ? 10 * 1000 : 5 * 60 * 1000;

    const syncInterval = setInterval(() => {
      obtenerEstado();
    }, intervalo);

    return () => clearInterval(syncInterval);
  }, [sesion?.estado, solicitudPendiente, obtenerEstado]);

  // ERR-005: Heartbeat cada 30 segundos para detectar sesiones abandonadas
  useEffect(() => {
    if (sesion?.estado !== 'ACTIVA' || !sesion.id) return;

    const heartbeatInterval = setInterval(async () => {
      try {
        await api.post(`/tareo/sesiones/${sesion.id}/heartbeat`);
      } catch {
        // Sesión ya no existe o expiró, refrescar estado
        console.warn('Heartbeat falló, refrescando estado de sesión');
        obtenerEstado();
      }
    }, 30 * 1000); // cada 30 segundos

    return () => clearInterval(heartbeatInterval);
  }, [sesion?.estado, sesion?.id, obtenerEstado]);

  // ERR-005: Cleanup al cerrar navegador (beforeunload)
  useEffect(() => {
    if (!sesion?.id || sesion?.estado !== 'ACTIVA') return;

    const handleBeforeUnload = () => {
      // Usar fetch con keepalive para request síncrono al cerrar
      // (keepalive permite que el request se complete aunque la página se cierre)
      const token = getAccessToken();
      if (!token) return;

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/tareo/sesiones/${sesion.id}/finalizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        keepalive: true,
      }).catch(() => {
        // Ignorar errores - el cron limpiará sesiones abandonadas
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sesion?.id, sesion?.estado]);

  // Determinar si puede editar
  // Admin y corrector pueden editar siempre, otros necesitan sesión activa
  const puedeEditar = !requiereSesion || (sesion?.estado === 'ACTIVA' && tiempoRestante > 0);

  return {
    sesion,
    esAdmin,
    esCorrector,
    requiereSesion,
    puedeEditar,
    tiempoRestante,
    tiempoFormateado,
    cargando,
    error,
    configuracion,
    puedeIniciarSesion,
    motivoNoInicio,
    solicitudPendiente,
    misSolicitudes,
    iniciarSesion,
    finalizarSesion,
    solicitarExtension,
    refrescar,
    cargarMisSolicitudes,
  };
}
