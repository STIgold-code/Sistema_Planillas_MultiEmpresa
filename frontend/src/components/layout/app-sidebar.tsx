"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  Home,
  CreditCard,
  UserCog,
  Shield,
  LayoutGrid,
  LogOut,
  ChevronUp,
  Building2,
  UserPlus,
  FileStack,
  FolderOpen,
  Palmtree,
  Receipt,
  FileCheck,
  History,
  FileSpreadsheet,
  ArrowLeftRight,
  Package,
  PackagePlus,
  HandHelping,
  BadgeDollarSign,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Usuario } from "@/types";
import { hasPermission, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import { SelectorEmpresaActiva } from "@/components/layout/selector-empresa-activa";
import { SidebarEmpresaActiva } from "@/components/layout/sidebar-empresa-activa";

interface AppSidebarProps {
  usuario: Usuario | null;
}

// Definición del menú
const menuItems = [
  {
    grupo: "Principal",
    items: [
      {
        titulo: "Dashboard",
        url: "/",
        icono: Home,
        permiso: "dashboard:leer",
      },
    ],
  },
  {
    grupo: "Recursos Humanos",
    items: [
      {
        titulo: "Seleccion",
        url: "/rrhh/seleccion",
        icono: UserPlus,
        permiso: "seleccion:leer",
      },
      {
        titulo: "Empleados",
        url: "/rrhh/empleados",
        icono: Users,
        permiso: "empleados:leer",
      },
      {
        titulo: "Contratos",
        url: "/rrhh/contratos",
        icono: FileText,
        permiso: "contratos:leer",
      },
      {
        titulo: "Movimientos",
        url: "/rrhh/movimientos",
        icono: ArrowLeftRight,
        permiso: "empleados:leer",
      },
      {
        titulo: "Vacaciones",
        url: "/rrhh/vacaciones",
        icono: Palmtree,
        permiso: "vacaciones:leer",
      },
      {
        titulo: "Plantillas Contrato",
        url: "/rrhh/plantillas-contrato",
        icono: FileStack,
        permiso: "contratos:leer",
      },
      {
        titulo: "Banco Documentos",
        url: "/rrhh/banco-documentos",
        icono: FolderOpen,
        permiso: "maestros:leer",
      },
      {
        titulo: "Justificaciones",
        url: "/rrhh/justificaciones",
        icono: FileCheck,
        permiso: "tareo:leer",
      },
      {
        titulo: "Maestros",
        url: "/rrhh/maestros",
        icono: LayoutGrid,
        permiso: "maestros:leer",
      },
    ],
  },
  {
    grupo: "Operaciones",
    items: [
      {
        titulo: "Tareo",
        url: "/operaciones/tareo",
        icono: Calendar,
        permiso: "tareo:leer",
      },
    ],
  },
  {
    grupo: "Inventario",
    items: [
      {
        titulo: "Stock",
        url: "/inventario/stock",
        icono: Package,
        permiso: "inventarios:leer",
      },
      {
        titulo: "Compras",
        url: "/inventario/ingresos",
        icono: PackagePlus,
        permiso: "inventarios:leer",
      },
      {
        titulo: "Entregas",
        url: "/inventario/entregas",
        icono: HandHelping,
        permiso: "inventarios:leer",
      },
      {
        titulo: "Descuentos",
        url: "/inventario/descuentos",
        icono: BadgeDollarSign,
        permiso: "inventarios:leer",
      },
      {
        titulo: "Requerimientos",
        url: "/inventario/requerimientos",
        icono: ClipboardList,
        permiso: "inventarios:leer",
      },
      {
        titulo: "Movimientos",
        url: "/inventario/movimientos",
        icono: History,
        permiso: "inventarios:leer",
      },
    ],
  },
  {
    grupo: "Planilla",
    items: [
      {
        titulo: "Planilla",
        url: "/planilla",
        icono: DollarSign,
        permiso: "planilla:leer",
      },
      {
        titulo: "Boletas",
        url: "/boletas",
        icono: Receipt,
        permiso: "boleta:leer",
      },
      {
        titulo: "Prestamos",
        url: "/planilla/prestamos",
        icono: CreditCard,
        permiso: "prestamos:leer",
      },
    ],
  },
  {
    grupo: "Configuracion",
    items: [
      {
        titulo: "Empresa",
        url: "/configuracion/empresa",
        icono: Building2,
        permiso: "empresas:editar",
      },
      {
        titulo: "Usuarios",
        url: "/configuracion/usuarios",
        icono: UserCog,
        permiso: "usuarios:leer",
      },
      {
        titulo: "Roles",
        url: "/configuracion/roles",
        icono: Shield,
        permiso: "roles:leer",
      },
      {
        titulo: "Tipos Documento",
        url: "/configuracion/tipos-documento-empleado",
        icono: FileText,
        permiso: "maestros:leer",
      },
      {
        titulo: "Auditoria",
        url: "/configuracion/auditoria",
        icono: History,
        permiso: "auditoria:leer",
      },
      {
        titulo: "Reportes",
        url: "/configuracion/reportes",
        icono: FileSpreadsheet,
        permiso: "reportes:leer",
      },
    ],
  },
];

export function AppSidebar({ usuario }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  // ERR-004: Verificar si el usuario puede ver solicitudes de extensión (corrector/admin)
  const puedeVerSolicitudes =
    hasPermission(usuario, "*") ||
    hasPermission(usuario, "tareo:*") ||
    hasPermission(usuario, "tareo:corregir");

  // ERR-004: Cargar conteo de solicitudes pendientes cada 30 segundos
  useEffect(() => {
    if (!puedeVerSolicitudes) return;

    const fetchPendientes = async () => {
      try {
        const response = await api.get<{ count: number }>(
          "/tareo/extensiones/pendientes/count",
        );
        setSolicitudesPendientes(response.count);
      } catch {
        // Silenciosamente ignorar errores
      }
    };

    // Cargar inmediatamente
    fetchPendientes();

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchPendientes, 30 * 1000);

    return () => clearInterval(interval);
  }, [puedeVerSolicitudes]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  };

  // Obtener iniciales del usuario
  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filtrar items según permisos del usuario
  const filteredMenu = menuItems
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter(
        (item) => !item.permiso || hasPermission(usuario, item.permiso),
      ),
    }))
    .filter((grupo) => grupo.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <SidebarEmpresaActiva empresa={usuario?.empresa} />

        {/* Selector de empresa activa (solo visible para superadmins) */}
        <SelectorEmpresaActiva usuario={usuario} />
      </SidebarHeader>

      <SidebarContent>
        {filteredMenu.map((grupo) => (
          <SidebarGroup key={grupo.grupo}>
            <SidebarGroupLabel>{grupo.grupo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== "/" && pathname.startsWith(item.url));

                  // ERR-004: Mostrar badge en Tareo si hay solicitudes pendientes
                  const showBadge =
                    item.url === "/operaciones/tareo" &&
                    puedeVerSolicitudes &&
                    solicitudesPendientes > 0;

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          isActive && "bg-primary/10 text-primary font-medium",
                        )}
                      >
                        <Link
                          href={item.url}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="flex items-center gap-2">
                            <item.icono className="h-4 w-4" />
                            <span>{item.titulo}</span>
                          </span>
                          {showBadge && (
                            <Badge
                              variant="destructive"
                              className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                            >
                              {solicitudesPendientes}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
              {/* Avatar con iniciales */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                {usuario?.nombre_completo
                  ? getInitials(usuario.nombre_completo)
                  : "U"}
              </div>

              {/* Info del usuario */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {usuario?.nombre_completo || "Usuario"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {usuario?.email || ""}
                </span>
              </div>

              {/* Icono de chevron */}
              <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
          >
            {usuario?.empresa && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {usuario.empresa.nombre_comercial ||
                    usuario.empresa.razon_social}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}

            {usuario?.rol && (
              <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                {usuario.rol.nombre}
              </DropdownMenuLabel>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
