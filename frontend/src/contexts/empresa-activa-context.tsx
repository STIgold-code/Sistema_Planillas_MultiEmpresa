'use client';

import { createContext, useContext, useState, useCallback } from 'react';

/** Clave de localStorage donde se persiste la empresa activa (solo superadmin). */
export const EMPRESA_ACTIVA_STORAGE_KEY = 'empresa_activa_id';

/** Lee el id de la empresa activa desde localStorage (cliente). */
export function getEmpresaActivaId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EMPRESA_ACTIVA_STORAGE_KEY);
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
