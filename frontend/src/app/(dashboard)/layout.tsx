'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import { UserProvider } from '@/contexts/user-context';
import { EmpresaActivaProvider } from '@/contexts/empresa-activa-context';
import { Usuario } from '@/types';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Verificar si hay token
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      try {
        // Obtener datos del usuario
        const userData = await getCurrentUser();
        if (isMounted) {
          setUsuario(userData);
        }
      } catch {
        // Si falla, redirigir a login
        if (isMounted) {
          router.push('/login');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <UserProvider usuario={usuario}>
      <EmpresaActivaProvider>
      <SidebarProvider>
        <AppSidebar usuario={usuario} />
        <SidebarInset className="flex min-h-screen flex-col min-w-0 overflow-x-hidden">
          <AppHeader usuario={usuario} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      </EmpresaActivaProvider>
    </UserProvider>
  );
}
