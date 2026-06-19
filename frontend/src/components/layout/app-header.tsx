'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logout, hasPermission } from '@/lib/auth';
import { Usuario } from '@/types';

interface AppHeaderProps {
  usuario: Usuario | null;
}

export function AppHeader({ usuario }: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (nombre: string) => {
    return nombre
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-14 md:h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-base md:text-lg font-semibold truncate">RRHH Ermir</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {usuario && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full">
                <Avatar className="h-9 w-9 md:h-10 md:w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                    {getInitials(usuario.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {usuario.nombre_completo}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {usuario.email}
                  </p>
                  {usuario.rol && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {usuario.rol.nombre}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              {hasPermission(usuario, 'empresas:editar') && (
                <DropdownMenuItem onClick={() => router.push('/configuracion/empresa')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuracion</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
