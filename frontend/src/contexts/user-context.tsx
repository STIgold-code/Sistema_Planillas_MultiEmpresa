'use client';

import { createContext, useContext } from 'react';
import { Usuario } from '@/types';

interface UserContextValue {
  usuario: Usuario | null;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({
  usuario,
  children,
}: {
  usuario: Usuario | null;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={{ usuario }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): Usuario | null {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context.usuario;
}
