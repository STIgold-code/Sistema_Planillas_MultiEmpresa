'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

/** Clave de localStorage donde se persiste la empresa activa (solo superadmin). */
export const EMPRESA_ACTIVA_STORAGE_KEY = 'empresa_activa_id';

/** Lee el id de la empresa activa desde localStorage (cliente). */
export function getEmpresaActivaId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EMPRESA_ACTIVA_STORAGE_KEY);
}

/** Limpia la empresa activa persistida (usar al cerrar/iniciar sesión). */
export function clearEmpresaActiva(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EMPRESA_ACTIVA_STORAGE_KEY);
}

interface EmpresaActivaContextValue {
  empresaActivaId: string | null;
  setEmpresaActivaId: (id: string | null) => void;
}

const EmpresaActivaContext = createContext<EmpresaActivaContextValue | undefined>(
  undefined,
);

export function EmpresaActivaProvider({ children }: { children: React.ReactNode }) {
  const [empresaActivaId, setEmpresaActivaIdState] = useState<string | null>(() =>
    getEmpresaActivaId(),
  );

  const setEmpresaActivaId = useCallback((id: string | null) => {
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(EMPRESA_ACTIVA_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(EMPRESA_ACTIVA_STORAGE_KEY);
      }
    }
    setEmpresaActivaIdState(id);
  }, []);

  // localStorage es compartido entre pestañas: si otra pestaña cambia la
  // empresa activa, esta quedaría MOSTRANDO una empresa pero OPERANDO sobre
  // otra (el header sale de localStorage). El evento `storage` solo se
  // dispara en las demás pestañas: recargamos para realinear.
  useEffect(() => {
    const alCambiarEnOtraPestana = (e: StorageEvent) => {
      if (e.key === EMPRESA_ACTIVA_STORAGE_KEY && e.newValue !== e.oldValue) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', alCambiarEnOtraPestana);
    return () => window.removeEventListener('storage', alCambiarEnOtraPestana);
  }, []);

  return (
    <EmpresaActivaContext.Provider value={{ empresaActivaId, setEmpresaActivaId }}>
      {children}
    </EmpresaActivaContext.Provider>
  );
}

export function useEmpresaActiva(): EmpresaActivaContextValue {
  const context = useContext(EmpresaActivaContext);
  if (context === undefined) {
    throw new Error('useEmpresaActiva debe usarse dentro de un EmpresaActivaProvider');
  }
  return context;
}
