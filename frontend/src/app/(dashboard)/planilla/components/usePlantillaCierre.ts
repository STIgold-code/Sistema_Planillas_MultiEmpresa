'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { PreviewCierre, ResultadoCierre } from './plantilla-cierre-tipos';

/** Pasos del cierre: se descarga, se llena afuera, se revisa y se aplica. */
export type PasoCierre = 'descargar' | 'revisar';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Estado del diálogo de la plantilla de cierre.
 *
 * La regla del flujo: NUNCA se aplica sin haber visto el preview. El botón de
 * aplicar solo existe cuando hay un preview sin errores en pantalla.
 */
export function usePlantillaCierre(alAplicar?: () => void) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [paso, setPaso] = useState<PasoCierre>('descargar');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewCierre | null>(null);

  const [descargando, setDescargando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const reiniciar = useCallback(() => {
    setPaso('descargar');
    setArchivo(null);
    setPreview(null);
  }, []);

  const descargar = useCallback(async () => {
    setDescargando(true);
    try {
      const blob = await api.getBlob(
        `/planillas/plantilla-cierre/${anio}/${mes}`,
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Cierre_Planilla_${MESES[mes - 1]}_${anio}.xlsx`;
      enlace.click();
      URL.revokeObjectURL(url);
      toast.success('Plantilla de cierre descargada');
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, 'No se pudo descargar la plantilla de cierre'),
      );
    } finally {
      setDescargando(false);
    }
  }, [anio, mes]);

  const revisar = useCallback(
    async (nuevo: File) => {
      setArchivo(nuevo);
      setRevisando(true);
      setPreview(null);
      try {
        const datos = new FormData();
        datos.append('file', nuevo);
        const resultado = await api.upload<PreviewCierre>(
          `/planillas/plantilla-cierre/${anio}/${mes}/preview`,
          datos,
        );
        setPreview(resultado);
        setPaso('revisar');
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'No se pudo leer la plantilla'));
      } finally {
        setRevisando(false);
      }
    },
    [anio, mes],
  );

  const aplicar = useCallback(async () => {
    if (!archivo || !preview?.aplicable) return;
    setAplicando(true);
    try {
      const datos = new FormData();
      datos.append('file', archivo);
      const resultado = await api.upload<ResultadoCierre>(
        `/planillas/plantilla-cierre/${anio}/${mes}/aplicar`,
        datos,
      );
      const hechos = [
        resultado.saldos_confirmados && `${resultado.saldos_confirmados} saldo(s) confirmado(s)`,
        resultado.deudas_cerradas && `${resultado.deudas_cerradas} deuda(s) cerrada(s)`,
        resultado.empleados_reactivados &&
          `${resultado.empleados_reactivados} trabajador(es) reactivado(s)`,
      ].filter(Boolean);
      toast.success(
        hechos.length > 0
          ? `Cierre aplicado: ${hechos.join(', ')}.`
          : 'No había nada que cambiar: el sistema ya coincidía con la plantilla.',
      );
      if (resultado.altas_pendientes > 0) {
        toast.warning(
          `Quedan ${resultado.altas_pendientes} préstamo(s) por cargar desde el módulo de Préstamos, con su documento firmado.`,
        );
      }
      reiniciar();
      alAplicar?.();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo aplicar la plantilla'));
    } finally {
      setAplicando(false);
    }
  }, [alAplicar, anio, archivo, mes, preview, reiniciar]);

  return {
    anio,
    setAnio,
    mes,
    setMes,
    meses: MESES,
    paso,
    setPaso,
    archivo,
    preview,
    descargando,
    revisando,
    aplicando,
    descargar,
    revisar,
    aplicar,
    reiniciar,
  };
}
