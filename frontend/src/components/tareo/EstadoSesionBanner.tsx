'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Send,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SolicitudExtensionModal } from './SolicitudExtensionModal';

type EstadoSesion = 'ACTIVA' | 'FINALIZADA' | 'EXPIRADA' | 'CORRECTOR' | null;

interface EstadoSesionBannerProps {
  // Estado de sesión
  sesion: {
    id: number;
    estado: EstadoSesion;
    tiempo_restante_segundos: number;
  } | null;
  esAdmin: boolean;
  esCorrector: boolean;
  requiereSesion: boolean;
  tiempoRestante: number;
  tiempoFormateado: string;
  cargando: boolean;
  error: string | null;

  // Verificación de inicio
  puedeIniciarSesion: boolean;
  motivoNoInicio: string | null;

  // Solicitud pendiente
  solicitudPendiente: {
    id: number;
    estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
    motivo: string;
    tiempo_solicitado_min: number;
  } | null;

  // Configuración
  tiempoLimite?: number; // en minutos

  // Acciones
  onIniciarSesion: () => Promise<void>;
  onFinalizarSesion: () => Promise<void>;
  onSolicitarExtension: (motivo: string, tiempoMin: number) => Promise<void>;
}

export function EstadoSesionBanner({
  sesion,
  esAdmin,
  esCorrector,
  requiereSesion,
  tiempoRestante,
  tiempoFormateado,
  cargando,
  error,
  puedeIniciarSesion,
  motivoNoInicio,
  solicitudPendiente,
  tiempoLimite = 60,
  onIniciarSesion,
  onFinalizarSesion,
  onSolicitarExtension,
}: EstadoSesionBannerProps) {
  const [iniciando, setIniciando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  // Admin o corrector no necesitan banner (editan sin restricción)
  if (!requiereSesion) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm text-green-800">
            {esAdmin ? 'Modo Administrador' : 'Modo Corrector'} - Edición sin restricción
            de tiempo
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Sin límite
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  const handleIniciar = async () => {
    setIniciando(true);
    try {
      await onIniciarSesion();
    } finally {
      setIniciando(false);
    }
  };

  const handleFinalizar = async () => {
    setFinalizando(true);
    try {
      await onFinalizarSesion();
    } finally {
      setFinalizando(false);
    }
  };

  // Calcular porcentaje de tiempo restante para la barra de progreso
  const porcentajeTiempo = tiempoLimite > 0 ? (tiempoRestante / (tiempoLimite * 60)) * 100 : 0;
  const tiempoBajo = porcentajeTiempo <= 20;
  const tiempoCritico = porcentajeTiempo <= 10;

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">{error}</AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (cargando && !sesion) {
    return (
      <Alert className="bg-gray-50 border-gray-200">
        <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
        <AlertDescription className="text-sm text-gray-600">
          Verificando estado de sesión...
        </AlertDescription>
      </Alert>
    );
  }

  // Sin sesión activa
  if (!sesion || sesion.estado !== 'ACTIVA') {
    // Verificar si hay solicitud pendiente
    if (solicitudPendiente?.estado === 'PENDIENTE') {
      return (
        <Alert className="bg-blue-50 border-blue-200">
          <Send className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Solicitud de extensión pendiente.</span> Un
              corrector revisará tu solicitud pronto.
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 w-fit">
              <Timer className="h-3 w-3 mr-1" />
              {solicitudPendiente.tiempo_solicitado_min} min solicitados
            </Badge>
          </AlertDescription>
        </Alert>
      );
    }

    // Sesión expirada - puede solicitar extensión
    if (sesion?.estado === 'EXPIRADA') {
      return (
        <>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-amber-800">
                <span className="font-medium">Tu sesión ha expirado.</span> Solicita más
                tiempo para continuar editando.
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => setShowExtensionModal(true)}
              >
                <Clock className="h-4 w-4 mr-1" />
                Solicitar Extensión
              </Button>
            </AlertDescription>
          </Alert>

          <SolicitudExtensionModal
            open={showExtensionModal}
            onOpenChange={setShowExtensionModal}
            onSubmit={onSolicitarExtension}
            tiempoActual={tiempoLimite}
          />
        </>
      );
    }

    // No puede iniciar sesión
    if (!puedeIniciarSesion) {
      return (
        <>
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-red-800">
                <span className="font-medium">No puedes iniciar sesión.</span>{' '}
                {motivoNoInicio || 'Has alcanzado el límite de sesiones.'}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => setShowExtensionModal(true)}
              >
                <Clock className="h-4 w-4 mr-1" />
                Solicitar Extensión
              </Button>
            </AlertDescription>
          </Alert>

          <SolicitudExtensionModal
            open={showExtensionModal}
            onOpenChange={setShowExtensionModal}
            onSubmit={onSolicitarExtension}
            tiempoActual={tiempoLimite}
          />
        </>
      );
    }

    // Puede iniciar sesión
    return (
      <Alert className="bg-gray-50 border-gray-200">
        <Clock className="h-4 w-4 text-gray-600" />
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Sesión no iniciada.</span> Inicia una sesión
            para poder editar el tareo.
          </div>
          <Button size="sm" onClick={handleIniciar} disabled={iniciando}>
            {iniciando ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Iniciar Sesión
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Sesión activa
  return (
    <Alert
      className={cn(
        'transition-colors duration-300',
        tiempoCritico
          ? 'bg-red-50 border-red-200'
          : tiempoBajo
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
      )}
    >
      <CheckCircle
        className={cn(
          'h-4 w-4',
          tiempoCritico
            ? 'text-red-600'
            : tiempoBajo
              ? 'text-amber-600'
              : 'text-green-600'
        )}
      />
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div
            className={cn(
              'text-sm',
              tiempoCritico
                ? 'text-red-800'
                : tiempoBajo
                  ? 'text-amber-800'
                  : 'text-green-800'
            )}
          >
            <span className="font-medium">Sesión activa.</span> Puedes editar el tareo.
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'font-mono text-base px-3',
                tiempoCritico
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : tiempoBajo
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
              )}
            >
              <Clock className="h-4 w-4 mr-1" />
              {tiempoFormateado}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFinalizar}
              disabled={finalizando}
              className={cn(
                tiempoCritico
                  ? 'border-red-300 text-red-700 hover:bg-red-100'
                  : tiempoBajo
                    ? 'border-amber-300 text-amber-700 hover:bg-amber-100'
                    : 'border-green-300 text-green-700 hover:bg-green-100'
              )}
            >
              {finalizando ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              Finalizar
            </Button>
          </div>
        </div>

        {/* Barra de progreso del tiempo */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              tiempoCritico
                ? 'bg-red-500'
                : tiempoBajo
                  ? 'bg-amber-500'
                  : 'bg-green-500'
            )}
            style={{ width: `${Math.max(0, Math.min(100, porcentajeTiempo))}%` }}
          />
        </div>
      </AlertDescription>
    </Alert>
  );
}
